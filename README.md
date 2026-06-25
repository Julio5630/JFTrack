# JFTrack

Plataforma fitness para alunos, personal trainers e academias, com gerenciamento de treinos, acompanhamento de histórico, avaliações físicas, métricas corporais e relatórios operacionais.

## Comece Pelo Manual do Usuário

O principal documento para entender e demonstrar o produto é o Manual do Usuário:

[Manual do Usuário - JFTrack](documentacao/manual/Manual%20do%20Usuário%20-%20JFTrack.docx)

Ele explica o uso do sistema por perfil, incluindo aluno, personal trainer, academia e administrador. Também contém um roteiro rápido de demonstração e os dados de teste sugeridos.

## Aviso Sobre o Backend

O backend está hospedado no plano gratuito do Render. Por isso, quando fica um período sem uso, o serviço entra em modo de repouso.

Na primeira requisição depois desse repouso, a inicialização pode demorar alguns segundos ou até alguns minutos. Esse comportamento é esperado no plano gratuito e não indica falha no sistema.

## Documentação

Os documentos do projeto estão organizados na pasta `documentacao/`.

| Documento | Finalidade |
|---|---|
| [Manual do Usuário](documentacao/manual/Manual%20do%20Usuário%20-%20JFTrack.docx) | Guia prático de uso, demonstração e navegação por perfil. |
| [Documento de Visão](documentacao/visao/Documento%20de%20Visão%20-%20JFTrack.docx) | Visão de produto, proposta de valor, público-alvo, mercado, riscos e roadmap. |
| [Documento de Requisitos](documentacao/requisitos/Documento%20de%20Requisitos%20-%20JFTrack.docx) | Requisitos funcionais, não funcionais, regras de negócio, dados e critérios de aceitação. |
| [Documento de Arquitetura](documentacao/arquitetura/Documento%20de%20Arquitetura%20-%20JFTrack.docx) | Arquitetura técnica, frontend, backend, banco de dados, segurança, PWA e evolução recomendada. |
| [Diagramas](documentacao/diagramas/) | Fluxos e materiais visuais de apoio. |
| [Personas](documentacao/personas/personas_jftrack.html) | Perfis de usuários e contexto de uso. |

## Estrutura do Repositório

```text
JFTrack/
├── documentacao/
│   ├── arquitetura/
│   ├── diagramas/
│   ├── manual/
│   ├── personas/
│   ├── requisitos/
│   └── visao/
└── gym-diary/
    ├── backend/
    ├── frontend/
    └── render.yaml
```

## Perfis do Sistema

- Aluno com treino próprio: cria treinos, cadastra exercícios, executa treinos e acompanha histórico.
- Aluno vinculado à academia: executa treinos prescritos, consulta histórico e visualiza avaliações.
- Personal trainer: gerencia alunos, cria modelos de treino, atribui treinos e realiza avaliações físicas.
- Academia: gerencia alunos, personais, vínculos e relatórios.
- Administrador: realiza controle interno de usuários.

## Tecnologias

- Frontend: React, Vite, React Router, Framer Motion e PWA.
- Backend: Node.js, Express, JWT, bcrypt e MySQL.
- Banco de dados: MySQL.
- Deploy: Render para backend e ambiente web para frontend.

## Dados de Teste

| Perfil | E-mail | Senha |
|---|---|---|
| Aluno | aluno@teste.com | 123456 |
| Personal | personal@teste.com | 123456 |
| Academia | academia@teste.com | 123456 |
| Admin | admin.teste@teste.com | 123456 |
