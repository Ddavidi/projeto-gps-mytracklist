# MyTrackList Mobile App (Android & iOS)

O projeto **MyTrackList** agora conta com suporte híbrido nativo via **Capacitor** (além de **PWA instalável** direto no navegador do Android e iPhone) com navegação inferior nativa (`MobileBottomNav`), safe-areas para iPhone/Android e barra superior inteligente (Headroom).

---

## 1. Como instalar agora mesmo no celular (PWA — Android & iPhone)
- **Android (Chrome):** Abra o site -> Menu (`⋮`) -> **"Instalar aplicativo"** / **"Adicionar à tela inicial"**.
- **iPhone (Safari):** Abra o site -> Botão Compartilhar (`↑`) -> **"Adicionar à Tela de Início"**.

O app abre em tela cheia (`standalone`), sem barra de endereço, com ícone próprio e navegação inferior igual aplicativo nativo.

---

## 2. Como gerar o Aplicativo Nativo (Play Store / App Store) com Capacitor

### Pré-requisitos
- **Android:** Android Studio instalado (para gerar APK / AAB).
- **iPhone (iOS):** macOS com Xcode instalado (para gerar IPA / enviar à App Store).

### Comandos (a partir da pasta `client/`)

```bash
cd client

# 1. Compilar o frontend para produção
npm run build

# 2. Adicionar plataformas nativas (apenas na primeira vez)
npx cap add android
npx cap add ios

# 3. Sincronizar alterações web -> projetos nativos
npm run cap:sync

# 4. Abrir no Android Studio ou Xcode para rodar no celular / gerar APK/IPA
npm run mobile:android
npm run mobile:ios
```

---

## 3. Configuração do Login com Google (Web e Mobile)

Para habilitar o botão oficial **"Continuar com Google"** em produção e desenvolvimento:

1. Acesse o **Google Cloud Console** -> *APIs e Serviços* -> *Credenciais* -> *Criar Credenciais* -> **ID do cliente OAuth 2.0 (Aplicativo da Web)**.
2. Em **Origens JavaScript autorizadas**, adicione:
   - `https://projeto-gps-mytracklist.vercel.app`
   - `http://localhost:5173`
3. Configure as variáveis de ambiente:
   - **Vercel (Frontend):** `VITE_GOOGLE_CLIENT_ID=<seu-client-id>.apps.googleusercontent.com`
   - **Render (Backend):** `GOOGLE_CLIENT_ID=<seu-client-id>.apps.googleusercontent.com`
