import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Avatar,
  Button,
  Tabs,
  Tab,
  Divider,
  alpha,
} from '@mui/material';
import { Link } from 'react-router-dom';
import StarIcon from '@mui/icons-material/Star';
import AlbumIcon from '@mui/icons-material/Album';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import PublicIcon from '@mui/icons-material/Public';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import { getCommunityCharts } from '../services/reviews';
import { getPublicLists } from '../services/lists';
import { getExploreCharts } from '../services/spotify';
import PlayButton from '../components/PlayButton';
import { getRatingColor } from '../utils/ratingColor';

export default function ExplorePage() {
  // Seção 1: Rankings da Comunidade (MyTrackList primeiro)
  const [itemType, setItemType] = useState('album');
  const [period, setPeriod] = useState('all');
  const [sort, setSort] = useState('rating');

  const [charts, setCharts] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [publicLists, setPublicLists] = useState([]);

  // Seção 2: Rankings e Novidades do Spotify
  const [spotifyTab, setSpotifyTab] = useState(0); // 0: Novidades | 1: Top Global | 2: Top Brasil | 3: Mais Escutadas da História
  const [spotifyExplore, setSpotifyExplore] = useState({
    newReleases: [],
    topGlobal: [],
    topBrazil: [],
    allTimeClassics: [],
  });
  const [loadingSpotify, setLoadingSpotify] = useState(true);

  useEffect(() => {
    setLoadingCharts(true);
    getCommunityCharts({ type: itemType, period, sort, limit: 16 })
      .then(setCharts)
      .catch(() => setCharts([]))
      .finally(() => setLoadingCharts(false));
  }, [itemType, period, sort]);

  useEffect(() => {
    getPublicLists(6).then(setPublicLists).catch(() => {});
    setLoadingSpotify(true);
    getExploreCharts()
      .then((data) => {
        setSpotifyExplore({
          newReleases: data?.newReleases || [],
          topGlobal: data?.topGlobal || [],
          topBrazil: data?.topBrazil || [],
          allTimeClassics: data?.allTimeClassics || [],
        });
      })
      .catch(() => {})
      .finally(() => setLoadingSpotify(false));
  }, []);

  const renderSpotifyTrackList = (tracks, emptyMsg) => {
    if (!tracks || tracks.length === 0) {
      return (
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">{emptyMsg}</Typography>
        </Paper>
      );
    }

    return (
      <Paper sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
        {tracks.map((track, idx) => (
          <React.Fragment key={`${track.id}-${idx}`}>
            {idx > 0 && <Divider />}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                px: { xs: 1.75, sm: 2.75 },
                py: 1.4,
                transition: 'background-color 0.16s ease',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography
                variant="subtitle1"
                className="mtl-mono"
                fontWeight={800}
                color={idx < 3 ? 'primary.main' : 'text.secondary'}
                sx={{ minWidth: 28, textAlign: 'center' }}
              >
                {String(idx + 1).padStart(2, '0')}
              </Typography>

              <Avatar
                component={Link}
                to={`/music/${track.id}`}
                variant="rounded"
                src={track.imageUrl}
                alt={track.name}
                sx={{ width: 50, height: 50, flexShrink: 0 }}
              />

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  component={Link}
                  to={`/music/${track.id}`}
                  variant="subtitle2"
                  fontWeight={700}
                  noWrap
                  sx={{
                    color: 'text.primary',
                    textDecoration: 'none',
                    display: 'block',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {track.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {track.artist}{track.album ? ` · ${track.album}` : ''}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <PlayButton
                  track={{
                    type: 'track',
                    id: track.id,
                    name: track.name,
                    imageUrl: track.imageUrl,
                    previewUrl: track.previewUrl,
                  }}
                  size="small"
                />
                <Button
                  component={Link}
                  to={`/music/${track.id}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    minWidth: 0,
                    px: 1.5,
                  }}
                >
                  Avaliar
                </Button>
              </Box>
            </Box>
          </React.Fragment>
        ))}
      </Paper>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 5 } }} className="mtl-reveal">
      {/* Cabeçalho */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: { xs: '1.9rem', md: '2.6rem' }, mb: 1 }}>
          Explorar
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '60ch' }}>
          Descubra os rankings oficiais da comunidade MyTrackList e os destaques globais, nacionais e clássicos do Spotify.
        </Typography>
      </Box>

      {/* ================================================= */}
      {/* SEÇÃO 1: RANKING DA COMUNIDADE (MYTRACKLIST FIRST) */}
      {/* ================================================= */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EmojiEventsOutlinedIcon color="primary" />
          <Typography variant="h5" fontWeight={800}>
            Ranking MyTrackList
          </Typography>
        </Box>

        <Paper sx={{ p: { xs: 1.75, sm: 2.25 }, borderRadius: 3.5, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
            <ToggleButtonGroup size="small" exclusive value={itemType} onChange={(_e, v) => v && setItemType(v)} color="primary">
              <ToggleButton value="album" sx={{ textTransform: 'none', fontWeight: 700 }}>Álbuns</ToggleButton>
              <ToggleButton value="track" sx={{ textTransform: 'none', fontWeight: 700 }}>Músicas</ToggleButton>
              <ToggleButton value="artist" sx={{ textTransform: 'none', fontWeight: 700 }}>Artistas</ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
              <ToggleButtonGroup size="small" exclusive value={period} onChange={(_e, v) => v && setPeriod(v)} color="primary">
                <ToggleButton value="week" sx={{ textTransform: 'none', fontWeight: 600 }}>Semana</ToggleButton>
                <ToggleButton value="month" sx={{ textTransform: 'none', fontWeight: 600 }}>Mês</ToggleButton>
                <ToggleButton value="all" sx={{ textTransform: 'none', fontWeight: 600 }}>História</ToggleButton>
              </ToggleButtonGroup>

              <ToggleButtonGroup size="small" exclusive value={sort} onChange={(_e, v) => v && setSort(v)} color="secondary">
                <ToggleButton value="rating" sx={{ textTransform: 'none', fontWeight: 600 }}>Maior Nota</ToggleButton>
                <ToggleButton value="popular" sx={{ textTransform: 'none', fontWeight: 600 }}>Mais Avaliados</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Paper>

        {loadingCharts ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : charts.length === 0 ? (
          <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Ainda não há avaliações neste filtro
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tente mudar o período para "História" ou faça as primeiras avaliações da comunidade.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {charts.map((item, idx) => {
              const targetRoute = item.item_type === 'track' ? 'music' : item.item_type;
              return (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={item.item_id}>
                  <Box
                    component={Link}
                    to={`/${targetRoute}/${item.item_id}`}
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

                      <Box
                        className="mtl-mono"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          px: 0.9,
                          py: 0.25,
                          borderRadius: 1.5,
                          bgcolor: 'rgba(0,0,0,0.82)',
                          color: idx < 3 ? 'secondary.main' : '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        #{idx + 1}
                      </Box>

                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 8,
                          right: 8,
                          px: 0.9,
                          py: 0.3,
                          borderRadius: 1.5,
                          bgcolor: 'rgba(0,0,0,0.86)',
                          border: '1px solid',
                          borderColor: alpha(getRatingColor(item.avg_rating), 0.55),
                          color: getRatingColor(item.avg_rating),
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.35,
                        }}
                      >
                        <StarIcon sx={{ fontSize: 13, color: getRatingColor(item.avg_rating) }} />
                        <Typography variant="caption" className="mtl-mono" fontWeight={800} sx={{ color: getRatingColor(item.avg_rating) }}>
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
              );
            })}
          </Grid>
        )}
      </Box>

      {/* ================================================= */}
      {/* SEÇÃO 2: LISTAS DA COMUNIDADE                     */}
      {/* ================================================= */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormatListNumberedIcon color="primary" fontSize="small" />
            <Typography variant="h5" fontWeight={800}>Tier Lists da Comunidade</Typography>
          </Box>
          <Button component={Link} to="/profile?tab=lists" size="small" variant="outlined" sx={{ borderRadius: 2 }}>
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

      {/* ================================================= */}
      {/* SEÇÃO 3: RANKINGS & NOVIDADES DO SPOTIFY          */}
      {/* ================================================= */}
      <Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Charts & Novidades no Spotify
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lançamentos recentes, mais escutadas da semana no mundo e no Brasil, e clássicos da história.
          </Typography>
        </Box>

        <Paper sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
          <Tabs
            value={spotifyTab}
            onChange={(_e, v) => setSpotifyTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 1 }}
          >
            <Tab icon={<NewReleasesOutlinedIcon fontSize="small" />} iconPosition="start" label="Novidades" />
            <Tab icon={<PublicIcon fontSize="small" />} iconPosition="start" label="Top Global (Semana)" />
            <Tab icon={<FlagOutlinedIcon fontSize="small" />} iconPosition="start" label="Top Brasil (Semana)" />
            <Tab icon={<WorkspacePremiumOutlinedIcon fontSize="small" />} iconPosition="start" label="Mais Escutadas da História" />
          </Tabs>
        </Paper>

        {loadingSpotify ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : spotifyTab === 0 ? (
          spotifyExplore.newReleases.length === 0 ? (
            <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Não foi possível carregar os lançamentos agora.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {spotifyExplore.newReleases.map((album) => (
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
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Box
                        component="img"
                        src={album.imageUrl}
                        alt={album.name}
                        className="mtl-cover-img"
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
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
          )
        ) : spotifyTab === 1 ? (
          renderSpotifyTrackList(spotifyExplore.topGlobal, 'Nenhum dado disponível no Top Global no momento.')
        ) : spotifyTab === 2 ? (
          renderSpotifyTrackList(spotifyExplore.topBrazil, 'Nenhum dado disponível no Top Brasil no momento.')
        ) : (
          renderSpotifyTrackList(spotifyExplore.allTimeClassics, 'Nenhum dado disponível no ranking histórico no momento.')
        )}
      </Box>
    </Container>
  );
}
