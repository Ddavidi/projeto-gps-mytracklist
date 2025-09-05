const express = require('express');
const session = require('express-session');
const { initializeDatabase } = require('./database');
const { registerUser, authenticateUser } = require('./userController');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do middleware
app.use(express.json());

// Configuração da sessão
app.use(session({ // TODO: temos que lembrar de redefinir o abaixo em produção!
  secret: process.env.SESSION_SECRET || 'sua-chave-secreta-altere-em-producao',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // TODO: lembrar de definir como true em produção com HTTPS!
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Middleware de autenticação
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }
  next();
};

// Inicializa o banco de dados
initializeDatabase().then(() => {
  console.log('Banco de dados inicializado');
}).catch((error: any) => {
  console.error('Falha ao inicializar banco de dados:', error);
});

// Rotas da API
app.post('/api/v1/auth/register', async (req: any, res: any) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios' });
  }

  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Nome de usuário deve ter pelo menos 3 caracteres e senha pelo menos 6 caracteres' });
  }

  const result = await registerUser(username, password);
  if (result.success) {
    res.status(201).json({ message: 'Usuário registrado com sucesso' });
  } else {
    res.status(400).json({ error: result.message });
  }
});

app.post('/api/v1/auth/login', async (req: any, res: any) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios' });
  }

  const result = await authenticateUser(username, password);
  if (result.success) {
    req.session.userId = result.userId;
    res.json({ message: 'Login realizado com sucesso' });
  } else {
    res.status(401).json({ error: result.message });
  }
});

app.post('/api/v1/auth/logout', (req: any, res: any) => {
  req.session.destroy((err: any) => {
    if (err) {
      return res.status(500).json({ error: 'Não foi possível fazer logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout realizado com sucesso' });
  });
});

// Exemplo de rota protegida
app.get('/api/v1/user/profile', requireAuth, (req: any, res: any) => {
  res.json({ message: 'Bem-vindo ao seu perfil!', userId: req.session.userId });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor executando na porta ${PORT}`);
});
