// Interface para definir a estrutura do nosso token guardado
interface SpotifyToken {
  accessToken: string;
  expiresAt: number; // Timestamp de quando o token expira
}

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private token: SpotifyToken | null = null;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      console.error('ERRO CRÍTICO: As credenciais do Spotify (CLIENT_ID e CLIENT_SECRET) não estão definidas!');
      throw new Error('Credenciais do Spotify não configuradas.');
    }
  }

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

  public async searchTracks(query: string, limit: number = 20) {
    const accessToken = await this.getAccessToken();
    
    // Constrói os parâmetros da URL de forma segura
    const searchParams = new URLSearchParams({
      q: query,
      type: 'track',
      limit: limit.toString(),
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      console.error('Falha ao procurar músicas no Spotify:', await response.text());
      throw new Error('Falha ao procurar músicas no Spotify.');
    }

    const data = await response.json();
    
    // Vamos simplificar os dados antes de os enviar para o front-end
    return data.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map((artist: any) => artist.name).join(', '),
      album: track.album.name,
      imageUrl: track.album.images[0]?.url, // Pega a primeira imagem (maior) se existir
      durationMs: track.duration_ms,
      previewUrl: track.preview_url,
    }));
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

    return {
      id: track.id,
      name: track.name,
      artist: track.artists.map((artist: any) => artist.name).join(', '),
      album: track.album.name,
      imageUrl: track.album.images[0]?.url,
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
    return data.tracks
      .filter((track: any) => track !== null)
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
      }));
  }

  // =====================
  // Albums
  // =====================

  /**
   * Obtém detalhes de um álbum específico.
   */
  public async getAlbumDetails(albumId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      console.error(`Falha ao obter detalhes do álbum ${albumId}:`, await response.text());
      throw new Error('Falha ao obter detalhes do álbum do Spotify.');
    }

    const album = await response.json();
    return {
      id: album.id,
      name: album.name,
      artist: album.artists.map((a: any) => a.name).join(', '),
      artistIds: album.artists.map((a: any) => a.id),
      imageUrl: album.images[0]?.url,
      releaseDate: album.release_date,
      totalTracks: album.total_tracks,
      albumType: album.album_type,
      popularity: album.popularity,
      externalUrl: album.external_urls.spotify,
      tracks: album.tracks?.items?.map((t: any) => ({
        id: t.id,
        name: t.name,
        trackNumber: t.track_number,
        durationMs: t.duration_ms,
        previewUrl: t.preview_url,
      })) || [],
    };
  }

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
    return data.albums
      .filter((album: any) => album !== null)
      .map((album: any) => ({
        id: album.id,
        name: album.name,
        artist: album.artists.map((a: any) => a.name).join(', '),
        imageUrl: album.images[0]?.url,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        albumType: album.album_type,
        externalUrl: album.external_urls.spotify,
      }));
  }

  // =====================
  // Artists
  // =====================

  /**
   * Obtém detalhes de um artista específico.
   */
  public async getArtistDetails(artistId: string) {
    const accessToken = await this.getAccessToken();

    const [artistRes, topTracksRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=BR`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
    ]);

    if (!artistRes.ok) {
      console.error(`Falha ao obter detalhes do artista ${artistId}:`, await artistRes.text());
      throw new Error('Falha ao obter detalhes do artista do Spotify.');
    }

    const artist = await artistRes.json();
    const topTracksData = topTracksRes.ok ? await topTracksRes.json() : { tracks: [] };

    return {
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images[0]?.url,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers?.total,
      externalUrl: artist.external_urls.spotify,
      topTracks: topTracksData.tracks.slice(0, 5).map((t: any) => ({
        id: t.id,
        name: t.name,
        album: t.album.name,
        imageUrl: t.album.images[0]?.url,
        durationMs: t.duration_ms,
        previewUrl: t.preview_url,
      })),
    };
  }

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

    const searchParams = new URLSearchParams({
      q: query,
      type: types,
      limit: limit.toString(),
      market: 'BR',
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${searchParams.toString()}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      console.error('Falha ao pesquisar no Spotify:', await response.text());
      throw new Error('Falha ao pesquisar no Spotify.');
    }

    const data = await response.json();

    return {
      tracks: (data.tracks?.items || []).map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        album: track.album.name,
        imageUrl: track.album.images[0]?.url,
        durationMs: track.duration_ms,
        previewUrl: track.preview_url,
      })),
      albums: (data.albums?.items || []).map((album: any) => ({
        id: album.id,
        name: album.name,
        artist: album.artists.map((a: any) => a.name).join(', '),
        imageUrl: album.images[0]?.url,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        albumType: album.album_type,
      })),
      artists: (data.artists?.items || []).map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        imageUrl: artist.images[0]?.url,
        genres: artist.genres,
        popularity: artist.popularity,
        followers: artist.followers?.total,
      })),
    };
  }
}
