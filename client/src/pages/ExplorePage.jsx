import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Avatar,
  Button,
  alpha,
} from '@mui/material';
import { Link } from 'react-router-dom';
import StarIcon from '@mui/icons-material/Star';
import AlbumIcon from '@mui/icons-material/Album';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { getCommunityCharts } from '../services/reviews';
import { getPublicLists } from '../services/lists';
import { getTrending } from '../services/spotify';
import { VIBE_TAGS } from '../constants/vibes';

export default function ExplorePage() {
  const [itemType, setItemType] = useState('album');
  const [period, setPeriod] = useState('all');
  const [sort, setSort] = useState('rating');
  const [selectedVibe, setSelectedVibe] = useState('');

  const [charts, setCharts] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [publicLists, setPublicLists] = useState([]);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    setLoadingCharts(true);
    getCommunityCharts({ type: itemType, period, vibe: selectedVibe, sort, limit: 16 })
      .then(setCharts)
      .catch(() => setCharts([]))
      .finally(() => setLoadingCharts(false));
  }, [itemType, period, selectedVibe, sort]);

  useEffect(() => {
    getPublicLists(6).then(setPublicLists).catch(() => {});
    getTrending().then((d) => setTrending((d?.albums || []).slice(0, 6))).catch(() => {});
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }} className="mtl-reveal">
      {/* Cabeçalho */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, mb: 1 }}>
          Explorar
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '58ch' }}>
          Descubra os álbuns, músicas e artistas mais bem avaliados pela comunidade, filtre por período ou vibe e explore listas curadas.
        </Typography>
      </Box>

      {/* Filtros dos Charts */}
      <Paper sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3.5, mb: 4 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <ToggleButtonGroup size="small" exclusive value={itemType} onChange={(e, v) => v && setItemType(v)} color="primary">
            <ToggleButton value="album">Álbuns</ToggleButton>
            <ToggleButton value="track">Músicas</ToggleButton>
            <ToggleButton value="artist">Artistas</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <ToggleButtonGroup size="small" exclusive value={period} onChange={(e, v) => v && setPeriod(v)} color="primary">
              <ToggleButton value="week">Semana</ToggleButton>
              <ToggleButton value="month">Mês</ToggleButton>
              <ToggleButton value="all">Todos os tempos</ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup size="small" exclusive value={sort} onChange={(e, v) => v && setSort(v)} color="secondary">
              <ToggleButton value="rating">Maior Nota</ToggleButton>
              <ToggleButton value="popular">Mais Avaliados</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mr: 0.5 }}>
            Vibe:
          </Typography>
          <Chip
            size="small"
            label="Todas"
            clickable
            color={!selectedVibe ? 'primary' : 'default'}
            variant={!selectedVibe ? 'filled' : 'outlined'}
            onClick={() => setSelectedVibe('')}
          />
          {VIBE_TAGS.map((tag) => (
            <Chip
              key={tag}
              size="small"
              label={tag}
              clickable
              color={selectedVibe === tag ? 'secondary' : 'default'}
              variant={selectedVibe === tag ? 'filled' : 'outlined'}
              onClick={() => setSelectedVibe((prev) => (prev === tag ? '' : tag))}
            />
          ))}
        </Box>
      </Paper>

      {/* Grid de Charts */}
      <Box sx={{ mb: 6 }}>
        {loadingCharts ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : charts.length === 0 ? (
          <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Nenhum item encontrado com estes filtros
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tente ampliar o período para "Todos os tempos" ou limpar o filtro de vibe.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2.25}>
            {charts.map((item, idx) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={item.item_id}>
                <Box
                  component={Link}
                  to={`/${item.item_type}/${item.item_id}`}
                  className="mtl-album-card"
                  sx={{
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    height: '100%',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: item.item_type === 'artist' ? '50%' : 2,
                      overflow: 'hidden',
                      bgcolor: 'action.hover',
                      mb: 1.25,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.item_image_url ? (
                      <Box
                        component="img"
                        src={item.item_image_url}
                        alt={item.item_name}
                        className="mtl-cover-img"
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <AlbumIcon color="disabled" fontSize="large" />
                    )}

                    {/* Posição no Chart */}
                    <Box
                      className="mtl-mono"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        px: 0.9,
                        py: 0.25,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(0,0,0,0.8)',
                        color: idx < 3 ? 'secondary.main' : '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      #{idx + 1}
                    </Box>

                    {/* Nota */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        px: 0.9,
                        py: 0.3,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.35,
                      }}
                    >
                      <StarIcon sx={{ fontSize: 13, color: 'secondary.main' }} />
                      <Typography variant="caption" className="mtl-mono" fontWeight={700}>
                        {item.avg_rating}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="subtitle2" fontWeight={700} noWrap>
                    {item.item_name || 'Sem título'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {item.review_count} {item.review_count === 1 ? 'avaliação' : 'avaliações'}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Listas da Comunidade */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormatListNumberedIcon color="primary" fontSize="small" />
            <Typography variant="h5">Listas da Comunidade</Typography>
          </Box>
          <Button component={Link} to="/profile?tab=lists" size="small" variant="outlined">
            Criar minha lista
          </Button>
        </Box>

        {publicLists.length === 0 ? (
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma lista pública criada ainda. Crie a primeira no seu perfil!
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2.5}>
            {publicLists.map((list) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={list.id}>
                <Paper
                  component={Link}
                  to={`/lists/${list.id}`}
                  className="mtl-album-card"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    height: '100%',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 0.5,
                      height: 82,
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'action.hover',
                      mb: 1.5,
                    }}
                  >
                    {[0, 1, 2, 3].map((slot) => (
                      <Box
                        key={slot}
                        sx={{
                          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
                          backgroundImage: list.preview_covers?.[slot] ? `url(${list.preview_covers[slot]})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    ))}
                  </Box>

                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {list.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={list.author_avatar} sx={{ width: 22, height: 22, fontSize: '0.7rem' }}>
                        {list.author_username?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        @{list.author_username} · {list.items_count} itens
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: 'text.secondary' }}>
                      <FavoriteIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption" className="mtl-mono">{list.likes_count}</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Lançamentos em Alta */}
      {trending.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <TrendingUpIcon color="primary" fontSize="small" />
            <Typography variant="h5">Novidades no Spotify</Typography>
          </Box>
          <Grid container spacing={2}>
            {trending.map((album) => (
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={album.id}>
                <Box
                  component={Link}
                  to={`/album/${album.id}`}
                  className="mtl-album-card"
                  sx={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      mb: 1,
                    }}
                  >
                    <Box component="img" src={album.imageUrl} alt={album.name} className="mtl-cover-img" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                  <Typography variant="caption" fontWeight={700} noWrap display="block">
                    {album.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.7rem' }}>
                    {album.artist}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
}

