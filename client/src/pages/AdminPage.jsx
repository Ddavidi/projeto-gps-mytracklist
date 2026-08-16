import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, CircularProgress, Alert, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { getAdminStats } from '../services/admin';

function AdminPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminStats();
        setStats(data);
      } catch (err) {
        setError('Não foi possível carregar os dados do painel.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, pb: 8 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
        Painel de Administração
      </Typography>

      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ opacity: 0.8 }}>Usuários Cadastrados</Typography>
                <Typography variant="h3" fontWeight="bold">{stats?.totalUsers || 0}</Typography>
              </Box>
              <PeopleIcon sx={{ fontSize: 60, opacity: 0.5 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ opacity: 0.8 }}>Total de Avaliações</Typography>
                <Typography variant="h3" fontWeight="bold">{stats?.totalReviews || 0}</Typography>
              </Box>
              <RateReviewIcon sx={{ fontSize: 60, opacity: 0.5 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Usuários Recentes
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 6, borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Perfil</TableCell>
              <TableCell>Nome de Usuário</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Data de Cadastro</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats?.recentUsers?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Avatar src={user.avatar_url} alt={user.username} />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{user.username}</TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}
            {stats?.recentUsers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">Nenhum usuário recente</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Avaliações Recentes
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Usuário</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>ID do Item</TableCell>
              <TableCell>Nota</TableCell>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats?.recentReviews?.map((review) => (
              <TableRow key={review.id}>
                <TableCell sx={{ fontWeight: 'bold' }}>{review.username}</TableCell>
                <TableCell>{review.item_type}</TableCell>
                <TableCell>{review.item_id}</TableCell>
                <TableCell>{review.rating}</TableCell>
                <TableCell>{new Date(review.created_at).toLocaleString('pt-BR')}</TableCell>
              </TableRow>
            ))}
            {stats?.recentReviews?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">Nenhuma avaliação recente</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default AdminPage;
