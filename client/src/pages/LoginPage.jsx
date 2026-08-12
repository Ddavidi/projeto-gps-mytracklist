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
  MenuItem,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import api from '../services/api';

function LoginPage() {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  
  const [isLoginFlow, setIsLoginFlow] = useState(false);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { login, setAuth } = useAuth();

  const handleIdentifierSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/check', { identifier });
      if (response.data.exists) {
        setIsLoginFlow(true);
        setStep(2);
      } else {
        if (response.data.isEmail) {
          setIsLoginFlow(false);
          setEmail(identifier);
          setStep(2);
        } else {
          setError('Conta não encontrada. Para criar uma conta, insira o seu e-mail.');
        }
      }
    } catch (err) {
      setError('Ocorreu um erro ao verificar a conta.');
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
        const result = await login(identifier, password);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.message);
        }
      } else {
        // Register validations
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          setIsSubmitting(false);
          return;
        }

        if (!termsAccepted) {
          setError('Você deve aceitar os termos de uso.');
          setIsSubmitting(false);
          return;
        }

        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[\d#?!&@$*^%-]).{10,}$/;
        if (!passwordRegex.test(password)) {
          setError('A senha não atende a todos os requisitos.');
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

  // Password validators
  const hasMinLength = password.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSpecial = /[\d#?!&@$*^%-]/.test(password);
  
  const allRequirementsMet = hasMinLength && hasLetter && hasNumberOrSpecial;

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 8 }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            {step === 1 && 'Entrar ou Criar Conta'}
            {step === 2 && isLoginFlow && 'Bem-vindo de volta!'}
            {step === 2 && !isLoginFlow && 'Crie sua Conta'}
            {step === 3 && 'Complete seu Perfil'}
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {step === 1 && (
            <Box component="form" onSubmit={handleIdentifierSubmit}>
              <TextField
                margin="normal" required fullWidth id="identifier" label="E-mail ou Username" name="identifier"
                autoComplete="email" autoFocus value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
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
              <Typography variant="body2" sx={{ mb: 2 }}>
                {isLoginFlow ? `Conta: ${identifier}` : `E-mail: ${email}`}
              </Typography>
              
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
                <>
                  <TextField
                    margin="normal" required fullWidth name="confirmPassword" label="Confirmar Senha" type="password" id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />

                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Requisitos da senha:</Typography>
                    <List dense sx={{ pt: 0, pb: 0 }}>
                      <ListItem sx={{ py: 0, px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          {hasMinLength ? <CheckCircleIcon color="success" fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" color="disabled" />}
                        </ListItemIcon>
                        <ListItemText primary="Pelo menos 10 caracteres" sx={{ m: 0 }} primaryTypographyProps={{ variant: 'caption', color: hasMinLength ? 'text.primary' : 'text.secondary' }} />
                      </ListItem>
                      <ListItem sx={{ py: 0, px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          {hasLetter ? <CheckCircleIcon color="success" fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" color="disabled" />}
                        </ListItemIcon>
                        <ListItemText primary="Pelo menos 1 letra" sx={{ m: 0 }} primaryTypographyProps={{ variant: 'caption', color: hasLetter ? 'text.primary' : 'text.secondary' }} />
                      </ListItem>
                      <ListItem sx={{ py: 0, px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          {hasNumberOrSpecial ? <CheckCircleIcon color="success" fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" color="disabled" />}
                        </ListItemIcon>
                        <ListItemText primary="Pelo menos 1 número ou caractere especial" sx={{ m: 0 }} primaryTypographyProps={{ variant: 'caption', color: hasNumberOrSpecial ? 'text.primary' : 'text.secondary' }} />
                      </ListItem>
                    </List>
                  </Box>

                  <FormControlLabel
                    control={<Checkbox checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} color="primary" />}
                    label={<Typography variant="caption">Eu concordo com os Termos de Uso</Typography>}
                    sx={{ mb: 1 }}
                  />
                </>
              )}
              
              <Button 
                type="submit" 
                fullWidth 
                variant="contained" 
                sx={{ mt: 1, mb: 2 }} 
                disabled={isSubmitting || (!isLoginFlow && (!allRequirementsMet || !termsAccepted))}
              >
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