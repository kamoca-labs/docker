Nome de skill (o comando `/plugin:acao`) e os argumentos-chave dela (`target:`, `since:`) em inglês, sem exceção; o conteúdo das skills, docs e mensagens dos hooks segue em português.

Revisão de código é "PR/MR" em todo texto. PR, MR, pull request e merge request são sinônimos do mesmo conceito: o plugin não supõe a forja (GitHub ou GitLab), e quem lê entende qualquer um dos nomes.

O Claude é a ferramenta do usuário: faz o trabalho, e o usuário só decide e aprova. Skill, hook e doc nunca mandam o usuário editar arquivo, configurar, instalar ou rodar comando à mão. Quando falta algo, a skill manda o Claude pedir permissão ao usuário, fazer a ação e conferir que funcionou (por exemplo, abrir uma sessão de teste). A única exceção é o que o Claude não consegue fazer, como um comando de barra (`/plugin`, `/mcp`) ou um login interativo: nesse caso, a skill manda o Claude entregar o comando pronto.

Referência, decisão ou escolha sobre o projeto mora no repo (CLAUDE.md, `docs/`, `.claude/memory/`), com caminho relativo. Nunca na memória local do Claude (`~/.claude/`) nem com caminho absoluto: só valeria nesta máquina e o time não veria.
