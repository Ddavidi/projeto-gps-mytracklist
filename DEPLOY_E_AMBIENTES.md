# 🗺️ Guia de Arquitetura, Hospedagem e Ambientes — MyTrackList

Este documento descreve onde cada serviço do **MyTrackList** fica hospedado, como manter **Dev** e **Produção** separados (com produção 100% limpa/sem dados cadastrados) e como rodar o aplicativo localmente sempre lendo da **Dev**.

---

## 📌 1. Visão Geral dos Ambientes

| Ambiente | Branch Git | Frontend (Vercel) | Backend (Render) | Banco PostgreSQL (Neon / Supabase) | Dados |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Produção (`prod`)** | `master` | [projeto-gps-mytracklist.vercel.app](https://projeto-gps-mytracklist.vercel.app) | `mytracklist-api` | Banco `mytracklist-prod` | **Zerado** (sem dados de teste) |
| **Desenvolvimento (`dev`)** | `development` | [projeto-gps-mytracklist-git-development-david-nunes-ribeiros-projects.vercel.app](https://projeto-gps-mytracklist-git-development-david-nunes-ribeiros-projects.vercel.app) *(Preview da branch)* | `mytracklist-api-dev` | Banco `mytracklist-dev` | Dados de desenvolvimento e testes |
| **Local (sua máquina)** | qualquer branch | `http://localhost:5173` | `http://localhost:3000` *(ou API `dev` direto)* | **Lê do banco `mytracklist-dev`** | Mesmos dados da `dev` |

> **Link da dev:** o Vercel dá a cada branch um endereço fixo no formato
> `<projeto>-git-<branch>-<escopo-do-time>.vercel.app`, que sempre aponta para o último deploy da branch.
> Se ele pedir login do Vercel ao abrir, é a *Deployment Protection* do projeto (padrão para Previews):
> dá para desligar em **Settings → Deployment Protection** se a dev precisar ser aberta por quem não tem conta no time.

> **Armazenamento de Imagens:** Cloudinary (`CLOUDINARY_*`)  
> **Catálogo & OAuth Musical:** Spotify Developer Dashboard (`SPOTIFY_*`)

---

## 🗄️ 2. Configurando os Bancos de Dados (Dev e Prod)

Recomendado usar **Neon** ou **Supabase** (ambos oferecem PostgreSQL gratuito sem expiração de 30 dias, diferente do Postgres Free do Render).

1. Crie **dois bancos/projetos separados**:
   - **`mytracklist-dev`** → usado pelo Render `mytracklist-api-dev` e pelo seu ambiente **local**.
   - **`mytracklist-prod`** → usado **apenas** pelo Render `mytracklist-api` (branch `master`).
2. Não é necessário rodar nenhum script manual de criação de tabelas nem seed: no primeiro boot, o backend executa `ControllerFactory.initializeDatabase()`, cria todas as tabelas vazias e deixa a **produção 100% sem nenhum dado cadastrado**.

---

## ☁️ 3. Configurando o Deploy na Nuvem (Dev + Prod)

### 3.1. Backend no Render (`render.yaml`)

O arquivo [render.yaml](file:///c:/Users/DD/Documents/DD/DEV/MyTrackList/projeto-gps-mytracklist/render.yaml) define os dois serviços Docker:
- `mytracklist-api` (branch `master` — **Produção**)
- `mytracklist-api-dev` (branch `development` — **Dev**)

Preencha as variáveis de ambiente de cada serviço no painel do Render:

| Variável | `mytracklist-api` (Prod) | `mytracklist-api-dev` (Dev) |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | `production` |
| `APP_ENV` | `production` | `development` |
| `DATABASE_URL` | Connection string do banco **`prod`** | Connection string do banco **`dev`** |
| `JWT_SECRET` | Gerado automaticamente pelo Render | Gerado automaticamente pelo Render |
| `FRONTEND_URL` | `https://projeto-gps-mytracklist.vercel.app` | `https://projeto-gps-mytracklist-git-development-david-nunes-ribeiros-projects.vercel.app` |
| `ALLOWED_ORIGINS` | `https://projeto-gps-mytracklist.vercel.app` | `https://projeto-gps-mytracklist-git-development-david-nunes-ribeiros-projects.vercel.app,http://localhost:5173` |
| `SPOTIFY_CLIENT_ID` | Client ID do Spotify | Client ID do Spotify |
| `SPOTIFY_CLIENT_SECRET` | Client Secret do Spotify | Client Secret do Spotify |
| `SPOTIFY_REDIRECT_URI` | `https://mytracklist-api.onrender.com/api/v1/auth/spotify/callback` | `https://mytracklist-api-dev.onrender.com/api/v1/auth/spotify/callback` |
| `CLOUDINARY_CLOUD_NAME` | Cloud Name | Cloud Name |
| `CLOUDINARY_API_KEY` | API Key | API Key |
| `CLOUDINARY_API_SECRET` | API Secret | API Secret |

> **Nota sobre `ALLOWED_ORIGINS` em Dev:** incluir `http://localhost:5173` na lista da API `dev` permite testar o frontend local apontando direto para a API `dev` no Render sem erro de CORS.

### 3.2. Frontend na Vercel

O arquivo [client/vercel.json](file:///c:/Users/DD/Documents/DD/DEV/MyTrackList/projeto-gps-mytracklist/client/vercel.json) já está configurado com rewrite para SPA (evita erro 404 ao dar F5 em rotas internas).

No painel da Vercel (com **Root Directory** = `client`):
1. **Production (`master`):**
   - `VITE_API_URL` = `https://mytracklist-api.onrender.com/api/v1`
2. **Preview / Branch `development`:**
   - `VITE_API_URL` = `https://mytracklist-api-dev.onrender.com/api/v1`

### 3.3. Spotify Developer Dashboard

Em **Edit Settings → Redirect URIs**, cadastre as **três** URLs de callback:
- `https://mytracklist-api.onrender.com/api/v1/auth/spotify/callback` *(Prod)*
- `https://mytracklist-api-dev.onrender.com/api/v1/auth/spotify/callback` *(Dev)*
- `http://127.0.0.1:3000/api/v1/auth/spotify/callback` *(Local)*

---

## 💻 4. Como Rodar Localmente (Lendo da Dev)

Tudo que você rodar localmente deve ler do ambiente **Dev**, nunca de Produção. Há duas formas:

### Forma A — Backend local + Frontend local lendo do banco PostgreSQL de Dev *(recomendada para mexer no backend e frontend)*

1. Em `server/.env` (use [server/.env.example](file:///c:/Users/DD/Documents/DD/DEV/MyTrackList/projeto-gps-mytracklist/server/.env.example) como base):
   - **Remova** `DB_TYPE=sqlite` (sem `DB_TYPE`, o servidor usa PostgreSQL automaticamente com SSL para bancos remotos).
   - Configure `DATABASE_URL` com a connection string do banco **`mytracklist-dev`**.
   - Configure `FRONTEND_URL=http://localhost:5173` e `SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/v1/auth/spotify/callback`.
2. Em `client/.env`:
   ```env
   VITE_API_URL=http://localhost:3000/api/v1
   ```
3. Suba os dois terminais:
   ```bash
   # Terminal 1 — Backend
   cd server && npm install && npm run dev

   # Terminal 2 — Frontend
   cd client && npm install && npm run dev
   ```

### Forma B — Apenas Frontend local consumindo a API de Dev no Render *(mais rápida se só for mexer no visual)*

1. Em `client/.env`:
   ```env
   VITE_API_URL=https://mytracklist-api-dev.onrender.com/api/v1
   ```
2. Suba apenas o frontend:
   ```bash
   cd client && npm install && npm run dev
   ```

---

## 🧪 5. Checklist Rápido de Validação

1. **Health Check (Dev e Prod):**
   - `GET /api/v1/health` deve retornar `200 OK` com:
     ```json
     { "status": "ok", "database": "connected", "environment": "production", "timestamp": "..." }
     ```
2. **Produção limpa:**
   - Após o deploy inicial de `master`, acesse a Home de produção e confirme que não há usuários nem reviews cadastrados.
3. **Recarregar página (SPA):**
   - Navegue para uma rota interna (ex: `/login` ou `/profile/usuario`) na Vercel e aperte **F5** — não deve dar 404.
4. **Cadastro, Login e Reviews:**
   - Teste na **Dev** (não cadastre dados de teste em Prod).
5. **OAuth do Spotify:**
   - Em `/settings`, conecte a conta Spotify e valide se o retorno redireciona para o domínio correto (`FRONTEND_URL`) e não para `localhost`.
6. **Upload de Avatar/Capa:**
   - Edite o perfil na **Dev** para confirmar o upload no Cloudinary.
