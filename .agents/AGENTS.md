# Regras do Projeto MyTrackList

## Convenção de Commits

Todos os commits devem seguir o padrão Conventional Commits:

- `feat: <descrição>` — para novas funcionalidades
- `fix: <descrição>` — para correções de bugs
- `refactor: <descrição>` — para refatorações sem mudança de comportamento
- `chore: <descrição>` — para tarefas de manutenção (configs, deps, etc.)
- `docs: <descrição>` — para mudanças em documentação
- `test: <descrição>` — para adição ou modificação de testes

Exemplos válidos:
```
feat: add follow/unfollow user endpoint
fix: correct camelCase column quoting in PostgreSQL reviews query
refactor: extract social controller from UserController
```

Nunca omitir o prefixo. A descrição deve ser em inglês e em letras minúsculas.
