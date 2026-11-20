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
import BirthDateField from '../components/BirthDateField';

function LoginPage() {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  
  const [isLoginFlow, setIsLoginFlow] = useState(false);
  
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
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

        const response = await api.post('/auth/register/request-code', {
          email,
          username,
          password,
          confirmPassword,
        });
        setVerificationCode('');
        setInfoMessage(response.data?.message || 'Enviamos um código de 6 dígitos para o seu e-mail.');
        setStep('verify');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ocorreu um erro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanCode = verificationCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Digite o código de 6 dígitos enviado para o seu e-mail.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/register/verify', { email, code: cleanCode });
      setAuth(response.data.token, response.data.user);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Código inválido ou expirado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setInfoMessage('');
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/register/request-code', {
        email,
        username,
        password,
        confirmPassword,
      });
      setInfoMessage(response.data?.message || 'Novo código enviado para o seu e-mail.');
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível reenviar o código.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!birthDate) {
      setError('Informe uma data de nascimento válida no formato DD/MM/AAAA.');
      return;
    }
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
            {step === 'verify' && 'Verificação em Duas Etapas'}
            {step === 3 && 'Complete seu Perfil'}
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {infoMessage && <Alert severity="info" sx={{ mb: 2 }}>{infoMessage}</Alert>}
          
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
                    autoComplete="new-password"
                    value={confirmPassword}
                    error={Boolean(confirmPassword && password !== confirmPassword)}
                    helperText={confirmPassword && password !== confirmPassword ? 'As senhas não coincidem.' : ''}
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
                disabled={isSubmitting || (!isLoginFlow && (!allRequirementsMet || password !== confirmPassword || !termsAccepted))}
              >
                {isSubmitting ? 'Aguarde...' : (isLoginFlow ? 'Entrar' : 'Enviar Código de Verificação')}
              </Button>
              <Button fullWidth variant="text" onClick={() => { setError(''); setInfoMessage(''); setStep(1); }} disabled={isSubmitting}>
                Voltar
              </Button>
            </Box>
          )}

          {step === 'verify' && (
            <Box component="form" onSubmit={handleVerifyCodeSubmit}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Digite o código de 6 dígitos enviado para <strong>{email}</strong>.
              </Typography>
              <TextField
                margin="normal"
                required
                fullWidth
                id="verificationCode"
                label="Código de Verificação (6 dígitos)"
                name="verificationCode"
                autoFocus
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputProps={{ inputMode: 'numeric', maxLength: 6, style: { letterSpacing: '6px', textAlign: 'center', fontSize: '1.25rem' } }}
              />
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, mb: 1 }} disabled={isSubmitting || verificationCode.length !== 6}>
                {isSubmitting ? 'Verificando...' : 'Verificar e Criar Conta'}
              </Button>
              <Button fullWidth variant="outlined" sx={{ mb: 1 }} onClick={handleResendCode} disabled={isSubmitting}>
                Reenviar Código
              </Button>
              <Button fullWidth variant="text" onClick={() => { setError(''); setInfoMessage(''); setStep(2); }} disabled={isSubmitting}>
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
              <BirthDateField
                margin="normal"
                required
                fullWidth
                id="birthDate"
                name="birthDate"
                value={birthDate}
                onChange={setBirthDate}
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