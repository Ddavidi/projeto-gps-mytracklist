import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  alpha,
} from '@mui/material';
import { Link } from 'react-router-dom';
import StarIcon from '@mui/icons-material/Star';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import GridViewIcon from '@mui/icons-material/GridView';
import AlbumIcon from '@mui/icons-material/Album';
import { getRatingMeta } from '../../utils/ratingColor';

export default function ProfileMediaGrid({ type, reviews, itemDetails }) {
  const [sortOrder, setSortOrder] = useState('recent');
  const [minScore, setMinScore] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [genreFilter, setGenreFilter] = useState('');

  const availableGenres = useMemo(() => {
    const genres = new Set();
    reviews
      .filter((r) => (r.item_type || 'track') === type)
      .forEach((r) => {
        const details = itemDetails[r.item_id];
        if (details?.genres && Array.isArray(details.genres)) {
          details.genres.forEach((g) => genres.add(g));
        }
      });
    return Array.from(genres).sort();
  }, [reviews, type, itemDetails]);

  const filteredReviews = useMemo(() => {
    let result = reviews.filter((r) => (r.item_type || 'track') === type);
    result = result.filter((r) => r.rating >= minScore);

    if (genreFilter) {
      result = result.filter((r) => {
        const details = itemDetails[r.item_id];
        return details?.genres && details.genres.includes(genreFilter);
      });
    }

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
    <Grid container spacing={3.5}>
      {/* Sidebar de Filtros */}
      <Grid size={{ xs: 12, md: 3 }}>
        <Paper
          sx={{
            p: 2.5,
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
            borderRadius: 3,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Filtros
          </Typography>
          <Typography variant="caption" className="mtl-mono" color="text.secondary" display="block" sx={{ mb: 2.5 }}>
            {filteredReviews.length} {type === 'track' ? 'músicas' : type === 'album' ? 'álbuns' : 'artistas'}
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
            <InputLabel>Ordenar por</InputLabel>
            <Select value={sortOrder} label="Ordenar por" onChange={(e) => setSortOrder(e.target.value)}>
              <MenuItem value="recent">Mais Recentes</MenuItem>
              <MenuItem value="old">Mais Antigas</MenuItem>
              <MenuItem value="high_score">Maior Nota</MenuItem>
              <MenuItem value="low_score">Menor Nota</MenuItem>
            </Select>
          </FormControl>

          {availableGenres.length > 0 && (
            <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
              <InputLabel>Gênero Musical</InputLabel>
              <Select value={genreFilter} label="Gênero Musical" onChange={(e) => setGenreFilter(e.target.value)}>
                <MenuItem value="">Todos os Gêneros</MenuItem>
                {availableGenres.map((g) => (
                  <MenuItem key={g} value={g} sx={{ textTransform: 'capitalize' }}>
                    {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Nota mínima: <Box component="span" className="mtl-mono" color="text.primary" fontWeight={700}>{minScore}</Box>
          </Typography>
          <Slider
            value={minScore}
            onChange={(e, val) => setMinScore(val)}
            step={1}
            marks
            min={0}
            max={10}
            valueLabelDisplay="auto"
            color="primary"
          />
        </Paper>
      </Grid>

      {/* Grade / Tabela */}
      <Grid size={{ xs: 12, md: 9 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography variant="h6">
            {type === 'track' ? 'Músicas Avaliadas' : type === 'album' ? 'Álbuns Avaliados' : 'Artistas Avaliados'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, p: 0.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Tooltip title="Grade">
              <IconButton size="small" onClick={() => setViewMode('grid')} color={viewMode === 'grid' ? 'primary' : 'default'}>
                <GridViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Lista">
              <IconButton size="small" onClick={() => setViewMode('table')} color={viewMode === 'table' ? 'primary' : 'default'}>
                <FormatListBulletedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {filteredReviews.length === 0 ? (
          <Typography color="text.secondary">Nenhum item encontrado com estes filtros.</Typography>
        ) : viewMode === 'grid' ? (
          <Grid container spacing={2.25}>
            {filteredReviews.map((review) => {
              const details = itemDetails[review.item_id];
              const isArtist = type === 'artist';
              const imgUrl = details?.imageUrl || review.item_image_url || '';
              const name = details?.name || review.item_name || 'Item';
              const linkTarget = `/${type}/${review.item_id}`;

              return (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={review.id}>
                  <Box
                    component={Link}
                    to={linkTarget}
                    className="mtl-album-card"
                    sx={{
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'block',
                      '&:hover .media-title': { color: 'primary.main' },
                    }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        position: 'relative',
                        bgcolor: 'action.hover',
                        borderRadius: isArtist ? '50%' : 2.5,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {imgUrl ? (
                        <Box
                          component="img"
                          src={imgUrl}
                          alt={name}
                          className="mtl-cover-img"
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <AlbumIcon color="disabled" />
                      )}

                      {(() => {
                        const { color: ratingColor, isHighlight, glow } = getRatingMeta(review.rating);
                        return (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 8,
                              right: 8,
                              bgcolor: 'rgba(0,0,0,0.84)',
                              backdropFilter: 'blur(6px)',
                              border: '1px solid',
                              borderColor: alpha(ratingColor, isHighlight ? 0.7 : 0.45),
                              color: ratingColor,
                              px: 0.9,
                              py: 0.35,
                              borderRadius: 1.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.4,
                              ...(isHighlight && { boxShadow: `0 0 12px ${glow(0.4)}` }),
                            }}
                          >
                            <StarIcon sx={{ fontSize: 13, color: ratingColor }} />
                            <Typography variant="caption" className="mtl-mono" fontWeight={800} sx={{ color: ratingColor }}>
                              {review.rating}
                            </Typography>
                          </Box>
                        );
                      })()}
                    </Box>
                    <Typography className="media-title" variant="body2" fontWeight={700} noWrap sx={{ transition: 'color 0.2s' }}>
                      {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {details?.artist || ''}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  {type !== 'artist' && <TableCell>Artista</TableCell>}
                  <TableCell>Gêneros</TableCell>
                  <TableCell align="center">Nota</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReviews.map((review) => {
                  const details = itemDetails[review.item_id];
                  const imgUrl = details?.imageUrl || review.item_image_url || '';
                  const name = details?.name || review.item_name || 'Item';
                  const linkTarget = `/${type}/${review.item_id}`;

                  return (
                    <TableRow key={review.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            component="img"
                            src={imgUrl}
                            alt={name}
                            sx={{ width: 40, height: 40, borderRadius: type === 'artist' ? '50%' : 1.5, objectFit: 'cover', bgcolor: 'action.hover' }}
                          />
                          <Typography
                            component={Link}
                            to={linkTarget}
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                          >
                            {name}
                          </Typography>
                        </Box>
                      </TableCell>
                      {type !== 'artist' && (
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {details?.artist || '—'}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 200 }}>
                          {details?.genres?.slice(0, 2).map((g) => (
                            <Chip key={g} label={g} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20, textTransform: 'capitalize' }} />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {(() => {
                          const { color: ratingColor, isHighlight, glow } = getRatingMeta(review.rating);
                          return (
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.4,
                                px: 1,
                                py: 0.25,
                                borderRadius: 1.5,
                                bgcolor: alpha(ratingColor, isHighlight ? 0.18 : 0.14),
                                border: '1px solid',
                                borderColor: alpha(ratingColor, isHighlight ? 0.55 : 0.3),
                                color: ratingColor,
                                ...(isHighlight && { boxShadow: `0 0 10px ${glow(0.3)}` }),
                              }}
                            >
                              <StarIcon sx={{ fontSize: 14, color: ratingColor }} />
                              <Typography variant="body2" className="mtl-mono" fontWeight={800} sx={{ color: ratingColor }}>
                                {review.rating}
                              </Typography>
                            </Box>
                          );
                        })()}
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
