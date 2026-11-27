# MyTrackList — instruções para o Claude

## Branches

- Nomes de branch sempre em **português**, no padrão `tipo/descricao-curta-com-hifens`:
  - `bug/estrelas-avaliacao-toque` — correção de bug
  - `feat/notificacoes-de-amigos` — funcionalidade ou melhoria
- Nunca mencionar "claude" no nome da branch.
- (O Git não aceita `:` nem espaço em nome de branch, por isso a barra em vez de `bug: ...`.)

## Ambientes

- `master` = produção, `development` = dev. Detalhes em `DEPLOY_E_AMBIENTES.md`.

## Antes de subir qualquer mudança

O CI (`.github/workflows/ci.yml`) roda tudo isto a cada push em `development` e `master`:

- **Frontend** (`client/`): `npm run lint`, `npm test`, `npm run build`
- **Backend** (`server/`): `npm run build`, `npm test`
  - Os testes do backend precisam de um PostgreSQL de teste (veja "Testes" em `server/README.md`).
