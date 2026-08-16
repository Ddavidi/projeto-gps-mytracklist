import React, { useState, useMemo } from 'react';
import { Box, Typography, Grid, Paper, Select, MenuItem, FormControl, InputLabel, Slider, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip, Chip } from '@mui/material';
import { Link } from 'react-router-dom';
import StarIcon from '@mui/icons-material/Star';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import GridViewIcon from '@mui/icons-material/GridView';

export default function ProfileMediaGrid({ type, reviews, itemDetails }) {
  const [sortOrder, setSortOrder] = useState('recent'); // recent, old, high_score, low_score
  const [minScore, setMinScore] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [genreFilter, setGenreFilter] = useState('');

  // Extrair todos os gêneros únicos dos itens deste tipo
  const availableGenres = useMemo(() => {
    const genres = new Set();
    reviews.filter(r => (r.item_type || 'track') === type).forEach(r => {
      const details = itemDetails[r.item_id];
      if (details?.genres && Array.isArray(details.genres)) {
        details.genres.forEach(g => genres.add(g));
      }
    });
    return Array.from(genres).sort();
  }, [reviews, type, itemDetails]);

  // Filtra as avaliações pelo tipo atual
  const filteredReviews = useMemo(() => {
    let result = reviews.filter(r => (r.item_type || 'track') === type);
    
    // Filtro de nota
    result = result.filter(r => r.rating >= minScore);

    // Filtro de Gênero
    if (genreFilter) {
      result = result.filter(r => {
        const details = itemDetails[r.item_id];
        return details?.genres && details.genres.includes(genreFilter);
      });
    }

    // Ordenação
    result.sort((a, b) => {
      if (sortOrder === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortOrder === 'old') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortOrder === 'high_score') return b.rating - a.rating;
      if (sortOrder === 'low_score') return a.rating - b.rating;
      return 0;
    });

    return result;
  }, [reviews, type, sortOrder, minScore, genreFilter, itemDetails]);

  return (
    <Grid container spacing={4}>
      {/* Sidebar de Filtros */}
      <Grid size={{ xs: 12, md: 3 }}>
        <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }} elevation={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight="bold">Filtros</Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total: {filteredReviews.length} {type === 'track' ? 'músicas' : type === 'album' ? 'álbuns' : 'artistas'}
          </Typography>

          <Box sx={{ mt: 3 }}>
            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <InputLabel>Ordenar por</InputLabel>
              <Select
                value={sortOrder}
                label="Ordenar por"
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <MenuItem value="recent">Mais Recentes</MenuItem>
                <MenuItem value="old">Mais Antigas</MenuItem>
                <MenuItem value="high_score">Maior Nota</MenuItem>
                <MenuItem value="low_score">Menor Nota</MenuItem>
              </Select>
            </FormControl>

            {availableGenres.length > 0 && (
              <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                <InputLabel>Gênero Musical</InputLabel>
                <Select
                  value={genreFilter}
                  label="Gênero Musical"
                  onChange={(e) => setGenreFilter(e.target.value)}
                >
                  <MenuItem value="">Todos os Gêneros</MenuItem>
                  {availableGenres.map(g => (
                    <MenuItem key={g} value={g} sx={{ textTransform: 'capitalize' }}>{g}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Typography variant="body2" gutterBottom>Nota mínima: {minScore}</Typography>
            <Slider
              value={minScore}
              onChange={(e, val) => setMinScore(val)}
              step={1}
              marks
              min={0}
              max={10}
              valueLabelDisplay="auto"
              sx={{ color: '#1db954' }}
            />
          </Box>
        </Paper>
      </Grid>

      {/* Grid/Table Principal */}
      <Grid size={{ xs: 12, md: 9 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight="bold">
            {type === 'track' ? 'Músicas' : type === 'album' ? 'Álbuns' : 'Artistas'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, bgcolor: 'background.paper', p: 0.5, borderRadius: 2 }}>
            <Tooltip title="Visualização em Grade">
              <IconButton 
                size="small" 
                onClick={() => setViewMode('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
              >
                <GridViewIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Visualização em Lista">
              <IconButton 
                size="small" 
                onClick={() => setViewMode('table')}
                color={viewMode === 'table' ? 'primary' : 'default'}
              >
                <FormatListBulletedIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {filteredReviews.length === 0 ? (
          <Typography color="text.secondary">Nenhum item encontrado com estes filtros.</Typography>
        ) : viewMode === 'grid' ? (
          <Grid container spacing={3}>
            {filteredReviews.map((review) => {
              const details = itemDetails[review.item_id];
              if (!details) return null;

              const isArtist = type === 'artist';
              const imgUrl = details.imageUrl || '';
              const linkTarget = `/${type}/${review.item_id}`;

              return (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={review.id}>
                  <Box 
                    component={Link} 
                    to={linkTarget}
                    sx={{ 
                      textDecoration: 'none', 
                      color: 'inherit',
                      display: 'block',
                      '&:hover .media-img': { opacity: 0.8 },
                      '&:hover .media-title': { color: '#1db954' }
                    }}
                  >
                    <Box 
                      className="media-img"
                      sx={{ 
                        width: '100%',
                        paddingTop: '100%', // 1:1 Aspect Ratio
                        position: 'relative',
                        bgcolor: 'grey.800',
                        backgroundImage: `url(${imgUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: isArtist ? '50%' : '8px',
                        mb: 1,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      {/* Badge da Nota */}
                      <Box sx={{ 
                        position: 'absolute', 
                        bottom: 8, 
                        right: 8, 
                        bgcolor: 'rgba(0,0,0,0.7)', 
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}>
                        <StarIcon sx={{ fontSize: 14, color: '#f5c518' }} />
                        <Typography variant="caption" fontWeight="bold">{review.rating}</Typography>
                      </Box>
                    </Box>
                    <Typography className="media-title" variant="body2" fontWeight="bold" noWrap transition="color 0.2s">
                      {details.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {details.artist || ''}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell>Item</TableCell>
                  {type !== 'artist' && <TableCell>Artista</TableCell>}
                  <TableCell>Gêneros</TableCell>
                  <TableCell align="center">Sua Nota</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReviews.map((review) => {
                  const details = itemDetails[review.item_id];
                  if (!details) return null;
                  const linkTarget = `/${type}/${review.item_id}`;

                  return (
                    <TableRow key={review.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box 
                            component="img" 
                            src={details.imageUrl || ''} 
                            sx={{ width: 40, height: 40, borderRadius: type === 'artist' ? '50%' : 1, objectFit: 'cover' }}
                          />
                          <Typography 
                            component={Link} 
                            to={linkTarget} 
                            variant="body2" 
                            fontWeight="bold"
                            sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                          >
                            {details.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      {type !== 'artist' && (
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {details.artist || '-'}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 200 }}>
                          {details.genres && details.genres.slice(0, 2).map(g => (
                            <Chip key={g} label={g} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20, textTransform: 'capitalize' }} />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'warning.main' }}>
                          <StarIcon sx={{ fontSize: 16 }} />
                          <Typography variant="body2" fontWeight="bold">{review.rating}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Grid>
    </Grid>
  );
}
