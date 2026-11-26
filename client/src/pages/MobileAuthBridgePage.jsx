import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Container, Paper, Box, Typography, Alert, Button, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../services/api';

/**
 * Página intermediária hospedada na web (origem autorizada no Google Cloud)
 * aberta pelo app Android/iOS via Chrome Custom Tabs (@capacitor/browser).
 * Após autenticar com o Google, redireciona o JWT de volta para o app via Deep Link.
 */
function MobileAuthBridgePage() {
  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const [status, setStatus] = useState('ready'); // ready | loading | done
  const [error, setError] = useState('');
  const [deepLinkUrl, setDeepLinkUrl] = useState('');

  const handleGoogleCredential = useCallback(async (response) => {
    if (!response?.credential) return;
    setError('');
    setStatus('loading');
    try {
      const res = await api.post('/auth/google', { credential: response.credential });
      const token = res.data?.token;
      const isNewUser = res.data?.isNewUser ? '1' : '0';

      if (!token) {
        throw new Error('Token de autenticação não recebido.');
      }

      const callbackUrl = `mytracklist://auth-callback?token=${encodeURIComponent(token)}&isNewUser=${isNewUser}`;
      setDeepLinkUrl(callbackUrl);
      setStatus('done');

      // Dispara o retorno automático para o aplicativo Android/iOS
      window.location.href = callbackUrl;
    } catch (err) {
      setStatus('ready');
      setError(err.response?.data?.error || err.message || 'Falha ao autenticar com o Google.');
    }
  }, []);

  useEffect(() => {
    if (!googleClientId || status !== 'ready') return;

    let attempts = 0;
    const renderBtn = () => {
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
          width: Math.min(340, googleBtnRef.current.offsetWidth || 320),
        });
        return true;
      }
      return false;
    };

    if (!renderBtn()) {
      const timer = setInterval(() => {
        attempts += 1;
        if (renderBtn() || attempts > 30) {
          clearInterval(timer);
        }
      }, 250);
      return () => clearInterval(timer);
    }
  }, [googleClientId, status, handleGoogleCredential]);

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 6, sm: 10 } }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Entrar no MyTrackList
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left' }}>
            {error}
          </Alert>
        )}

        {status === 'loading' && (
          <Box sx={{ py: 4 }}>
            <CircularProgress size={36} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Validando sua conta Google...
            </Typography>
          </Box>
        )}

        {status === 'ready' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Selecione sua conta Google abaixo. Assim que confirmar, você voltará automaticamente para o aplicativo.
            </Typography>
            <Box
              ref={googleBtnRef}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                minHeight: 48,
                width: '100%',
              }}
            />
          </Box>
        )}

        {status === 'done' && (
          <Box sx={{ py: 2 }}>
            <CheckCircleIcon color="primary" sx={{ fontSize: 52, mb: 1.5 }} />
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Login confirmado!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Se o aplicativo não abrir automaticamente, toque no botão abaixo:
            </Typography>
            <Button
              component="a"
              href={deepLinkUrl}
              variant="contained"
              size="large"
              fullWidth
              startIcon={<OpenInNewIcon />}
              sx={{ borderRadius: 99, fontWeight: 700 }}
            >
              Voltar para o MyTrackList
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default MobileAuthBridgePage;
