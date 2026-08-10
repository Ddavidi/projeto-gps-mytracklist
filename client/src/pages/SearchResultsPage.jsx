import React, { useState, useEffect } from 'react';
import { useSearchParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { searchMulti } from '../services/spotify';
import { 
  Container, 
  Typography, 
  Box, 
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Avatar, 
  CircularProgress,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import PersonIcon from '@mui/icons-material/Person';
import SearchBar from '../components/SearchBar';

function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q');

  const [results, setResults] = useState({ tracks: [], albums: [], artists: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setResults({ tracks: [], albums: [], artists: [] });
        return;
      }

      setLoading(true);
      setError('');
      try {
        const res = await searchMulti(query);
        setResults(res || { tracks: [], albums: [], artists: [] });
      } catch (err) {
        setError('Falha ao pesquisar no Spotify. Tente novamente.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const handleSearch = (newQuery) => {
    navigate(`/search?q=${encodeURIComponent(newQuery)}`);
  };

  const hasData = 
    (results.tracks && results.tracks.length > 0) ||
    (results.albums && results.albums.length > 0) ||
    (results.artists && results.artists.length > 0);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <SearchBar onSearch={handleSearch} />
      </Box>

      {query && (
        <Typography variant="h4" fontWeight="bold" align="center" gutterBottom sx={{ mb: 4 }}>
          Resultados para "{query}"
        </Typography>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress size={48} />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      {!loading && !error && !hasData && query && (
        <Typography align="center" color="text.secondary" sx={{ my: 4 }}>
          Nenhum resultado encontrado para "{query}". Tente buscar por outros termos.
        </Typography>
      )}

      {!loading && !error && hasData && (
        <Grid container spacing={3}>
          {/* Column 1: Músicas */}
          <Grid size={{ xs: 12, md: 4 }}>
            <PaperCardHeader icon={<MusicNoteIcon color="primary" />} title="MÚSICAS" />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {results.tracks?.map((track) => (
                <Card 
                  key={track.id} 
                  elevation={2} 
                  sx={{ 
                    borderRadius: 2.5,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                  }}
                >
                  <CardActionArea component={RouterLink} to={`/music/${track.id}`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
                      <Avatar
                        variant="square"
                        src={track.imageUrl}
                        alt={track.name}
                        sx={{ width: 56, height: 56, borderRadius: 2, mr: 2 }}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap>
                          {track.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {track.artist}
                        </Typography>
                        {track.album && (
                          <Typography variant="caption" color="text.disabled" noWrap display="block">
                            Álbum: {track.album}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardActionArea>
                </Card>
              ))}
              {(!results.tracks || results.tracks.length === 0) && (
                <Typography color="text.secondary" variant="body2">
                  Nenhuma música encontrada.
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Column 2: Álbuns */}
          <Grid size={{ xs: 12, md: 4 }}>
            <PaperCardHeader icon={<AlbumIcon color="secondary" />} title="ÁLBUNS" />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {results.albums?.map((album) => (
                <Card 
                  key={album.id} 
                  elevation={2} 
                  sx={{ 
                    borderRadius: 2.5,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                  }}
                >
                  <CardActionArea component={RouterLink} to={`/album/${album.id}`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
                      <Avatar
                        variant="square"
                        src={album.imageUrl}
                        alt={album.name}
                        sx={{ width: 56, height: 56, borderRadius: 2, mr: 2 }}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap>
                          {album.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {album.artist}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {album.releaseDate ? `${album.releaseDate} • ` : ''}{album.totalTracks} faixas
                        </Typography>
                      </Box>
                    </Box>
                  </CardActionArea>
                </Card>
              ))}
              {(!results.albums || results.albums.length === 0) && (
                <Typography color="text.secondary" variant="body2">
                  Nenhum álbum encontrado.
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Column 3: Artistas */}
          <Grid size={{ xs: 12, md: 4 }}>
            <PaperCardHeader icon={<PersonIcon color="success" />} title="ARTISTAS" />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {results.artists?.map((artist) => (
                <Card 
                  key={artist.id} 
                  elevation={2} 
                  sx={{ 
                    borderRadius: 2.5,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                  }}
                >
                  <CardActionArea component={RouterLink} to={`/artist/${artist.id}`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
                      <Avatar
                        src={artist.imageUrl}
                        alt={artist.name}
                        sx={{ width: 56, height: 56, mr: 2 }}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap>
                          {artist.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {artist.genres || 'Artista'}
                        </Typography>
                        {artist.followers > 0 && (
                          <Typography variant="caption" color="text.disabled">
                            {artist.followers.toLocaleString('pt-BR')} seguidores
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardActionArea>
                </Card>
              ))}
              {(!results.artists || results.artists.length === 0) && (
                <Typography color="text.secondary" variant="body2">
                  Nenhum artista encontrado.
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

function PaperCardHeader({ icon, title }) {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2, 
        pb: 1, 
        borderBottom: '2px solid', 
        borderColor: 'divider' 
      }}
    >
      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography variant="h6" fontWeight="bold" letterSpacing={0.5}>
        {title}
      </Typography>
    </Box>
  );
}

export default SearchResultsPage;
