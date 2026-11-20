import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  MenuItem,
  LinearProgress,
  Avatar,
  Chip,
  Grid,
  CircularProgress,
  InputAdornment,
  IconButton,
  alpha,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AlbumIcon from '@mui/icons-material/Album';
import BirthDateField from './BirthDateField';
import ImageCropperModal from './profile/ImageCropperModal';
import RatingInput from './RatingInput';
import api from '../services/api';
import { getTrending, searchMulti } from '../services/spotify';
import { saveReview } from '../services/reviews';
import { useAuth } from '../context/AuthContext';
import { MUSIC_GENRES } from '../constants/genres';

const TOTAL_STEPS = 4;

export default function OnboardingFlow({ onFinish }) {
  const { user, refreshUser, updateUserLocal } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Etapa 1: Perfil básico
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [birthDate, setBirthDate] = useState(user?.birth_date || '');
  const [bio, setBio] = useState(user?.bio || '');

  // Etapa 2: Fotos (Avatar & Capa)
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [coverPreview, setCoverPreview] = useState(user?.cover_url || '');
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [cropType, setCropType] = useState('avatar');
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Etapa 3: Gêneros favoritos
  const [selectedGenres, setSelectedGenres] = useState(user?.favorite_genres || []);

  // Etapa 4: Primeiro álbum
  const [albums, setAlbums] = useState([]);
  const [albumQuery, setAlbumQuery] = useState('');
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [pickedAlbum, setPickedAlbum] = useState(null);
  const [firstRating, setFirstRating] = useState(null);
  const [firstReviewText, setFirstReviewText] = useState('');

  useEffect(() => {
    if (step !== 4 || albums.length > 0) return;
    setLoadingAlbums(true);
    getTrending()
      .then((data) => setAlbums(data?.albums || []))
      .catch(() => {})
      .finally(() => setLoadingAlbums(false));
  }, [step, albums.length]);

  const handleSearchAlbums = async (e) => {
    e.preventDefault();
    if (!albumQuery.trim()) return;
    setLoadingAlbums(true);
    setError('');
    try {
      const res = await searchMulti(albumQuery.trim());
      setAlbums(res?.albums || []);
    } catch {
      setError('Não foi possível buscar álbuns agora.');
    } finally {
      setLoadingAlbums(false);
    }
  };

  const handleSaveStep1 = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {};
    if (name.trim()) payload.name = name.trim();
    if (gender) payload.gender = gender;
    if (birthDate) payload.birthDate = birthDate;
    if (bio.trim()) payload.bio = bio.trim();

    if (Object.keys(payload).length > 0) {
      setSaving(true);
      try {
        await api.put('/auth/profile', payload);
        updateUserLocal(payload);
      } catch (err) {
        setError(err.response?.data?.error || 'Erro ao salvar seus dados.');
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }
    setStep(2);
  };

  const handleFileSelected = (type) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropType(type);
    setCropFile(file);
    setCropOpen(true);
    e.target.value = '';
  };

  const handleCropDone = async (croppedFile) => {
    setCropOpen(false);
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', croppedFile);
      const endpoint = cropType === 'avatar' ? '/upload/avatar' : '/upload/cover';
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (cropType === 'avatar') {
        setAvatarPreview(res.data.url);
        updateUserLocal({ avatar_url: res.data.url });
      } else {
        setCoverPreview(res.data.url);
        updateUserLocal({ cover_url: res.data.url });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao enviar a imagem. Você pode tentar novamente ou pular.');
    } finally {
      setUploading(false);
    }
  };

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSaveGenres = async () => {
    setError('');
    if (selectedGenres.length > 0) {
      setSaving(true);
      try {
        await api.put('/auth/profile', { favoriteGenres: selectedGenres });
        updateUserLocal({ favorite_genres: selectedGenres });
      } catch {
        setError('Erro ao salvar gêneros favoritos.');
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }
    setStep(4);
  };

  const handleFinishWithReview = async () => {
    setError('');
    if (pickedAlbum && firstRating !== null) {
      setSaving(true);
      try {
        await saveReview('album', pickedAlbum.id, firstRating, firstReviewText.trim(), null, {
          itemName: pickedAlbum.name,
          itemImageUrl: pickedAlbum.imageUrl,
          itemPreviewUrl: null,
        });
      } catch (err) {
        setError(err.response?.data?.error || 'Falha ao salvar sua primeira avaliação.');
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }
    await refreshUser();
    onFinish();
  };

  const handleSkipAll = async () => {
    await refreshUser();
    onFinish();
  };

  const stepMeta = [
    {
      title: 'Apresente-se à comunidade',
      subtitle: 'Esses campos são opcionais — você pode editar ou completar tudo depois em Configurações.',
    },
    {
      title: 'Escolha sua foto e capa',
      subtitle: 'Deixe seu perfil com a sua identidade musical. Pode pular se quiser fazer depois.',
    },
    {
      title: 'O que você mais ouve?',
      subtitle: 'Selecione seus gêneros favoritos para exibir no seu perfil.',
    },
    {
      title: 'Avalie seu primeiro álbum',
      subtitle: 'Comece seu diário musical dando uma nota para um disco marcante — ou pule para explorar.',
    },
  ][step - 1];

  return (
    <Box className="mtl-reveal">
      {/* Barra de progresso limpa */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="caption" className="mtl-mono" color="primary" fontWeight={700}>
          Etapa {step} de {TOTAL_STEPS}
        </Typography>
        <Button size="small" color="inherit" onClick={handleSkipAll} sx={{ color: 'text.secondary', py: 0.25 }}>
          Terminar depois
        </Button>
      </Box>
      <LinearProgress
        variant="determinate"
        value={(step / TOTAL_STEPS) * 100}
        sx={{
          height: 5,
          borderRadius: 99,
          mb: 3,
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
          '& .MuiLinearProgress-bar': { borderRadius: 99 },
        }}
      />

      <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
        {stepMeta.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {stepMeta.subtitle}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

      {/* ETAPA 1: DADOS BÁSICOS */}
      {step === 1 && (
        <Box component="form" onSubmit={handleSaveStep1}>
          <TextField
            margin="normal"
            fullWidth
            label="Nome de exibição (opcional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como você quer aparecer no perfil"
          />
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                select
                label="Gênero (opcional)"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <MenuItem value="">Prefiro não informar</MenuItem>
                <MenuItem value="Homem">Homem</MenuItem>
                <MenuItem value="Mulher">Mulher</MenuItem>
                <MenuItem value="Não binário">Não binário</MenuItem>
                <MenuItem value="Outro">Outro</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <BirthDateField
                fullWidth
                label="Data de Nascimento (opcional)"
                value={birthDate}
                onChange={setBirthDate}
              />
            </Grid>
          </Grid>
          <TextField
            margin="normal"
            fullWidth
            multiline
            rows={2}
            label="Bio curta (opcional)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ex: Colecionando álbuns dos anos 90 e MPB..."
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, gap: 1.5 }}>
            <Button variant="text" color="inherit" onClick={() => setStep(2)} sx={{ color: 'text.secondary' }}>
              Pular etapa
            </Button>
            <Button type="submit" variant="contained" endIcon={<ArrowForwardIcon />} disabled={saving}>
              {saving ? 'Salvando...' : 'Continuar'}
            </Button>
          </Box>
        </Box>
      )}

      {/* ETAPA 2: AVATAR E CAPA */}
      {step === 2 && (
        <Box>
          <Box
            sx={{
              position: 'relative',
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
              mb: 3,
            }}
          >
            {/* Preview Capa */}
            <Box
              sx={{
                height: 140,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
                backgroundImage: coverPreview ? `url(${coverPreview})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                p: 1.5,
              }}
            >
              <Button
                size="small"
                variant="contained"
                startIcon={<WallpaperIcon />}
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.68)',
                  color: '#fff',
                  backdropFilter: 'blur(8px)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' },
                }}
              >
                {coverPreview ? 'Trocar capa' : 'Adicionar capa'}
              </Button>
            </Box>

            {/* Preview Avatar */}
            <Box sx={{ px: 2.5, pb: 2.5, mt: -5, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={avatarPreview}
                  sx={{
                    width: 88,
                    height: 88,
                    border: '4px solid',
                    borderColor: 'background.paper',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '2rem',
                    fontWeight: 700,
                  }}
                >
                  {(name || user?.username || 'M').charAt(0).toUpperCase()}
                </Avatar>
                <IconButton
                  size="small"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploading}
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <PhotoCameraIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ pb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {name || user?.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  @{user?.username}
                </Typography>
              </Box>
            </Box>
          </Box>

          {uploading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">Enviando imagem...</Typography>
            </Box>
          )}

          <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleFileSelected('avatar')} />
          <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleFileSelected('cover')} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
            <Button startIcon={<ArrowBackIcon />} variant="text" color="inherit" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="text" color="inherit" onClick={() => setStep(3)} sx={{ color: 'text.secondary' }}>
                Pular
              </Button>
              <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => setStep(3)} disabled={uploading}>
                Continuar
              </Button>
            </Box>
          </Box>

          <ImageCropperModal
            open={cropOpen}
            imageFile={cropFile}
            aspect={cropType === 'avatar' ? 1 : 16 / 6}
            onClose={() => setCropOpen(false)}
            onCropDone={handleCropDone}
          />
        </Box>
      )}

      {/* ETAPA 3: GÊNEROS FAVORITOS */}
      {step === 3 && (
        <Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {MUSIC_GENRES.map((genre) => {
              const active = selectedGenres.includes(genre);
              return (
                <Chip
                  key={genre}
                  label={genre}
                  clickable
                  icon={active ? <CheckIcon sx={{ fontSize: 16 }} /> : undefined}
                  onClick={() => toggleGenre(genre)}
                  color={active ? 'primary' : 'default'}
                  variant={active ? 'filled' : 'outlined'}
                  sx={{
                    py: 2,
                    px: 0.75,
                    transition: 'transform 0.16s ease, background-color 0.16s ease',
                    '&:active': { transform: 'scale(0.95)' },
                  }}
                />
              );
            })}
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            {selectedGenres.length === 0
              ? 'Nenhum gênero selecionado ainda (você pode pular se preferir).'
              : `${selectedGenres.length} ${selectedGenres.length === 1 ? 'gênero selecionado' : 'gêneros selecionados'}.`}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Button startIcon={<ArrowBackIcon />} variant="text" color="inherit" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="text" color="inherit" onClick={() => setStep(4)} sx={{ color: 'text.secondary' }}>
                Pular
              </Button>
              <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleSaveGenres} disabled={saving}>
                {saving ? 'Salvando...' : 'Continuar'}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* ETAPA 4: AVALIAR PRIMEIRO ÁLBUM */}
      {step === 4 && (
        <Box>
          {!pickedAlbum ? (
            <>
              <Box component="form" onSubmit={handleSearchAlbums} sx={{ mb: 2.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar um álbum ou artista (ex: Blonde, Clube da Esquina, IGOR...)"
                  value={albumQuery}
                  onChange={(e) => setAlbumQuery(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton type="submit" size="small" color="primary" aria-label="Buscar álbum">
                          <SearchIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {loadingAlbums ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <Grid container spacing={1.5} sx={{ maxHeight: 300, overflowY: 'auto', pr: 0.5 }}>
                  {albums.slice(0, 8).map((album) => (
                    <Grid size={{ xs: 6, sm: 3 }} key={album.id}>
                      <Box
                        onClick={() => {
                          setPickedAlbum(album);
                          setFirstRating(null);
                          setFirstReviewText('');
                        }}
                        className="mtl-album-card"
                        sx={{
                          cursor: 'pointer',
                          p: 1,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.default',
                          '&:hover': { borderColor: 'primary.main' },
                        }}
                      >
                        <Box
                          sx={{
                            width: '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: 1.5,
                            overflow: 'hidden',
                            bgcolor: 'action.hover',
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {album.imageUrl ? (
                            <Box
                              component="img"
                              src={album.imageUrl}
                              alt={album.name}
                              className="mtl-cover-img"
                              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <AlbumIcon color="disabled" />
                          )}
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
              )}
            </>
          ) : (
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                <Box
                  component="img"
                  src={pickedAlbum.imageUrl}
                  alt={pickedAlbum.name}
                  sx={{ width: 72, height: 72, borderRadius: 2, objectFit: 'cover' }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {pickedAlbum.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {pickedAlbum.artist}
                  </Typography>
                  <Button size="small" onClick={() => setPickedAlbum(null)} sx={{ p: 0, mt: 0.5, minWidth: 0 }}>
                    Trocar álbum
                  </Button>
                </Box>
              </Box>

              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Sua nota (0 a 10)
              </Typography>
              <Box sx={{ mb: 2 }}>
                <RatingInput value={firstRating} onChange={setFirstRating} />
              </Box>

              <TextField
                fullWidth
                multiline
                rows={2}
                label="Escreva sua primeira impressão (opcional)"
                placeholder="O que torna este álbum especial para você?"
                value={firstReviewText}
                onChange={(e) => setFirstReviewText(e.target.value)}
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
            <Button startIcon={<ArrowBackIcon />} variant="text" color="inherit" onClick={() => setStep(3)}>
              Voltar
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="text" color="inherit" onClick={handleSkipAll} sx={{ color: 'text.secondary' }}>
                Pular e entrar
              </Button>
              <Button
                variant="contained"
                onClick={handleFinishWithReview}
                disabled={saving || (pickedAlbum && firstRating === null)}
              >
                {saving
                  ? 'Salvando...'
                  : pickedAlbum
                    ? 'Publicar e começar'
                    : 'Entrar no MyTrackList'}
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
