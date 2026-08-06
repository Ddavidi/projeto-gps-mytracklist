import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  Paper,
  Divider,
  MenuItem
} from '@mui/material';
import api from '../services/api';

function LoginPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isLoginFlow, setIsLoginFlow] = useState(false);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { login, setAuth } = useAuth();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/check-email', { email });
      if (response.data.exists) {
        setIsLoginFlow(true);
        setStep(2);
      } else {
        setIsLoginFlow(false);
        setStep(2);
      }
    } catch (err) {
      setError('Ocorreu um erro ao verificar o e-mail.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isLoginFlow) {
        const result = await login(email, password);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.message);
        }
      } else {
        // Validation for registration
        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[\d#?!&@$*^%-]).{10,}$/;
        if (!passwordRegex.test(password)) {
          setError('A senha deve ter pelo menos 10 caracteres, conter 1 letra e 1 número ou caractere especial.');
          setIsSubmitting(false);
          return;
        }

        const response = await api.post('/auth/register', { email, username, password });
        setAuth(response.data.token, response.data.user);
        setStep(3); // Go to profile step
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ocorreu um erro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await api.put('/auth/profile', { name, gender, birthDate });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            {step === 1 && 'Entrar ou Criar Conta'}
            {step === 2 && isLoginFlow && 'Bem-vindo de volta!'}
            {step === 2 && !isLoginFlow && 'Crie sua Conta'}
            {step === 3 && 'Complete seu Perfil'}
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {step === 1 && (
            <Box component="form" onSubmit={handleEmailSubmit}>
              <TextField
                margin="normal" required fullWidth id="email" label="E-mail" name="email"
                type="email" autoComplete="email" autoFocus value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={isSubmitting}>
                {isSubmitting ? 'Verificando...' : 'Avançar'}
              </Button>
              
              <Divider sx={{ my: 2 }}>ou</Divider>
              
              <Button fullWidth variant="outlined" sx={{ mb: 1 }} onClick={() => setError('Integração com Google em breve!')}>
                Continuar com Google
              </Button>
              <Button fullWidth variant="outlined" onClick={() => setError('Integração com Apple em breve!')}>
                Continuar com Apple
              </Button>
            </Box>
          )}

          {step === 2 && (
            <Box component="form" onSubmit={handleCredentialsSubmit}>
              <Typography variant="body2" sx={{ mb: 2 }}>E-mail: {email}</Typography>
              
              {!isLoginFlow && (
                <TextField
                  margin="normal" required fullWidth id="username" label="Username" name="username"
                  autoFocus value={username} onChange={(e) => setUsername(e.target.value)}
                />
              )}
              
              <TextField
                margin="normal" required fullWidth name="password" label="Senha" type="password" id="password"
                autoComplete={isLoginFlow ? 'current-password' : 'new-password'} value={password}
                autoFocus={isLoginFlow}
                onChange={(e) => setPassword(e.target.value)}
              />
              {!isLoginFlow && (
                <Typography variant="caption" color="text.secondary">
                  A senha deve ter pelo menos 10 caracteres, 1 letra e 1 número/caractere especial.
                </Typography>
              )}
              
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={isSubmitting}>
                {isSubmitting ? 'Aguarde...' : (isLoginFlow ? 'Entrar' : 'Criar Conta')}
              </Button>
              <Button fullWidth variant="text" onClick={() => setStep(1)} disabled={isSubmitting}>
                Voltar
              </Button>
            </Box>
          )}

          {step === 3 && (
            <Box component="form" onSubmit={handleProfileSubmit}>
              <TextField
                margin="normal" required fullWidth id="name" label="Nome Completo" name="name"
                autoFocus value={name} onChange={(e) => setName(e.target.value)}
              />
              <TextField
                margin="normal" required fullWidth id="gender" select label="Gênero" name="gender"
                value={gender} onChange={(e) => setGender(e.target.value)}
              >
                <MenuItem value="Homem">Homem</MenuItem>
                <MenuItem value="Mulher">Mulher</MenuItem>
                <MenuItem value="Não binário">Não binário</MenuItem>
                <MenuItem value="Outro">Outro</MenuItem>
                <MenuItem value="Prefiro não dizer">Prefiro não dizer</MenuItem>
              </TextField>
              <TextField
                margin="normal" required fullWidth id="birthDate" label="Data de Nascimento" name="birthDate"
                type="date" InputLabelProps={{ shrink: true }} value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
              />
              
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Concluir Cadastro'}
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default LoginPage;