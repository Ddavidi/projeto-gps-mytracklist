// Interface para definir a estrutura do nosso token guardado
interface SpotifyToken {
  accessToken: string;
  expiresAt: number; // Timestamp de quando o token expira
}

export class SpotifyApiError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.name = 'SpotifyApiError';
    this.status = status;
    this.code = code;
  }
}

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private token: SpotifyToken | null = null;
  private exploreCache: { data: any; expiresAt: number } | null = null;

  // ==========================================
  // SMART SEARCH & FUZZY RANKING HELPERS
  // ==========================================

  private normalizeText(str: string): string {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private stripEditionSuffix(str: string): string {
    return this.normalizeText(
      String(str || '').replace(/\s*[\(\[].*?[\)\]]/g, '').replace(/\s*-\s*(deluxe|remaster|anniversary|expanded|special|edition|bonus|live).*$/i, '')
    );
  }

  private levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let curr = i;
      for (let j = 1; j <= b.length; j++) {
        const temp = prev[j] ?? 0;
        const prevDiag = prev[j - 1] ?? 0;
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        prev[j] = Math.min(temp + 1, curr + 1, prevDiag + cost);
        curr = temp;
      }
      prev[0] = i;
    }
    return prev[b.length] ?? 0;
  }

  private similarityScore(a: string, b: string): number {
    if (!a || !b) return 0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return Math.max(0, 1 - this.levenshtein(a, b) / maxLen);
  }

  private rankSearchItem(query: string, name: string, secondary: string = '', popularity: number = 0, isCompilation: boolean = false): number {
    const q = this.normalizeText(query);
    const n = this.normalizeText(name);
    const base = this.stripEditionSuffix(name);
    const sec = this.normalizeText(secondary);
    const combined = `${n} ${sec}`.trim();

    if (!q) return popularity;

    let score = 0;

    // 1. Correspondência exata tem prioridade absoluta
    if (n === q) {
      score += 1200;
    } else if (base === q) {
      score += 1050;
    } else if (n.startsWith(q)) {
      score += 620;
    } else if (base.startsWith(q)) {
      score += 560;
    }

    // 2. Correspondência por palavras / tokens
    const qTokens = q.split(' ').filter(Boolean);
    const nameWords = n.split(' ').filter(Boolean);
    const allTokensInName = qTokens.every((t) => n.includes(t));
    const allTokensInCombined = qTokens.every((t) => combined.includes(t));

    if (qTokens.length > 0 && nameWords.includes(q)) {
      score += 360;
    }
    if (allTokensInName) {
      score += 280;
    } else if (allTokensInCombined) {
      score += 220;
    }

    // 3. Similaridade Fuzzy (tolera erros de digitação de 1-3 letras)
    const directSim = Math.max(this.similarityScore(q, n), this.similarityScore(q, base));
    score += Math.round(directSim * 320);

    // Melhor similaridade por palavra para queries curtas com typo
    if (qTokens.length === 1 && nameWords.length > 0) {
      const bestWordSim = Math.max(...nameWords.map((w) => this.similarityScore(q, w)));
      score += Math.round(bestWordSim * 220);
    }

    // 4. Popularidade do Spotify como desempate forte (evita covers/karaoke obscuros na frente)
    score += Math.min(100, Math.max(0, popularity || 0)) * 2.2;

    // 5. Penalidade para trilhas genéricas / tributos / karaoke quando não buscados explicitamente
    if (isCompilation && !q.includes('various') && !q.includes('soundtrack')) {
      score -= 140;
    }
    if ((n.includes('karaoke') || n.includes('tribute') || n.includes('lullaby')) && !q.includes('karaoke') && !q.includes('tribute')) {
      score -= 220;
    }
    if (n.includes('original motion picture') && !q.includes('motion picture') && !q.includes('christmas')) {
      score -= 90;
    }

    return score;
  }

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
    const scope = 'playlist-read-private playlist-read-collaborative user-read-recently-played user-top-read user-library-modify user-library-read user-modify-playback-state playlist-modify-public playlist-modify-private';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope,
      redirect_uri: this.redirectUri,
      state,
      show_dialog: 'true',
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
      const body = await response.text().catch(() => '');
      console.error('Spotify exchangeCodeForToken error:', response.status, body);
      throw new SpotifyApiError('Falha ao trocar código por token no Spotify.', response.status);
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
      const body = await response.text().catch(() => '');
      console.error('Spotify refreshUserToken error:', response.status, body);
      throw new SpotifyApiError(
        'Sua sessão com o Spotify expirou. Desvincule e conecte sua conta novamente em Configurações.',
        401,
        'SPOTIFY_REAUTH_REQUIRED'
      );
    }

    return response.json();
  }

  public async getValidUserAccessToken(userId: number, userController: any, forceRefresh: boolean = false): Promise<string> {
    const userTokens = await userController.getSpotifyTokens(userId);
    if (!userTokens || !userTokens.spotify_access_token) {
      throw new SpotifyApiError('Usuário não possui conta Spotify vinculada.', 404, 'SPOTIFY_NOT_LINKED');
    }

    const expiresAt = userTokens.spotify_token_expires_at
      ? new Date(userTokens.spotify_token_expires_at).getTime()
      : 0;
    const isExpired = !expiresAt || Number.isNaN(expiresAt) || Date.now() > expiresAt - 60000;

    if (forceRefresh || isExpired) {
      if (!userTokens.spotify_refresh_token) {
        throw new SpotifyApiError(
          'Token do Spotify expirado. Reconecte sua conta em Configurações > Conexões.',
          401,
          'SPOTIFY_REAUTH_REQUIRED'
        );
      }

      console.log(`Renovando token do Spotify para o usuário ${userId}...`);
      const tokenData = await this.refreshUserToken(userTokens.spotify_refresh_token);

      const newAccessToken = tokenData.access_token;
      const newRefreshToken = tokenData.refresh_token || userTokens.spotify_refresh_token;
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

      await userController.updateSpotifyTokens(userId, newAccessToken, newRefreshToken, newExpiresAt);
      return newAccessToken;
    }

    return userTokens.spotify_access_token;
  }

  /**
   * Executa uma chamada com o token do usuário. Se o Spotify responder 401,
   * força a renovação do token e tenta mais uma vez automaticamente.
   */
  public async withUserToken<T>(
    userId: number,
    userController: any,
    fn: (accessToken: string) => Promise<T>
  ): Promise<T> {
    const token = await this.getValidUserAccessToken(userId, userController, false);
    try {
      return await fn(token);
    } catch (err: any) {
      if (err instanceof SpotifyApiError && err.status === 401) {
        const refreshed = await this.getValidUserAccessToken(userId, userController, true);
        return await fn(refreshed);
      }
      throw err;
    }
  }

  private async handleSpotifyError(response: Response, fallbackMessage: string): Promise<never> {
    const rawBody = await response.text().catch(() => '');
    let spotifyMessage = '';
    try {
      const parsed = JSON.parse(rawBody);
      spotifyMessage = parsed?.error?.message || parsed?.error_description || '';
    } catch {
      spotifyMessage = rawBody.slice(0, 200);
    }

    console.error(`[Spotify API ${response.status}] ${fallbackMessage}:`, spotifyMessage || rawBody);

    if (response.status === 401) {
      throw new SpotifyApiError(
        'Sessão do Spotify expirada. Reconecte sua conta em Configurações > Conexões.',
        401,
        'SPOTIFY_REAUTH_REQUIRED'
      );
    }

    if (response.status === 403) {
      throw new SpotifyApiError(
        'O Spotify bloqueou o acesso aos dados desta conta (403). No Modo Desenvolvimento do Spotify, o e-mail da conta precisa estar autorizado no Spotify Developer Dashboard (User Management) e o app precisa ter permissões válidas.',
        403,
        'SPOTIFY_FORBIDDEN'
      );
    }

    if (response.status === 429) {
      throw new SpotifyApiError(
        'Limite de requisições do Spotify atingido temporariamente. Tente novamente em alguns instantes.',
        429,
        'SPOTIFY_RATE_LIMIT'
      );
    }

    throw new SpotifyApiError(
      spotifyMessage ? `${fallbackMessage}: ${spotifyMessage}` : fallbackMessage,
      response.status
    );
  }

  // ==========================================
  // USER SPECIFIC API CALLS
  // ==========================================

  public async getUserPlaylists(accessToken: string) {
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) await this.handleSpotifyError(response, 'Falha ao buscar playlists');
    const data = await response.json();
    return (data.items || [])
      .filter((item: any) => Boolean(item && item.id))
      .map((item: any) => ({
        id: item.id,
        name: item.name || 'Playlist sem nome',
        imageUrl: item.images?.[0]?.url || '',
        tracksTotal: item.items?.total ?? item.tracks?.total ?? 0,
        owner: item.owner?.display_name || item.owner?.id || '',
        externalUrl: item.external_urls?.spotify || ''
      }));
  }

  public async getPlaylistTracks(accessToken: string, playlistId: string) {
    // API 2026 migrou /tracks para /items; tentamos /items primeiro e fazemos fallback para /tracks
    let response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/items?limit=50`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (response.status === 404 || response.status === 400) {
      response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
    }

    if (!response.ok) await this.handleSpotifyError(response, 'Falha ao buscar músicas da playlist');
    const data = await response.json();
    return (data.items || [])
      .map((entry: any) => entry?.item || entry?.track)
      .filter((track: any) => Boolean(track && track.id))
      .map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.artists?.map((a: any) => a.name).join(', ') || '',
        album: track.album?.name || '',
        imageUrl: track.album?.images?.[0]?.url || '',
        durationMs: track.duration_ms || 0,
        previewUrl: track.preview_url || null,
        externalUrl: track.external_urls?.spotify || '',
      }));
  }

  public async getUserRecentlyPlayed(accessToken: string) {
    const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) await this.handleSpotifyError(response, 'Falha ao buscar músicas recentes');
    const data = await response.json();
    return (data.items || [])
      .filter((item: any) => Boolean(item && item.track && item.track.id))
      .map((item: any) => ({
        id: item.track.id,
        name: item.track.name,
        artist: item.track.artists?.map((a: any) => a.name).join(', ') || '',
        artistId: item.track.artists?.[0]?.id || null,
        album: item.track.album?.name || '',
        imageUrl: item.track.album?.images?.[0]?.url || '',
        playedAt: item.played_at,
        durationMs: item.track.duration_ms || 0,
        previewUrl: item.track.preview_url || null,
      }));
  }

  public async getUserTopItems(accessToken: string, type: 'tracks' | 'artists', timeRange: 'short_term' | 'medium_term' | 'long_term') {
    const response = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${timeRange}&limit=20`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) await this.handleSpotifyError(response, `Falha ao buscar top ${type}`);
    const data = await response.json();

    if (type === 'tracks') {
      return (data.items || [])
        .filter((item: any) => Boolean(item && item.id))
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          artist: item.artists?.map((a: any) => a.name).join(', ') || '',
          album: item.album?.name || '',
          imageUrl: item.album?.images?.[0]?.url || '',
          durationMs: item.duration_ms || 0,
          previewUrl: item.preview_url || null,
        }));
    } else {
      return (data.items || [])
        .filter((item: any) => Boolean(item && item.id))
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          imageUrl: item.images?.[0]?.url || '',
          genres: item.genres || [],
          popularity: item.popularity || 0,
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

  public async searchMulti(query: string, limit: number = 10) {
    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) return { tracks: [], albums: [], artists: [] };

    const accessToken = await this.getAccessToken();
    const fetchLimit = Math.min(25, Math.max(limit * 2, 18));

    const runSpotifySearch = async (q: string) => {
      const searchParams = new URLSearchParams({
        q,
        type: 'track,album,artist',
        limit: fetchLimit.toString(),
        market: 'BR',
      });
      const response = await fetch(`https://api.spotify.com/v1/search?${searchParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        console.error('Falha na busca Spotify:', await response.text());
        return null;
      }
      return response.json();
    };

    // 1. Busca principal natural (muito mais tolerante a typos que prefixos rígidos track:/album:)
    const primaryData = await runSpotifySearch(cleanQuery);

    let rawTracks: any[] = primaryData?.tracks?.items || [];
    let rawAlbums: any[] = primaryData?.albums?.items || [];
    let rawArtists: any[] = primaryData?.artists?.items || [];

    // 2. Fallback tolerante a erros de digitação se algum bucket veio fraco
    const normQuery = this.normalizeText(cleanQuery);
    const words = normQuery.split(' ').filter((w) => w.length >= 2);
    const needsFallback = rawTracks.length < 3 || rawAlbums.length < 3 || rawArtists.length < 2;

    if (needsFallback && normQuery.length >= 4) {
      const fallbackVariants: string[] = [];
      const firstWord = words[0];
      if (words.length === 1 && firstWord && firstWord.length >= 5) {
        // Ex: "nightmre" -> "nightm" ou "avengd" -> "aveng"
        fallbackVariants.push(firstWord.slice(0, Math.max(4, firstWord.length - 2)));
      } else if (words.length >= 2) {
        // Ex: "avenged sevenfol" -> busca pela palavra principal mais longa ou sem os 2 últimos chars
        const trimmedLast = words.map((w, idx) =>
          idx === words.length - 1 && w.length >= 4 ? w.slice(0, -1) : w
        ).join(' ');
        if (trimmedLast !== normQuery) fallbackVariants.push(trimmedLast);
        const longestWord = [...words].sort((a, b) => b.length - a.length)[0];
        if (longestWord && longestWord.length >= 4) fallbackVariants.push(longestWord);
      }

      if (fallbackVariants.length > 0) {
        const extraResults = await Promise.all(
          fallbackVariants.slice(0, 2).map((v) => runSpotifySearch(v).catch(() => null))
        );
        for (const extra of extraResults) {
          if (!extra) continue;
          if (extra.tracks?.items) rawTracks = [...rawTracks, ...extra.tracks.items];
          if (extra.albums?.items) rawAlbums = [...rawAlbums, ...extra.albums.items];
          if (extra.artists?.items) rawArtists = [...rawArtists, ...extra.artists.items];
        }
      }
    }

    // Deduplica por ID
    const dedupeById = (arr: any[]) => {
      const map = new Map<string, any>();
      for (const item of arr) {
        if (item?.id && !map.has(item.id)) map.set(item.id, item);
      }
      return Array.from(map.values());
    };

    const tracks = dedupeById(rawTracks)
      .map((track: any) => {
        const artistStr = track.artists?.map((a: any) => a.name).join(', ') || '';
        const isComp = artistStr.toLowerCase().includes('various artists');
        return {
          id: track.id,
          name: track.name,
          artist: artistStr,
          album: track.album?.name || '',
          imageUrl: track.album?.images?.[0]?.url || '',
          durationMs: track.duration_ms,
          previewUrl: track.preview_url,
          externalUrl: track.external_urls?.spotify || '',
          popularity: track.popularity || 0,
          _score: this.rankSearchItem(cleanQuery, track.name, artistStr, track.popularity || 0, isComp),
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);

    const albums = dedupeById(rawAlbums)
      .map((album: any) => {
        const artistStr = album.artists?.map((a: any) => a.name).join(', ') || '';
        const isComp = album.album_type === 'compilation' || artistStr.toLowerCase().includes('various artists');
        const bonusStudio = album.album_type === 'album' ? 45 : 0;
        return {
          id: album.id,
          name: album.name,
          artist: artistStr,
          imageUrl: album.images?.[0]?.url || '',
          releaseDate: album.release_date ? album.release_date.substring(0, 4) : '',
          totalTracks: album.total_tracks,
          albumType: album.album_type,
          _score: this.rankSearchItem(cleanQuery, album.name, artistStr, (album.popularity || 50), isComp) + bonusStudio,
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);

    const artists = dedupeById(rawArtists)
      .map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        imageUrl: artist.images?.[0]?.url || '',
        genres: artist.genres && artist.genres.length > 0 ? artist.genres.slice(0, 2).join(', ') : 'Artista',
        followers: artist.followers?.total || 0,
        popularity: artist.popularity || 0,
        _score: this.rankSearchItem(cleanQuery, artist.name, '', artist.popularity || 0, false),
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);

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
      console.warn('Batch getMultipleTracks falhou, usando fallback individual:', response.status);
      const individual = await Promise.all(
        validIds.slice(0, 20).map((id) => this.getTrackDetails(id).catch(() => null))
      );
      return individual.filter(Boolean).map((t: any) => ({ ...t, genres: [] }));
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
      console.warn('Batch getMultipleAlbums falhou, usando fallback individual:', response.status);
      const individual = await Promise.all(
        validIds.slice(0, 15).map((id) => this.getAlbumDetails(id).catch(() => null))
      );
      return individual.filter(Boolean);
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
      console.warn('Batch getMultipleArtists falhou, usando fallback individual:', response.status);
      const individual = await Promise.all(
        validIds.slice(0, 15).map(async (id) => {
          try {
            const res = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!res.ok) return null;
            const artist = await res.json();
            return {
              id: artist.id,
              name: artist.name,
              imageUrl: artist.images?.[0]?.url,
              genres: artist.genres || [],
              popularity: artist.popularity,
              followers: artist.followers?.total,
              externalUrl: artist.external_urls?.spotify,
            };
          } catch {
            return null;
          }
        })
      );
      return individual.filter(Boolean);
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
  public async searchAll(query: string, types: string = 'track,album,artist', limit: number = 12) {
    const multi = await this.searchMulti(query, limit);
    const typeArr = types.split(',');
    return {
      tracks: typeArr.includes('track') ? multi.tracks : [],
      albums: typeArr.includes('album') ? multi.albums : [],
      artists: typeArr.includes('artist') ? multi.artists : [],
    };
  }

  /**
   * Obtém os "Em Alta" (Trending).
   * Neste caso, estamos usando os "New Releases" (lançamentos) do Brasil.
   */
  public async getTrending() {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://api.spotify.com/v1/browse/new-releases?limit=12&country=BR`, {
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

  /**
   * Obtém os rankings e novidades do Spotify para a página Explorar:
   * - newReleases (Novidades / Lançamentos)
   * - topGlobal (Top Global / Mais escutadas da semana no mundo)
   * - topBrazil (Top Brasil / Mais escutadas da semana no Brasil)
   * - allTimeClassics (Mais escutadas da história)
   * Cache de 15 minutos em memória para performance e proteção de quota.
   */
  public async getExploreCharts() {
    if (this.exploreCache && this.exploreCache.expiresAt > Date.now()) {
      return this.exploreCache.data;
    }

    const accessToken = await this.getAccessToken();
    const currentYear = new Date().getFullYear();

    const formatTrack = (track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists?.map((a: any) => a.name).join(', ') || '',
      album: track.album?.name || '',
      albumId: track.album?.id || '',
      imageUrl: track.album?.images?.[0]?.url || '',
      popularity: track.popularity || 0,
      previewUrl: track.preview_url || null,
      releaseYear: track.album?.release_date ? track.album.release_date.substring(0, 4) : '',
    });

    const tryPlaylistTracks = async (playlistId: string, limit: number = 15) => {
      try {
        const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&market=BR`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.items || [])
          .map((i: any) => i?.track)
          .filter((t: any) => t && t.id && t.name)
          .map(formatTrack);
      } catch {
        return [];
      }
    };

    const searchTopTracks = async (q: string, market: string, limit: number = 25) => {
      try {
        const params = new URLSearchParams({ q, type: 'track', market, limit: String(limit) });
        const res = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.tracks?.items || [])
          .filter((t: any) => t && t.id && t.name)
          .map(formatTrack);
      } catch {
        return [];
      }
    };

    const dedupeAndSort = (tracks: any[], max: number = 12) => {
      const seen = new Set<string>();
      return tracks
        .filter((t) => {
          const key = `${t.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, max);
    };

    // 1. Novidades (New Releases)
    const trendingRes = await this.getTrending().catch(() => ({ albums: [] }));

    // 2. Top Global (tenta playlist oficial Top 50 Global -> fallback hits atuais globais ordenados por popularidade)
    let topGlobal = await tryPlaylistTracks('37i9dQZEVXbMDoHDwVN2tF', 15);
    if (topGlobal.length < 6) {
      const [g1, g2] = await Promise.all([
        searchTopTracks(`year:${currentYear - 1}-${currentYear}`, 'US', 25),
        searchTopTracks(`genre:pop year:${currentYear - 1}-${currentYear}`, 'US', 25),
      ]);
      topGlobal = dedupeAndSort([...g1, ...g2], 12);
    }

    // 3. Top Brasil (tenta playlist oficial Top 50 Brasil -> fallback hits atuais do Brasil)
    let topBrazil = await tryPlaylistTracks('37i9dQZEVXbMXbN3EUUhlg', 15);
    if (topBrazil.length < 6) {
      const [b1, b2, b3] = await Promise.all([
        searchTopTracks(`genre:sertanejo year:${currentYear - 1}-${currentYear}`, 'BR', 15),
        searchTopTracks(`genre:funk year:${currentYear - 1}-${currentYear}`, 'BR', 15),
        searchTopTracks(`genre:mpb OR genre:pagode OR genre:brazil year:${currentYear - 1}-${currentYear}`, 'BR', 15),
      ]);
      topBrazil = dedupeAndSort([...b1, ...b2, ...b3], 12);
    }

    // 4. Mais escutadas da história (maiores clássicos & streams históricos do Spotify)
    const [h1, h2, h3] = await Promise.all([
      searchTopTracks('Blinding Lights OR Shape of You OR Starboy OR As It Was', 'US', 15),
      searchTopTracks('Bohemian Rhapsody OR Smells Like Teen Spirit OR Hotel California OR Sweater Weather', 'US', 15),
      searchTopTracks('Someone You Loved OR Sunflower OR Believer OR One Dance', 'US', 15),
    ]);
    const allTimeClassics = dedupeAndSort([...h1, ...h2, ...h3], 12);

    const payload = {
      newReleases: (trendingRes.albums || []).slice(0, 12),
      topGlobal,
      topBrazil,
      allTimeClassics,
    };

    this.exploreCache = {
      data: payload,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };

    return payload;
  }

  // ==========================================
  // PLAYER CONTROL & LIBRARY METHODS
  // ==========================================

  /** Salva uma musica na biblioteca (Curtidas) do usuario */
  public async saveTrack(accessToken: string, trackId: string) {
    const uri = `spotify:track:${trackId}`;
    let response = await fetch(`https://api.spotify.com/v1/me/library?uris=${encodeURIComponent(uri)}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (response.status === 404 || response.status === 400) {
      response = await fetch(`https://api.spotify.com/v1/me/tracks`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [trackId] }),
      });
    }
    if (!response.ok) await this.handleSpotifyError(response, 'Falha ao salvar música na biblioteca');
    return { success: true };
  }

  /** Remove uma musica da biblioteca do usuario */
  public async unsaveTrack(accessToken: string, trackId: string) {
    const uri = `spotify:track:${trackId}`;
    let response = await fetch(`https://api.spotify.com/v1/me/library?uris=${encodeURIComponent(uri)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (response.status === 404 || response.status === 400) {
      response = await fetch(`https://api.spotify.com/v1/me/tracks`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [trackId] }),
      });
    }
    if (!response.ok) await this.handleSpotifyError(response, 'Falha ao remover música da biblioteca');
    return { success: true };
  }

  /** Verifica se uma musica esta salva na biblioteca */
  public async checkSavedTrack(accessToken: string, trackId: string): Promise<boolean> {
    const uri = `spotify:track:${trackId}`;
    let response = await fetch(`https://api.spotify.com/v1/me/library/contains?uris=${encodeURIComponent(uri)}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (response.status === 404 || response.status === 400) {
      response = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
    }
    if (!response.ok) return false;
    const data = await response.json();
    return Array.isArray(data) && data[0] === true;
  }

  /** Adiciona uma musica a fila do player ativo */
  public async addToQueue(accessToken: string, trackUri: string) {
    const response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackUri)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (response.status === 204) return { success: true };
    if (!response.ok) await this.handleSpotifyError(response, 'Falha ao adicionar à fila');
    return { success: true };
  }

  /** Adiciona uma musica a uma playlist especifica */
  public async addTrackToPlaylist(accessToken: string, playlistId: string, trackUri: string) {
    let response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [trackUri] }),
    });
    if (response.status === 404 || response.status === 400) {
      response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [trackUri] }),
      });
    }
    if (!response.ok) await this.handleSpotifyError(response, 'Falha ao adicionar música à playlist');
    return { success: true };
  }
}
