# Contexto do Projeto MyTrackList

## Configuração de Variáveis de Ambiente

Ao configurar o projeto em uma nova máquina, preste atenção aos redirecionamentos do Spotify (OAuth). 

**Spotify Redirect URI**:
A API do Spotify muitas vezes falha ao autenticar callbacks se usar `localhost` quando a URL registrada é `127.0.0.1`. Certifique-se de que no `server/.env`, a variável seja:

```env
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/v1/auth/spotify/callback
```

Se o callback falhar com `redirect_uri: Not matching configuration`, verifique sempre se o `.env` do backend bate exatamente (incluindo o IP ao invés de localhost) com as URIs cadastradas na Dashboard do Spotify Developer.
