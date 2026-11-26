import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Chip,
  Avatar,
  Select,
  MenuItem,
  Divider,
  alpha,
} from '@mui/material';
import { Link } from 'react-router-dom';
import RepeatIcon from '@mui/icons-material/Repeat';
import StarIcon from '@mui/icons-material/Star';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import { getUserDiary, getUserWrapped } from '../../services/reviews';
import { formatCalendarDate } from '../../utils/date';
import { getRatingColor } from '../../utils/ratingColor';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function ProfileDiaryWrapped({ userId }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [diary, setDiary] = useState([]);
  const [wrapped, setWrapped] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([getUserDiary(userId), getUserWrapped(userId, year)])
      .then(([diaryEntries, wrappedData]) => {
        setDiary(diaryEntries || []);
        setWrapped(wrappedData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, year]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  const maxMonthCount = Math.max(...(wrapped?.monthly || []).map((m) => m.count), 1);

  return (
    <Box>
      {/* Retrospectiva Anual (Wrapped) */}
      <Paper
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          mb: 4,
          borderRadius: 3.5,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.22),
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoGraphIcon color="primary" />
            <Typography variant="h5">Retrospectiva {year}</Typography>
          </Box>
          <Select size="small" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>
        </Box>

        {!wrapped || wrapped.total === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nenhum registro no diário para {year}. Avalie álbuns ou faixas para construir sua retrospectiva!
          </Typography>
        ) : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                {[
                  { label: 'Registros', value: wrapped.total },
                  { label: 'Média Geral', value: `${wrapped.avgRating}/10` },
                  { label: 'Álbuns', value: wrapped.albumsCount },
                  { label: 'Re-audições', value: wrapped.relistensCount },
                ].map((stat) => (
                  <Grid size={{ xs: 6 }} key={stat.label}>
                    <Box sx={{ p: 1.75, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" display="block">{stat.label}</Typography>
                      <Typography variant="h5" className="mtl-mono" fontWeight={800} color="primary">
                        {stat.value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              {/* Gráfico mensal de atividade */}
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 1.5 }}>
                Ritmo mensal de audições
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, height: 96, mb: 3 }}>
                {wrapped.monthly.map((m) => (
                  <Box key={m.month} sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: '100%',
                        maxWidth: 22,
                        height: `${Math.max((m.count / maxMonthCount) * 100, 8)}%`,
                        bgcolor: m.count > 0 ? 'primary.main' : (theme) => alpha(theme.palette.text.primary, 0.1),
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                    <Typography variant="caption" className="mtl-mono" color="text.secondary" sx={{ fontSize: '0.62rem', mt: 0.5 }}>
                      {MONTH_NAMES[m.month - 1]}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {wrapped.topAlbums?.length > 0 && (
                <>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 1 }}>
                    Álbuns destaque do ano
                  </Typography>
                  <Grid container spacing={1.25}>
                    {wrapped.topAlbums.map((alb) => (
                      <Grid size={{ xs: 6, sm: 3 }} key={alb.id}>
                        <Box
                          component={Link}
                          to={`/album/${alb.item_id}`}
                          sx={{ display: 'block', textDecoration: 'none', color: 'inherit', '&:hover': { color: 'primary.main' } }}
                        >
                          <Box
                            component="img"
                            src={alb.item_image_url}
                            alt={alb.item_name}
                            sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 2, mb: 0.5, bgcolor: 'action.hover' }}
                          />
                          <Typography variant="caption" fontWeight={700} noWrap display="block">
                            {alb.item_name}
                          </Typography>
                          <Typography variant="caption" className="mtl-mono" fontWeight={800} sx={{ color: getRatingColor(alb.rating) }}>
                            {alb.rating}/10
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Linha do Tempo do Diário Musical */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CalendarMonthOutlinedIcon color="primary" fontSize="small" />
        <Typography variant="h6">Diário de Audições</Typography>
      </Box>

      {diary.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Seu diário ainda está vazio. Cada álbum ou faixa avaliada aparece registrada aqui por data.
        </Typography>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {diary.map((entry, idx) => (
            <React.Fragment key={entry.id}>
              {idx > 0 && <Divider />}
              <Box
                component={Link}
                to={`/${entry.item_type || 'track'}/${entry.item_id}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: { xs: 2, sm: 3 },
                  py: 1.75,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background-color 0.16s ease',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography variant="caption" className="mtl-mono" color="text.secondary" sx={{ minWidth: 82 }}>
                  {formatCalendarDate(entry.diary_date)}
                </Typography>
                <Avatar variant="rounded" src={entry.item_image_url} sx={{ width: 44, height: 44 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {entry.item_name || 'Item'}
                    </Typography>
                    {entry.is_relisten && <RepeatIcon color="primary" sx={{ fontSize: 15 }} />}
                  </Box>
                  {entry.review_text && (
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {entry.has_spoiler ? '(Contém spoiler)' : entry.review_text}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: getRatingColor(entry.rating) }}>
                  <StarIcon sx={{ fontSize: 16, color: getRatingColor(entry.rating) }} />
                  <Typography variant="body2" className="mtl-mono" fontWeight={800} sx={{ color: getRatingColor(entry.rating) }}>
                    {entry.rating}
                  </Typography>
                </Box>
              </Box>
            </React.Fragment>
          ))}
        </Paper>
      )}
    </Box>
  );
}

