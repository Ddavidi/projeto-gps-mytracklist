# MyTrackList — Backend

API do MyTrackList, uma rede social para avaliar e catalogar músicas, álbuns e artistas
(no estilo Letterboxd), integrada ao Spotify. O frontend fica em [`../client`](../client).

## Tecnologias

- **Node.js 22** + **TypeScript** + **Express 4**
- **PostgreSQL** (driver `pg`), hospedado no Neon/Supabase
- **JWT** (`jsonwebtoken`) para autenticação — o token vai no header `Authorization: Bearer ...`
- **bcryptjs** para hash de senhas
- **Helmet**, **CORS** e **express-rate-limit** para segurança
- **Cloudinary** para upload de avatar e capa
- **Brevo** (API HTTP) para e-mails: código de cadastro, código de login e redefinição de senha
- **Spotify Web API** (catálogo, OAuth, playlists) e **Google Identity Services** (login com Google)
- **Vitest** para testes, contra um PostgreSQL de verdade

## Estrutura

```
src/
├── index.ts          # Monta o Express, middlewares e rotas (/api/v1/...)
├── controllers/      # Regras de negócio (usuários, reviews, social, listas, favoritos, admin...)
├── routes/           # Rotas HTTP de cada área
├── middleware/       # requireAuth (JWT) e requireAdmin
├── database/         # PostgresDatabase (produção) e SqliteDatabase (legado, fora do build)
├── factories/        # ControllerFactory: cria controllers e o schema do banco
├── services/         # SpotifyService
├── interfaces/       # IDatabase
└── utils/            # JWT, e-mail (Brevo), Cloudinary
tests/                # Testes Vitest (PostgreSQL real)
```

### Banco de dados

- O schema é criado automaticamente no boot por `ControllerFactory.initializeDatabase()`
  (`CREATE TABLE IF NOT EXISTS`). Não há migrations manuais: tabela nova entra ali.
- `PostgresDatabase` converte os placeholders `?` para `$1, $2...` e adiciona `RETURNING id`
  nos `INSERT`, devolvendo `lastInsertRowid` e `changes` como o SQLite fazia.

## Rotas principais (`/api/v1`)

| Prefixo | Conteúdo |
| :--- | :--- |
| `/auth` | Cadastro com código por e-mail, login com senha, **login com código por e-mail**, login com Google, redefinição de senha, `/me` |
| `/auth/spotify` | OAuth do Spotify |
| `/users` | Perfil, busca de usuários, troca de senha, notificações |
| `/reviews` | Avaliações (0 a 10), estatísticas, comentários, charts, diário e retrospectiva |
| `/social` | Seguir, pedidos de seguir (perfil privado), close friends, feed, compatibilidade de gosto |
| `/lists` | Listas personalizadas e curtidas |
| `/favorites`, `/listen-later` | Favoritos do perfil e "ouvir depois" |
| `/spotify` | Proxy do catálogo e ações na conta Spotify (curtidas, fila, playlists) |
| `/upload` | Avatar e capa (Cloudinary) |
| `/admin` | Painel administrativo (apenas admins) |

## Como rodar

```bash
npm install
cp .env.example .env   # preencha as variáveis (veja abaixo)
npm run dev            # desenvolvimento, com reload automático (tsx)
```

Produção (é o que o `Dockerfile` usado no Render faz):

```bash
npm run build && npm start
```

Ambientes, deploy e como rodar lendo do banco de dev: [`../DEPLOY_E_AMBIENTES.md`](../DEPLOY_E_AMBIENTES.md).

## Variáveis de ambiente

Modelo completo em [`.env.example`](.env.example).

| Variável | Para quê |
| :--- | :--- |
| `DATABASE_URL` | Connection string do PostgreSQL |
| `JWT_SECRET` | Assinatura dos tokens de login |
| `PORT`, `NODE_ENV`, `APP_ENV` | Porta e ambiente (`APP_ENV` separa dev de produção) |
| `FRONTEND_URL`, `ALLOWED_ORIGINS` | Links nos e-mails e origens liberadas no CORS |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` | Spotify |
| `GOOGLE_CLIENT_ID` | Confere se o token do "Entrar com Google" é deste app |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Uploads |
| `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` | Envio de e-mails. Sem a chave, em dev o código aparece no terminal |

## Segurança

- **Senhas:** bcrypt (custo 10). Contas criadas pelo Google não têm senha
  (`password_hash = '__GOOGLE_OAUTH__'`) e entram pelo Google ou por código no e-mail.
- **Códigos por e-mail** (cadastro e login): 6 dígitos, guardados só como hash SHA-256,
  válidos por 10 minutos, até 5 tentativas e reenvio a cada 45 segundos.
- **Rate limit:** global (2000 requisições / 15 min em produção) e mais restrito nas rotas de login
  (10 / 15 min).
- **Helmet** para headers de segurança e **CORS** limitado a `ALLOWED_ORIGINS`.

## Testes

Os testes usam [Vitest](https://vitest.dev) e rodam contra um **PostgreSQL de verdade**
(o mesmo banco de produção). Cobrem usuários (cadastro, login, senha), login com código,
avaliações, social (seguir, pedidos, close friends, privacidade) e listas.

- **Banco de teste:** definido em `TEST_DATABASE_URL`. O padrão é
  `postgresql://postgres:postgres@localhost:5432/mytracklist_test`.
  Por segurança, o nome do banco precisa conter `test`: antes de cada teste
  todas as tabelas são esvaziadas.
- **Rodar localmente com Docker:**

  ```bash
  docker run -d --name mytracklist-test-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mytracklist_test postgres:16
  ```

  Depois, `npm test` (ou `npm run test:watch` enquanto desenvolve).
- **CI:** o GitHub Actions sobe um serviço Postgres e roda `npm test` a cada push e
  pull request em `development` e `master`.

## Scripts de administração (desatualizados)

Os scripts em `scripts/admin/` são da versão antiga do projeto (Bun + SQLite) e **não funcionam**
com o código atual: chamam métodos que não existem mais no `AdminController`. Hoje a administração
é feita pelo painel `/admin` do frontend.
