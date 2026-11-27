import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Grid,
  Divider,
  alpha,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../services/api';
import { getTrending } from '../services/spotify';
import OnboardingFlow from '../components/OnboardingFlow';

function LoginPage() {
  const [step, setStep] = useState(1); // 1 | 2 | 'verify' | 'forgot' | 'onboarding'
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [isLoginFlow, setIsLoginFlow] = useState(false);
  const [isGoogleOnlyAccount, setIsGoogleOnlyAccount] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showcaseAlbums, setShowcaseAlbums] = useState([]);
  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const isNativeApp = Capacitor.isNativePlatform();

  const navigate = useNavigate();
  const location = useLocation();
  const { login, setAuth } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('onboarding') === '1') {
      setStep('onboarding');
    }
  }, [location.search]);

  const handleNativeGoogleLogin = async () => {
    setError('');
    setInfoMessage('');
    try {
      const { Browser } = await import('@capacitor/browser');
      const webBaseUrl = (
        import.meta.env.VITE_WEB_APP_URL || 'https://projeto-gps-mytracklist.vercel.app'
      ).replace(/\/+$/, '');
      await Browser.open({
        url: `${webBaseUrl}/mobile-auth?provider=google`,
        presentationStyle: 'popover',
      });
    } catch {
      setError('Não foi possível abrir o navegador seguro para login com o Google.');
    }
  };

  const handleGoogleCredential = useCallback(async (response) => {
    if (!response?.credential) return;
    setError('');
    setInfoMessage('');
    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/google', { credential: response.credential });
      setAuth(res.data.token, res.data.user);
      if (res.data.isNewUser) {
        setStep('onboarding');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao entrar com o Google.');
    } finally {
      setIsSubmitting(false);
    }
  }, [setAuth, navigate]);

  useEffect(() => {
    if (isNativeApp || !googleClientId || (step !== 1 && !(step === 2 && isGoogleOnlyAccount))) return;

    let attempts = 0;
    const renderGoogleButton = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
        });
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: 'pt-BR',
          width: Math.min(380, googleBtnRef.current.offsetWidth || 360),
        });
        return true;
      }
      return false;
    };

    if (!renderGoogleButton()) {
      const timer = setInterval(() => {
        attempts += 1;
        if (renderGoogleButton() || attempts > 20) {
          clearInterval(timer);
        }
      }, 250);
      return () => clearInterval(timer);
    }
  }, [isNativeApp, googleClientId, step, isGoogleOnlyAccount, handleGoogleCredential]);

  useEffect(() => {
    getTrending()
      .then((data) => setShowcaseAlbums((data?.albums || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  const handleIdentifierSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setIsGoogleOnlyAccount(false);
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/check', { identifier: identifier.trim() });
      if (response.data.exists) {
        setIsLoginFlow(true);
        if (response.data.isGoogleOnly) {
          setIsGoogleOnlyAccount(true);
          setInfoMessage('Este e-mail já está cadastrado via Google. Use o botão "Continuar com Google" abaixo para entrar.');
        } else if (response.data.isEmail) {
          setInfoMessage('Encontramos uma conta com este e-mail. Digite sua senha para entrar.');
        }
        setStep(2);
      } else {
        if (response.data.isEmail) {
          setIsLoginFlow(false);
          setEmail(identifier.trim());
          setStep(2);
        } else {
          setError('Conta não encontrada. Para criar uma conta nova, digite seu e-mail.');
        }
      }
    } catch (err) {
      console.error('Erro ao verificar conta:', err);
      setError(err?.response?.data?.error || err?.message || 'Ocorreu um erro ao verificar a conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setIsSubmitting(true);
    try {
      if (isLoginFlow) {
        const result = await login(identifier.trim(), password);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.message);
        }
      } else {
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
          username: username.trim(),
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
      setStep('onboarding');
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
        username: username.trim(),
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

  const openForgotPassword = () => {
    setError('');
    setInfoMessage('');
    setForgotSent(false);
    if (identifier.includes('@')) {
      setForgotEmail(identifier.trim());
    }
    setStep('forgot');
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/password-reset/request', {
        email: forgotEmail.trim(),
      });
      setForgotSent(true);
      setInfoMessage(
        res.data?.message ||
          'Enviamos um link de confirmação para o seu e-mail. Abra sua caixa de entrada para trocar sua senha.'
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível enviar o link de redefinição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasMinLength = password.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSpecial = /[\d#?!&@$*^%-]/.test(password);
  const allRequirementsMet = hasMinLength && hasLetter && hasNumberOrSpecial;

  if (step === 'onboarding') {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
        <Paper sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 4 }}>
          <OnboardingFlow onFinish={() => navigate('/')} />
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
      <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
        {/* Coluna Editorial (Desktop) */}
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Box className="mtl-reveal">
            <Typography variant="h2" sx={{ mb: 2, fontSize: { md: '2.75rem', lg: '3.25rem' } }}>
              Cada disco ouvido merece um lugar na estante.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: '48ch', fontSize: '1.05rem', lineHeight: 1.65 }}>
              Avalie álbuns e faixas, escreva reviews sinceras, acompanhe o que seus amigos estão escutando e conecte sua biblioteca do Spotify.
            </Typography>

            {showcaseAlbums.length > 0 && (
              <Grid container spacing={1.5}>
                {showcaseAlbums.map((album) => (
                  <Grid size={{ xs: 4 }} key={album.id}>
                    <Box
                      sx={{
                        position: 'relative',
                        borderRadius: 2.5,
                        overflow: 'hidden',
                        aspectRatio: '1 / 1',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box
                        component="img"
                        src={album.imageUrl}
                        alt={album.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.82) 100%)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          p: 1.25,
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} noWrap sx={{ color: '#fff' }}>
                          {album.name}
                        </Typography>
                        <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.68rem' }}>
                          {album.artist}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Grid>

        {/* Coluna de Autenticação */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 4, maxWidth: 460, mx: 'auto' }} className="mtl-reveal">
            <Typography component="h1" variant="h4" gutterBottom>
              {step === 1 && 'Entrar ou criar conta'}
              {step === 2 && isLoginFlow && 'Bem-vindo de volta'}
              {step === 2 && !isLoginFlow && 'Crie sua conta'}
              {step === 'verify' && 'Verifique seu e-mail'}
              {step === 'forgot' && 'Redefinir senha'}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {step === 1 && 'Informe seu e-mail para criar uma conta ou seu username para entrar.'}
              {step === 2 && isLoginFlow && `Entrando como ${identifier}`}
              {step === 2 && !isLoginFlow && `Cadastrando com ${email}`}
              {step === 'verify' && `Enviamos um código de 6 dígitos para ${email}.`}
              {step === 'forgot' && 'Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha.'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}
            {infoMessage && <Alert severity="info" sx={{ mb: 2.5 }}>{infoMessage}</Alert>}

            {step === 1 && (
              <Box>
                <Box sx={{ mb: 2.5 }}>
                  {isNativeApp ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={handleNativeGoogleLogin}
                      sx={{
                        borderRadius: 99,
                        py: 1.15,
                        borderColor: 'divider',
                        bgcolor: '#131314',
                        color: '#E3E3E3',
                        fontWeight: 700,
                        gap: 1.25,
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#1e1f20', borderColor: 'text.secondary' },
                      }}
                    >
                      <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18 }}>
                        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
                      </Box>
                      Continuar com Google
                    </Button>
                  ) : googleClientId ? (
                    <Box
                      ref={googleBtnRef}
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        minHeight: 44,
                        width: '100%',
                      }}
                    />
                  ) : (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={() =>
                        setInfoMessage('Para ativar o login com Google neste ambiente, configure a variável VITE_GOOGLE_CLIENT_ID.')
                      }
                      sx={{
                        borderRadius: 99,
                        py: 1.15,
                        borderColor: 'divider',
                        color: 'text.primary',
                        fontWeight: 700,
                        gap: 1.25,
                      }}
                    >
                      <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18 }}>
                        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
                      </Box>
                      Continuar com Google
                    </Button>
                  )}
                </Box>

                <Divider sx={{ my: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    OU COM E-MAIL
                  </Typography>
                </Divider>

                <Box component="form" onSubmit={handleIdentifierSubmit}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="identifier"
                    label="E-mail ou Username"
                    name="identifier"
                    autoComplete="email"
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                  <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2.5 }} disabled={isSubmitting}>
                    {isSubmitting ? 'Verificando...' : 'Continuar'}
                  </Button>
                  <Button
                    type="button"
                    fullWidth
                    variant="text"
                    size="small"
                    onClick={openForgotPassword}
                    sx={{ mt: 1.5, textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}
                  >
                    Esqueci minha senha
                  </Button>
                </Box>
              </Box>
            )}

            {step === 2 && isGoogleOnlyAccount && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {isNativeApp ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    onClick={handleNativeGoogleLogin}
                    sx={{
                      borderRadius: 99,
                      py: 1.15,
                      borderColor: 'divider',
                      bgcolor: '#131314',
                      color: '#E3E3E3',
                      fontWeight: 700,
                      gap: 1.25,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#1e1f20', borderColor: 'text.secondary' },
                    }}
                  >
                    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18 }}>
                      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
                    </Box>
                    Continuar com Google
                  </Button>
                ) : googleClientId ? (
                  <Box
                    ref={googleBtnRef}
                    sx={{ display: 'flex', justifyContent: 'center', minHeight: 44, width: '100%' }}
                  />
                ) : null}
                <Button
                  fullWidth
                  variant="text"
                  color="inherit"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    setError('');
                    setInfoMessage('');
                    setIsGoogleOnlyAccount(false);
                    setStep(1);
                  }}
                >
                  Usar outra conta
                </Button>
              </Box>
            )}

            {step === 2 && !isGoogleOnlyAccount && (
              <Box component="form" onSubmit={handleCredentialsSubmit}>
                {!isLoginFlow && (
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="username"
                    label="Username"
                    name="username"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    helperText="Seu identificador público (ex: @seu_nome)"
                  />
                )}

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Senha"
                  type="password"
                  id="password"
                  autoComplete={isLoginFlow ? 'current-password' : 'new-password'}
                  value={password}
                  autoFocus={isLoginFlow}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {isLoginFlow && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.25, mb: 1 }}>
                    <Button
                      type="button"
                      variant="text"
                      size="small"
                      onClick={openForgotPassword}
                      sx={{ textTransform: 'none', fontWeight: 600, p: 0.5, minWidth: 0 }}
                    >
                      Esqueci minha senha
                    </Button>
                  </Box>
                )}

                {!isLoginFlow && (
                  <>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      name="confirmPassword"
                      label="Confirmar Senha"
                      type="password"
                      id="confirmPassword"
                      autoComplete="new-password"
                      value={confirmPassword}
                      error={Boolean(confirmPassword && password !== confirmPassword)}
                      helperText={confirmPassword && password !== confirmPassword ? 'As senhas não coincidem.' : ''}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />

                    <Box
                      sx={{
                        mt: 2,
                        mb: 2,
                        p: 1.75,
                        borderRadius: 2.5,
                        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.75 }}>
                        Requisitos da senha
                      </Typography>
                      <List dense sx={{ pt: 0, pb: 0 }}>
                        {[
                          { ok: hasMinLength, label: 'Pelo menos 10 caracteres' },
                          { ok: hasLetter, label: 'Pelo menos 1 letra' },
                          { ok: hasNumberOrSpecial, label: 'Pelo menos 1 número ou caractere especial' },
                        ].map((rule) => (
                          <ListItem key={rule.label} sx={{ py: 0.2, px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 26 }}>
                              {rule.ok ? (
                                <CheckCircleIcon color="primary" fontSize="small" />
                              ) : (
                                <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={rule.label}
                              sx={{ m: 0 }}
                              primaryTypographyProps={{
                                variant: 'caption',
                                color: rule.ok ? 'text.primary' : 'text.secondary',
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={<Typography variant="caption">Eu concordo com os Termos de Uso do MyTrackList</Typography>}
                      sx={{ mb: 1.5 }}
                    />
                  </>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 1, mb: 1.5 }}
                  disabled={
                    isSubmitting ||
                    (!isLoginFlow && (!allRequirementsMet || password !== confirmPassword || !termsAccepted))
                  }
                >
                  {isSubmitting ? 'Aguarde...' : isLoginFlow ? 'Entrar' : 'Enviar código de verificação'}
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  color="inherit"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    setError('');
                    setInfoMessage('');
                    setStep(1);
                  }}
                  disabled={isSubmitting}
                >
                  Voltar
                </Button>
              </Box>
            )}

            {step === 'verify' && (
              <Box component="form" onSubmit={handleVerifyCodeSubmit}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="verificationCode"
                  label="Código de verificação (6 dígitos)"
                  name="verificationCode"
                  autoFocus
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputProps={{
                    inputMode: 'numeric',
                    maxLength: 6,
                    className: 'mtl-mono',
                    style: { letterSpacing: '8px', textAlign: 'center', fontSize: '1.35rem', fontWeight: 700 },
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 2.5, mb: 1.5 }}
                  disabled={isSubmitting || verificationCode.length !== 6}
                >
                  {isSubmitting ? 'Verificando...' : 'Confirmar e criar conta'}
                </Button>
                <Button fullWidth variant="outlined" sx={{ mb: 1 }} onClick={handleResendCode} disabled={isSubmitting}>
                  Reenviar código
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  color="inherit"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    setError('');
                    setInfoMessage('');
                    setStep(2);
                  }}
                  disabled={isSubmitting}
                >
                  Voltar
                </Button>
              </Box>
            )}

            {step === 'forgot' && (
              <Box component="form" onSubmit={handleForgotPasswordSubmit}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="forgotEmail"
                  label="E-mail da conta"
                  name="forgotEmail"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    setForgotSent(false);
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 2.5, mb: 1.5 }}
                  disabled={isSubmitting || !forgotEmail.trim()}
                >
                  {isSubmitting
                    ? 'Enviando...'
                    : forgotSent
                      ? 'Reenviar link por e-mail'
                      : 'Enviar link para trocar senha'}
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  color="inherit"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    setError('');
                    setInfoMessage('');
                    setStep(1);
                  }}
                  disabled={isSubmitting}
                >
                  Voltar ao login
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default LoginPage;
