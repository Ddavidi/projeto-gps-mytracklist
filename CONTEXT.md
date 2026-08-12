# Contexto do Projeto: MyTrackList

## Resumo
Este documento serve como ponto de restauração de contexto para assistentes de IA (LLMs). Ele detalha a modernização arquitetural e o deploy do projeto "MyTrackList" realizado em Agosto de 2026.

## 1. Estado Original (Antes da Modernização)
- **Backend:** Node.js rodando obrigatoriamente com runtime `Bun`.
- **Banco de Dados:** `bun:sqlite` local (`database.sqlite`).
- **Autenticação:** Baseada em sessões com `express-session` e cookies (`httpOnly`, `sameSite: none`), o que impedia o funcionamento correto em deploys cross-origin.
- **Frontend:** React + Vite, consumindo a API local via Axios.
- **Problema de Performance:** Componente `ReviewItem.jsx` fazia requisições individuais N+1 para a API do Spotify (10 avaliações = 10 requests).
- **Hospedagem:** Nenhuma. Rodando apenas localmente.

## 2. A Modernização Arquitetural
A arquitetura foi inteiramente refatorada para o padrão Cloud-Ready:

### Banco de Dados (Supabase / PostgreSQL)
- Substituído `bun:sqlite` pela biblioteca `pg`.
- Nova classe `PostgresDatabase` implementando a interface `IDatabase`.
- Consultas SQL traduzidas (placeholders `?` migrados para `$1, $2`).
- Criação de tabelas agora usa sintaxe do Postgres (`SERIAL`, `TIMESTAMPTZ`).
- Banco de dados hospedado no **Supabase**.

### Autenticação (JWT)
- Substituído `express-session` por `jsonwebtoken`.
- Criado middleware `requireAuth` (`Authorization: Bearer <token>`).
- O frontend (`api.js` e `AuthContext.jsx`) agora guarda o JWT no `localStorage` e o injeta via Axios interceptor.
- Sistema reage automaticamente a erros `401` limpando o estado.

### Refatoração de Rotas (Backend)
- O arquivo monólito `index.ts` (272+ linhas) foi dividido em domínios lógicos:
  - `auth.routes.ts`
  - `review.routes.ts`
  - `spotify.routes.ts`
  - `user.routes.ts`

### Otimização de Performance (Spotify Batch)
- Criado endpoint `POST /api/v1/spotify/tracks/batch`.
- As páginas `ProfilePage` e `PublicProfilePage` agora buscam todas as reviews, extraem os IDs das músicas e fazem **um único request** (O(1)) para o backend, resolvendo o gargalo N+1.

### Reformulação do Cadastro e Correções no BD (Atualização Recente)
- **Correção Postgres:** As colunas em *camelCase* (`userId`, `trackId`, `createdAt`, `updatedAt`) receberam aspas duplas nas queries SQL para evitar que o PostgreSQL as lesse como minúsculas e retornasse erro 500 nas listagens e criações de avaliação.
- **Novas Colunas (Migrações):** Foram adicionadas colunas `email`, `name`, `gender` e `birth_date` à tabela `users` (via `ALTER TABLE` no startup da API) para suportar perfis mais completos.
- **Fluxo de Login Flexível (Identifier):** A interface de Autenticação (`LoginPage.jsx`) foi refatorada. O usuário pode inserir **Email ou Username** no primeiro passo. O backend (`POST /auth/check`) descobre automaticamente se a conta existe e valida visualmente a criação de senhas fortes com um checklist em tempo real, exigindo o aceite dos Termos de Uso.
- **Redesign da Home Page:** A Home Page agora possui dois estados. Para usuários não logados, atua como uma Landing Page elegante com barra de busca central. Para usuários logados, exibe o Feed Social com atividades recentes (extraído para `FeedList.jsx`). Em ambos os casos, a Home exibe um painel lateral de **"Em Alta"**, consumindo a rota pública `GET /spotify/trending`.

### Fluxo de Testes Locais (Atualização Recente)
- **Suporte a SQLite Local:** Para possibilitar o desenvolvimento sem afetar o banco Supabase (produção), o suporte ao SQLite foi reintroduzido no Node.js através da biblioteca `better-sqlite3`. Ao configurar `DB_TYPE=sqlite` no `.env`, a API gera um arquivo `database.sqlite` em vez de conectar-se remotamente.
- **Branch de Desenvolvimento:** Criada uma branch `development` para realizar e testar alterações localmente antes de realizar o merge para a branch `master` e acionar o deploy automático.

## 3. Infraestrutura e Deploy (Current State)
O projeto está 100% hospedado na nuvem gratuitamente, preparado para monetização futura.

- **Banco de Dados:** Supabase (Projeto: `mytracklist`). Usa o Connection Pooler IPv4 para evitar problemas de DNS Node.js.
- **Backend:** Render (Web Service Node). Configurado com `Dockerfile`, `render.yaml`, `npm install && npm run build` e comandos de start.
- **Frontend:** Cloudflare Pages (Projeto: `mytracklist-a54.pages.dev`).
  - Utilizado Cloudflare Pages em vez de Vercel para permitir **monetização futura com Google AdSense** sem quebrar termos de serviço.
  - Arquivo `public/_redirects` adicionado para suporte a navegação SPA (React Router).
  - Variável `VITE_API_URL` apontando para o Render + `/api/v1`.
  - Configuração de CORS no backend permitindo a origem do Cloudflare.

## 4. Funcionalidades Sociais e de Catálogo (Fase Recente)
- **Catálogo Expandido & Busca Avançada:** O backend e frontend agora suportam nativamente Músicas, Álbuns e Artistas (através do campo `item_type` e das novas rotas do SpotifyService).
  - A barra de pesquisa foi totalmente reformulada seguindo o estilo do AniList (menu dropdown em 3 colunas simultâneas: Músicas, Álbuns e Artistas) com links diretos para as novas páginas de Detalhes de Álbum e Artista.
  - Correção implementada nos endpoints em lote (`/batch`) para que a página de perfil exiba adequadamente álbuns e artistas.
- **Rede Social (AniList-style):**
  - Utilizadores podem seguir-se uns aos outros (`/social/follow`).
  - Feed social (`/feed`) que agrega as avaliações recentes das pessoas seguidas, com enriquecimento de dados em batch via Spotify API.
  - Seção "Following" nas páginas de detalhe (Música, Álbum, Artista), mostrando quais amigos já avaliaram aquele mesmo item e o que disseram.
  - Avaliações agora suportam campo de texto (`review_text`).
  - Atualização do banco Supabase/PostgreSQL com `try/catch` nativo para garantir compatibilidade com `pg` nas constraints únicas (resolvendo bug de *dollar-quoted string*).

## 5. Próximos Passos Atuais (Aguardando Design)
- **Redesign do Frontend (Figma):** O próximo grande passo é a reformulação total do design do frontend (estética premium, dark mode, animações dinâmicas). **[AGUARDANDO AÇÃO DO USER]**: O user deve fornecer os *prints/telas do Figma* no chat para que a implementação do CSS/UI possa começar.
- **Painel de Admin:** Retomar a criação do painel de administração e sistema de logs (`activity_logs` já existe no banco) futuramente.
- **Deploy de Produção:** Fazer merge da branch `development` para a `master` para refletir as novas funcionalidades (sociais, álbuns, artistas) nos servidores (Supabase/Render/Cloudflare) após o redesign estar concluído.
