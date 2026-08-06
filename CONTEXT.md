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
- **Fluxo de Login em Etapas:** A interface de Autenticação foi unificada em `LoginPage.jsx` utilizando um fluxo de *Steps*:
  1. Input de Email (Verifica se já existe na base via endpoint `POST /auth/check-email`).
  2. Input de Senha (se o e-mail existir) ou Criação de Username + Senha Forte (mínimo de 10 caracteres, 1 letra e 1 número/símbolo).
  3. Preenchimento de perfil estendido (nome completo, gênero e data de nascimento via `PUT /auth/profile`).

## 3. Infraestrutura e Deploy (Current State)
O projeto está 100% hospedado na nuvem gratuitamente, preparado para monetização futura.

- **Banco de Dados:** Supabase (Projeto: `mytracklist`). Usa o Connection Pooler IPv4 para evitar problemas de DNS Node.js.
- **Backend:** Render (Web Service Node). Configurado com `Dockerfile`, `render.yaml`, `npm install && npm run build` e comandos de start.
- **Frontend:** Cloudflare Pages (Projeto: `mytracklist-a54.pages.dev`).
  - Utilizado Cloudflare Pages em vez de Vercel para permitir **monetização futura com Google AdSense** sem quebrar termos de serviço.
  - Arquivo `public/_redirects` adicionado para suporte a navegação SPA (React Router).
  - Variável `VITE_API_URL` apontando para o Render + `/api/v1`.
  - Configuração de CORS no backend permitindo a origem do Cloudflare.

## 4. Próximos Passos Possíveis (Para Continuar)
- **Painel de Admin:** O `AdminController.ts` antigo foi temporariamente deletado durante a migração para simplificar o foco. Retomar a criação do painel de administração e sistema de logs (`activity_logs` já existe no banco).
- **Domínio Próprio e Monetização:** Comprar um domínio `.com.br` e configurar no Cloudflare Pages para aplicar no Google AdSense.
- **Funcionalidades Sociais:** Seguir amigos, curtir avaliações de terceiros, listas temáticas.
