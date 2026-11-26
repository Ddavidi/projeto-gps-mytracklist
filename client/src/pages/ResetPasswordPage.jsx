import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LockResetIcon from '@mui/icons-material/LockReset';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = searchParams.get('token') || '';

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [accountInfo, setAccountInfo] = useState({ email: '', username: '' });
  const [tokenError, setTokenError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      setTokenValid(false);
      setTokenError('Link de redefinição inválido ou incompleto.');
      setChecking(false);
      return;
    }

    setChecking(true);
    api
      .get('/auth/password-reset/verify', { params: { token } })
      .then((res) => {
        if (!active) return;
        setTokenValid(true);
        setAccountInfo({
          email: res.data?.email || '',
          username: res.data?.username || '',
        });
      })
      .catch((err) => {
        if (!active) return;
        setTokenValid(false);
        setTokenError(
          err.response?.data?.error || 'Este link de redefinição é inválido ou expirou.'
        );
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const hasMinLength = newPassword.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumberOrSpecial = /[\d#?!&@$*^%-]/.test(newPassword);
  const allRequirementsMet = hasMinLength && hasLetter && hasNumberOrSpecial;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!allRequirementsMet) {
      setError('A senha não atende a todos os requisitos.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/password-reset/confirm', {
        token,
        newPassword,
        confirmPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível alterar sua senha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }} className="mtl-reveal">
      <Paper sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 4 }}>
        {checking ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <CircularProgress size={36} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Validando seu link de confirmação...
            </Typography>
          </Box>
        ) : success ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleIcon color="primary" sx={{ fontSize: 56, mb: 1.5 }} />
            <Typography variant="h5" fontWeight={800} gutterBottom>
              Senha alterada com sucesso!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sua nova senha já está ativa. Você pode continuar usando sua conta normalmente.
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => navigate(user ? '/settings?tab=security' : '/login')}
              sx={{ borderRadius: 2.5, fontWeight: 700 }}
            >
              {user ? 'Voltar para Configurações' : 'Ir para o Login'}
            </Button>
          </Box>
        ) : !tokenValid ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <ErrorOutlineIcon color="error" sx={{ fontSize: 54, mb: 1.5 }} />
            <Typography variant="h5" fontWeight={800} gutterBottom>
              Link inválido ou expirado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {tokenError}
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => navigate(user ? '/settings?tab=security' : '/login')}
              sx={{ borderRadius: 2.5, fontWeight: 700 }}
            >
              Solicitar novo link
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
              <LockResetIcon color="primary" sx={{ fontSize: 30 }} />
              <Typography component="h1" variant="h5" fontWeight={800}>
                Definir nova senha
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {accountInfo.username
                ? `Escolha uma nova senha para @${accountInfo.username} (${accountInfo.email}).`
                : 'Escolha uma nova senha para a sua conta do MyTrackList.'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              required
              type="password"
              label="Nova Senha"
              autoComplete="new-password"
              autoFocus
              margin="normal"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <TextField
              fullWidth
              required
              type="password"
              label="Confirmar Nova Senha"
              autoComplete="new-password"
              margin="normal"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={Boolean(confirmPassword && newPassword !== confirmPassword)}
              helperText={
                confirmPassword && newPassword !== confirmPassword
                  ? 'As senhas não coincidem.'
                  : ''
              }
            />

            <Box
              sx={{
                mt: 2,
                mb: 3,
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

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={submitting || !allRequirementsMet || newPassword !== confirmPassword}
              sx={{ borderRadius: 2.5, fontWeight: 700, py: 1.25 }}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : 'Salvar nova senha'}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default ResetPasswordPage;
