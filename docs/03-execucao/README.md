# Execução

A fase de execução do projeto MyTrackList consistiu na materialização do planeamento detalhado, seguindo o framework Scrum e utilizando o GitHub Projects para o gerenciamento do fluxo de trabalho. Durante esta etapa, as atividades foram realizadas em Sprints iterativas, focadas na entrega de funcionalidades tangíveis.

O gerente de projeto, David Nunes Ribeiro (SM/Tech Lead), atuou na coordenação diária das atividades, facilitando a comunicação entre as equipes de Front-end e Back-end e removendo impedimentos. A eficácia da execução baseou-se em:

**1. Design e Interface (UX/UI):**
Antes da codificação, o time de Front-end utilizou o **Figma** para a criação do protótipo interativo e a definição do design visual. Este protótipo serviu como guia para a implementação dos componentes em React, garantindo a aderência aos requisitos de usabilidade e design agradável.

[![Protótipo Interativo do MyTrackList](images/MyTrackListFigma.png)](images/MyTrackListFigma.png)

**2. Desenvolvimento Incremental por Sprints:**

* **Sprint 0 (Fundação):** Foco na preparação do ambiente, incluindo a configuração do monorepo, a escolha e inicialização da stack (Node.js/Bun, React/Vite) e o setup inicial do banco de dados SQLite.
* **Sprint 1 (Autenticação):** Execução do sistema de login e cadastro. O Front-end desenvolveu os formulários e o `AuthContext`, enquanto o Back-end implementou as rotas de usuário e a segurança via sessões.
* **Sprint 2 (Busca e Integração):** Implementação da lógica de obtenção do token do Spotify no Back-end e desenvolvimento da API de busca. O Front-end construiu a `SearchBar` e as páginas de resultados e detalhes da música.
* **Sprint 3 (Avaliações e Dados Pessoais):** Criação da funcionalidade central de avaliação (`CRUD de Reviews`) e desenvolvimento da página de perfil pessoal, exibindo o histórico do usuário.
* **Sprint 4 (Social e Finalização):** Execução das rotas e interfaces para perfis públicos, revisão final de usabilidade (UI/UX) e preparação dos ambientes para o deploy final (Render e Vercel).

**3. Gestão e Monitoramento:**
O acompanhamento do progresso foi feito de forma transparente no quadro Kanban do GitHub, permitindo que o Product Owner (PO) e o Gerente de Projeto monitorassem o status das tarefas (`In Progress`, `In Review`) e alocassem os recursos de desenvolvimento de maneira eficiente.
```diff
- Neste template, a Fase de Execução não será utilizada.
```
