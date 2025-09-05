const { openDatabase } = require('./database');
const argon2 = require('argon2');

const registerUser = async (username: string, password: string) => {
  const db = await openDatabase();
  try {
    // Parâmetros Argon2 otimizados para segurança vs performance
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 131072,    // 128 MB (aumento de ~2x do padrão)
      timeCost: 4,           // 4 iterações (aumento de ~33% do padrão)
      parallelism: 2,        // 2 threads (considerando possível VPS com 1 VCPU)
      hashLength: 32         // 32 bytes de hash
    });
    await db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hashedPassword]);
    return { success: true };
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, message: 'Nome de usuário já existe.' };
    }
    return { success: false, message: 'Falha no registro.' };
  } finally {
    await db.close();
  }
};

const authenticateUser = async (username: string, password: string) => {
  const db = await openDatabase();
  try {
    const user = await db.get('SELECT id, password_hash FROM users WHERE username = ?', [username]);
    if (!user) {
      return { success: false, message: 'Nome de usuário ou senha inválidos.' };
    }

    const isValidPassword = await argon2.verify(user.password_hash, password);
    if (!isValidPassword) {
      return { success: false, message: 'Nome de usuário ou senha inválidos.' };
    }

    return { success: true, userId: user.id };
  } catch (error) {
    return { success: false, message: 'Falha na autenticação.' };
  } finally {
    await db.close();
  }
};

module.exports = { registerUser, authenticateUser };
