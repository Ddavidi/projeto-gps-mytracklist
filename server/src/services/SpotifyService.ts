// Interface para definir a estrutura do nosso token guardado
interface SpotifyToken {
  accessToken: string;
  expiresAt: number; // Timestamp de quando o token expira
}

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private token: SpotifyToken | null = null;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || '';

    if (!this.clientId || !this.clientSecret) {
      console.error('ERRO CRÍTICO: As credenciais do Spotify (CLIENT_ID e CLIENT_SECRET) não estão definidas!');
      throw new Error('Credenciais do Spotify não configuradas.');
    }
  }

  // ==========================================
  // OAUTH 2.0 METHODS (User Authentication)
  // ==========================================

  public getAuthorizationUrl(state: string): string {
    const scope = 'playlist-read-private playlist-read-collaborative user-read-recently-played user-top-read';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope,
      redirect_uri: this.redirectUri,
      state
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  public async exchangeCodeForToken(code: string) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64')
      },
      body: new URLSearchParams({
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    if (!response.ok) {
      throw new Error('Falha ao trocar código por token no Spotify.');
    }

    return response.json();
  }

  public async refreshUserToken(refreshToken: string) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }).toString()
    });

    if (!response.ok) {
      throw new Error('Falha ao atualizar token do usuário.');
    }

    return response.json();
  }

  public async getValidUserAccessToken(userId: number, userController: any): Promise<string> {
    const userTokens = await userController.getSpotifyTokens(userId);
    if (!userTokens || !userTokens.spotify_access_token) {
      throw new Error('Usuário não possui conta Spotify vinculada.');
    }

    const expiresAt = new Date(userTokens.spotify_token_expires_at).getTime();
    
    // Se o token expira em menos de 1 minuto, renova
    if (Date.now() > expiresAt - 60000) {
      if (!userTokens.spotify_refresh_token) {
        throw new Error('Refresh token não encontrado. Necessário refazer o login no Spotify.');
      }

      console.log(`Renovando token do Spotify para o usuário ${userId}...`);
      const tokenData = await this.refreshUserToken(userTokens.spotify_refresh_token);
      
      const newAccessToken = tokenData.access_token;
      const newRefreshToken = tokenData.refresh_token || userTokens.spotify_refresh_token; // Às vezes a API não retorna novo refresh token
      const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      await userController.updateSpotifyTokens(userId, newAccessToken, newRefreshToken, newExpiresAt);
      return newAccessToken;
    }

    return userTokens.spotify_access_token;
  }

  // ==========================================
  // USER SPECIFIC API CALLS
  // ==========================================

  public async getUserPlaylists(accessToken: string) {
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar playlists');
    const data = await response.json();
    return data.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      imageUrl: item.images?.[0]?.url || '',
      tracksTotal: item.tracks?.total,
      owner: item.owner?.display_name,
      externalUrl: item.external_urls?.spotify
    }));
  }

  public async getPlaylistTracks(accessToken: string, playlistId: string) {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar músicas da playlist');
    const data = await response.json();
    return data.items
      .filter((item: any) => item.track)
      .map((item: any) => ({
        id: item.track.id,
        name: item.track.name,
        artist: item.track.artists?.map((a: any) => a.name).join(', '),
        album: item.track.album?.name,
        imageUrl: item.track.album?.images?.[0]?.url || '',
        durationMs: item.track.duration_ms,
        previewUrl: item.track.preview_url,
        externalUrl: item.track.external_urls?.spotify || '',
      }));
  }

  public async getUserRecentlyPlayed(accessToken: string) {
    const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar músicas recentes');
    const data = await response.json();
    return data.items.map((item: any) => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists?.map((a: any) => a.name).join(', '),
      album: item.track.album?.name,
      imageUrl: item.track.album?.images?.[0]?.url || '',
      playedAt: item.played_at,
      durationMs: item.track.duration_ms,
      previewUrl: item.track.preview_url,
    }));
  }

  public async getUserTopItems(accessToken: string, type: 'tracks' | 'artists', timeRange: 'short_term' | 'medium_term' | 'long_term') {
    const response = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${timeRange}&limit=20`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error(`Falha ao buscar top ${type}`);
    const data = await response.json();

    if (type === 'tracks') {
      return data.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        artist: item.artists?.map((a: any) => a.name).join(', '),
        album: item.album?.name,
        imageUrl: item.album?.images?.[0]?.url || '',
        durationMs: item.duration_ms,
        previewUrl: item.preview_url,
      }));
    } else {
      return data.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        imageUrl: item.images?.[0]?.url || '',
        genres: item.genres,
        popularity: item.popularity,
      }));
    }
  }

  // ==========================================
  // CLIENT CREDENTIALS API CALLS (Generic)
  // ==========================================

  /**
   * Verifica se o token atual ainda é válido.
   * Considera o token inválido se for expirar nos próximos 60 segundos para ter uma margem de segurança.
   */
  private isTokenValid(): boolean {
    return this.token ? this.token.expiresAt > Date.now() + 60 * 1000 : false;
  }

  /**
   * Contacta a API do Spotify para obter um novo token de acesso.
   */
  private async fetchNewToken(): Promise<void> {
    console.log('A obter um novo token de acesso do Spotify...');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Falha ao obter o token do Spotify:', errorBody);
      throw new Error('Falha ao obter o token do Spotify.');
    }

    const data = await response.json();

    this.token = {
      accessToken: data.access_token,
      // A API retorna 'expires_in' em segundos. Convertemos para um timestamp absoluto em milissegundos.
      expiresAt: Date.now() + (data.expires_in * 1000)
    };
    console.log('Novo token do Spotify obtido com sucesso!');
  }

  /**
   * Método público para obter um token de acesso válido.
   * Reutiliza o token guardado se ainda for válido, ou busca um novo se necessário.
   */
  public async getAccessToken(): Promise<string> {
    if (!this.isTokenValid()) {
      await this.fetchNewToken();
    }
    // O '!' no final diz ao TypeScript: "Eu garanto que this.token não é nulo aqui."
    return this.token!.accessToken;
  }

  // Cole este método dentro da classe SpotifyService,
// por exemplo, a seguir ao método getAccessToken()

  public async searchMulti(query: string, limit: number = 6) {
    const accessToken = await this.getAccessToken();

    const fetchSearch = async (type: string, qPrefix: string) => {
      // Add wildcard or just the exact word, but usually just prefixing works well
      const searchParams = new URLSearchParams({
        q: `${qPrefix}:${query}`,
        type,
        limit: limit.toString(),
      });
      const response = await fetch(`https://api.spotify.com/v1/search?${searchParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        console.error(`Falha ao pesquisar ${type} no Spotify:`, await response.text());
        return null;
      }
      return response.json();
    };

    const [trackData, albumData, artistData] = await Promise.all([
      fetchSearch('track', 'track'),
      fetchSearch('album', 'album'),
      fetchSearch('artist', 'artist')
    ]);

    const tracks = (trackData?.tracks?.items || []).map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists?.map((a: any) => a.name).join(', ') || '',
      album: track.album?.name || '',
      imageUrl: track.album?.images[0]?.url || '',
      durationMs: track.duration_ms,
      previewUrl: track.preview_url,
      externalUrl: track.external_urls?.spotify || '',
    }));

    const albums = (albumData?.albums?.items || []).map((album: any) => ({
      id: album.id,
      name: album.name,
      artist: album.artists?.map((a: any) => a.name).join(', ') || '',
      imageUrl: album.images[0]?.url || '',
      releaseDate: album.release_date ? album.release_date.substring(0, 4) : '',
      totalTracks: album.total_tracks,
      albumType: album.album_type,
    }));

    const artists = (artistData?.artists?.items || []).map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images[0]?.url || '',
      genres: artist.genres && artist.genres.length > 0 ? artist.genres.slice(0, 2).join(', ') : 'Artista',
      followers: artist.followers?.total || 0,
      popularity: artist.popularity,
    }));

    return { tracks, albums, artists };
  }

  public async searchTracks(query: string, limit: number = 20) {
    const multi = await this.searchMulti(query, limit);
    return multi.tracks;
  }

  public async getAlbumDetails(albumId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      console.error(`Falha ao obter detalhes do álbum ${albumId}:`, await response.text());
      throw new Error('Falha ao obter detalhes do álbum do Spotify.');
    }

    const album = await response.json();
    const artistId = album.artists?.[0]?.id;
    let artistImageUrl = '';
    
    if (artistId) {
      try {
        const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (artistRes.ok) {
          const artistData = await artistRes.json();
          artistImageUrl = artistData.images?.[0]?.url || '';
        }
      } catch (err) {
        console.error('Erro ao buscar foto do artista:', err);
      }
    }

    return {
      id: album.id,
      name: album.name,
      artist: album.artists?.map((a: any) => a.name).join(', ') || '',
      artistId: artistId,
      artistImageUrl: artistImageUrl,
      imageUrl: album.images[0]?.url || '',
      releaseDate: album.release_date || '',
      totalTracks: album.total_tracks,
      genres: album.genres || [],
      label: album.label,
      popularity: album.popularity,
      externalUrl: album.external_urls?.spotify,
      tracks: album.tracks?.items?.map((t: any) => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.map((a: any) => a.name).join(', ') || album.artists?.map((a: any) => a.name).join(', '),
        durationMs: t.duration_ms,
        trackNumber: t.track_number,
        previewUrl: t.preview_url,
      })) || [],
    };
  }

  public async getArtistDetails(artistId: string) {
    const accessToken = await this.getAccessToken();

    // Fetch artist profile, top tracks, and albums in parallel
    const [artistRes, topTracksRes, albumsRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?limit=50&include_groups=album,single`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    ]);

    if (!artistRes.ok) {
      console.error(`Falha ao obter detalhes do artista ${artistId}:`, await artistRes.text());
      throw new Error('Falha ao obter detalhes do artista no Spotify.');
    }

    const artist = await artistRes.json();
    const topTracksData = topTracksRes.ok ? await topTracksRes.json() : { tracks: [] };
    const albumsData = albumsRes.ok ? await albumsRes.json() : { items: [] };

    return {
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images[0]?.url || '',
      genres: artist.genres || [],
      followers: artist.followers?.total || 0,
      popularity: artist.popularity,
      externalUrl: artist.external_urls?.spotify,
      topTracks: (topTracksData.tracks || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.map((a: any) => a.name).join(', ') || artist.name,
        album: t.album?.name || '',
        imageUrl: t.album?.images[0]?.url || '',
        durationMs: t.duration_ms,
        previewUrl: t.preview_url,
      })),
      albums: (albumsData.items || []).map((al: any) => ({
        id: al.id,
        name: al.name,
        artist: artist.name,
        imageUrl: al.images[0]?.url || '',
        releaseDate: al.release_date ? al.release_date.substring(0, 4) : '',
        totalTracks: al.total_tracks,
        albumType: al.album_type,
      })),
    };
  }

  public async getTrackDetails(trackId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      console.error(`Falha ao obter detalhes da música ${trackId} do Spotify:`, await response.text());
      throw new Error('Falha ao obter detalhes da música do Spotify.');
    }

    const track = await response.json();
    const artistId = track.artists?.[0]?.id;
    let artistImageUrl = '';
    
    if (artistId) {
      try {
        const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (artistRes.ok) {
          const artistData = await artistRes.json();
          artistImageUrl = artistData.images?.[0]?.url || '';
        }
      } catch (err) {
        console.error('Erro ao buscar foto do artista:', err);
      }
    }

    return {
      id: track.id,
      name: track.name,
      artist: track.artists.map((artist: any) => artist.name).join(', '),
      artistId: artistId,
      artistImageUrl: artistImageUrl,
      album: track.album.name,
      albumId: track.album.id,
      imageUrl: track.album.images[0]?.url,
      releaseDate: track.album.release_date,
      durationMs: track.duration_ms,
      previewUrl: track.preview_url,
      popularity: track.popularity,
      externalUrl: track.external_urls.spotify,
    };
  }

  /**
   * Obtém detalhes de múltiplas músicas de uma só vez (batch).
   * A API do Spotify suporta até 50 IDs por chamada.
   * Resolve o problema N+1 ao listar avaliações.
   */
  public async getMultipleTracks(trackIds: string[]) {
    const validIds = trackIds.filter(id => id && id.trim() !== '');
    if (validIds.length === 0) return [];

    const accessToken = await this.getAccessToken();
    const ids = validIds.slice(0, 50).join(',');

    const response = await fetch(`https://api.spotify.com/v1/tracks?ids=${ids}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      console.error('Falha ao obter múltiplas músicas do Spotify:', await response.text());
      throw new Error('Falha ao obter múltiplas músicas do Spotify.');
    }

    const data = await response.json();
    const tracksWithData = data.tracks.filter((track: any) => track !== null);

    // Buscar gêneros dos artistas
    const artistIds = [...new Set(tracksWithData.map((t: any) => t.artists?.[0]?.id).filter(Boolean))] as string[];
    const artistMap: Record<string, any> = {};
    if (artistIds.length > 0) {
      const artists = await this.getMultipleArtists(artistIds);
      artists.forEach((a: any) => { artistMap[a.id] = a; });
    }

    return tracksWithData
      .map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map((artist: any) => artist.name).join(', '),
        album: track.album.name,
        imageUrl: track.album.images[0]?.url,
        durationMs: track.duration_ms,
        previewUrl: track.preview_url,
        popularity: track.popularity,
        externalUrl: track.external_urls.spotify,
        genres: track.artists?.[0]?.id && artistMap[track.artists[0].id] ? artistMap[track.artists[0].id].genres : [],
      }));
  }

  // =====================
  // Albums
  // =====================



  /**
   * Obtém detalhes de múltiplos álbuns de uma só vez (batch).
   * A API do Spotify suporta até 20 IDs por chamada.
   */
  public async getMultipleAlbums(albumIds: string[]) {
    const validIds = albumIds.filter(id => id && id.trim() !== '');
    if (validIds.length === 0) return [];

    const accessToken = await this.getAccessToken();
    const ids = validIds.slice(0, 20).join(',');

    const response = await fetch(`https://api.spotify.com/v1/albums?ids=${ids}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      console.error('Falha ao obter múltiplos álbuns do Spotify:', await response.text());
      throw new Error('Falha ao obter múltiplos álbuns do Spotify.');
    }

    const data = await response.json();
    const albumsWithData = data.albums.filter((album: any) => album !== null);

    // Buscar gêneros dos artistas
    const artistIds = [...new Set(albumsWithData.map((a: any) => a.artists?.[0]?.id).filter(Boolean))] as string[];
    const artistMap: Record<string, any> = {};
    if (artistIds.length > 0) {
      const artists = await this.getMultipleArtists(artistIds);
      artists.forEach((a: any) => { artistMap[a.id] = a; });
    }

    return albumsWithData
      .map((album: any) => ({
        id: album.id,
        name: album.name,
        artist: album.artists.map((a: any) => a.name).join(', '),
        imageUrl: album.images[0]?.url,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        albumType: album.album_type,
        externalUrl: album.external_urls.spotify,
        genres: album.artists?.[0]?.id && artistMap[album.artists[0].id] ? artistMap[album.artists[0].id].genres : [],
      }));
  }

  // =====================
  // Artists
  // =====================



  /**
   * Obtém detalhes de múltiplos artistas de uma só vez (batch).
   * A API do Spotify suporta até 50 IDs por chamada.
   */
  public async getMultipleArtists(artistIds: string[]) {
    const validIds = artistIds.filter(id => id && id.trim() !== '');
    if (validIds.length === 0) return [];

    const accessToken = await this.getAccessToken();
    const ids = validIds.slice(0, 50).join(',');

    const response = await fetch(`https://api.spotify.com/v1/artists?ids=${ids}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      console.error('Falha ao obter múltiplos artistas do Spotify:', await response.text());
      throw new Error('Falha ao obter múltiplos artistas do Spotify.');
    }

    const data = await response.json();
    return data.artists
      .filter((artist: any) => artist !== null)
      .map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        imageUrl: artist.images[0]?.url,
        genres: artist.genres,
        popularity: artist.popularity,
        followers: artist.followers?.total,
        externalUrl: artist.external_urls.spotify,
      }));
  }

  /**
   * Pesquisa músicas, álbuns e artistas no Spotify.
   * type pode ser 'track', 'album', 'artist' ou combinações como 'track,album,artist'
   */
  public async searchAll(query: string, types: string = 'track,album,artist', limit: number = 10) {
    const accessToken = await this.getAccessToken();

    const fetchSearch = async (type: string, qPrefix: string) => {
      const searchParams = new URLSearchParams({
        q: `${qPrefix}:${query}`,
        type,
        limit: limit.toString(),
        market: 'BR',
      });
      const response = await fetch(`https://api.spotify.com/v1/search?${searchParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        console.error(`Falha ao pesquisar ${type} no Spotify:`, await response.text());
        return null;
      }
      return response.json();
    };

    const typeArr = types.split(',');
    const promises = [];
    
    if (typeArr.includes('track')) promises.push(fetchSearch('track', 'track')); else promises.push(Promise.resolve(null));
    if (typeArr.includes('album')) promises.push(fetchSearch('album', 'album')); else promises.push(Promise.resolve(null));
    if (typeArr.includes('artist')) promises.push(fetchSearch('artist', 'artist')); else promises.push(Promise.resolve(null));

    const [trackData, albumData, artistData] = await Promise.all(promises);

    return {
      tracks: (trackData?.tracks?.items || []).map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        album: track.album.name,
        imageUrl: track.album.images[0]?.url,
        durationMs: track.duration_ms,
        previewUrl: track.preview_url,
      })),
      albums: (albumData?.albums?.items || []).map((album: any) => ({
        id: album.id,
        name: album.name,
        artist: album.artists.map((a: any) => a.name).join(', '),
        imageUrl: album.images[0]?.url,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        albumType: album.album_type,
      })),
      artists: (artistData?.artists?.items || []).map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        imageUrl: artist.images[0]?.url,
        genres: artist.genres,
        popularity: artist.popularity,
        followers: artist.followers?.total,
      })),
    };
  }

  /**
   * Obtém os "Em Alta" (Trending).
   * Neste caso, estamos usando os "New Releases" (lançamentos) do Brasil.
   */
  public async getTrending() {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://api.spotify.com/v1/browse/new-releases?limit=10&country=BR`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      console.error('Falha ao obter lançamentos (trending):', await response.text());
      return { albums: [] };
    }

    const data = await response.json();
    const albums = (data.albums?.items || []).map((album: any) => ({
      id: album.id,
      name: album.name,
      artist: album.artists?.map((a: any) => a.name).join(', ') || '',
      imageUrl: album.images?.[0]?.url || '',
      releaseDate: album.release_date ? album.release_date.substring(0, 4) : '',
      albumType: album.album_type,
    }));

    return { albums };
  }
}
