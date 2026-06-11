Abaixo está um prompt bem completo que você pode usar para orientar a refatoração do projeto atual. Ele está escrito como se você fosse entregar para uma IA/desenvolvedor executar por etapas.

---

**Prompt De Refatoração Do Projeto JFTrack**

Quero refatorar meu projeto atual JFTrack, que hoje funciona como um diário de treino, para transformá-lo em uma plataforma fitness com múltiplos perfis de uso: **Aluno**, **Personal** e **Academia**.

Não quero recomeçar o projeto do zero. A ideia é aproveitar a base existente, como login, usuários, biblioteca de exercícios, criação de treinos, execução de treino, histórico e progresso, mas reorganizar o sistema para suportar novos fluxos, permissões e tipos de conta.

A refatoração deve ser feita por etapas, de forma segura, mantendo o sistema funcionando ao final de cada fase.

---

**Objetivo Geral**

Transformar o sistema em uma plataforma onde:

- Alunos possam treinar por conta própria ou vinculados a uma academia.
- Personais possam gerenciar alunos, criar treinos e realizar avaliações físicas.
- Academias possam gerenciar alunos e personais.
- O sistema tenha permissões claras para cada tipo de perfil.
- O fluxo de navegação seja diferente de acordo com o perfil do usuário.

---

**Etapa 1: Reorganizar Perfis De Usuário**

Atualmente o sistema possui usuários comuns e administrador. Quero alterar essa lógica para permitir múltiplos perfis.

Criar os seguintes tipos de perfil:

- `student` ou `aluno`
- `personal`
- `gym` ou `academia`
- `admin`, caso ainda seja necessário para controle interno

Um usuário pode ter mais de um perfil. Por exemplo:

- Um usuário pode ser aluno e personal.
- Um usuário pode ser aluno e dono de academia.
- Um usuário pode transformar sua conta comum em uma conta academia.

Após o login, se o usuário tiver apenas um perfil, ele entra direto no painel correspondente. Se tiver mais de um perfil, o sistema deve exibir uma tela de **seleção de perfil**, perguntando:

**Como deseja entrar?**

- Entrar como Aluno
- Entrar como Personal
- Entrar como Academia

Essa escolha define o menu, as permissões e as telas exibidas.

---

**Etapa 2: Criar Estrutura De Academia**

Quero permitir que qualquer usuário transforme sua conta em uma conta do tipo academia.

A academia será tratada como uma organização única, sem unidades por enquanto.

A conta academia deve ter:

- Nome da academia
- Telefone
- E-mail
- Endereço
- Responsável
- Data de criação
- Status ativo/inativo

A academia poderá:

- Adicionar alunos por e-mail
- Adicionar personais por e-mail
- Visualizar alunos vinculados
- Visualizar personais vinculados
- Ver treinos dos alunos
- Ver avaliações físicas realizadas
- Acompanhar relatórios gerais

Não criar fluxo de unidades/filiais nesta etapa.

---

**Etapa 3: Vincular Alunos E Personais À Academia**

A academia precisa conseguir adicionar usuários pelo e-mail.

Fluxo para adicionar aluno:

1. Academia informa o e-mail do aluno.
2. Sistema verifica se já existe usuário com esse e-mail.
3. Se existir, vincula esse usuário à academia como aluno.
4. Se não existir, cria um convite pendente para cadastro.
5. Quando o usuário se cadastrar, ele será vinculado à academia.

Fluxo para adicionar personal:

1. Academia informa o e-mail do personal.
2. Sistema verifica se já existe usuário com esse e-mail.
3. Se existir, vincula esse usuário à academia como personal.
4. Se não existir, cria convite pendente.
5. Após cadastro, o usuário entra como personal vinculado à academia.

Criar uma estrutura de vínculo entre usuário e academia com informações como:

- ID da academia
- ID do usuário
- Tipo de vínculo: aluno ou personal
- Status: ativo, pendente, removido
- Data de vínculo

---

**Etapa 4: Refatorar O Fluxo Do Aluno**

O aluno pode existir em dois modos:

**1. Aluno com treino próprio**

Esse aluno treina sozinho e tem liberdade para criar, editar e excluir seus próprios treinos.

Menu do aluno com treino próprio:

- Início
- Meus Treinos
- Histórico
- Sair

A aba **Meus Treinos** deve unificar:

- Criação de treino
- Lista de treinos criados
- Edição de treino
- Exclusão de treino
- Biblioteca de exercícios
- Cadastro de exercícios
- Edição de exercícios

Ou seja, remover a separação entre “Criar Treino” e “Biblioteca” para esse tipo de usuário. Dentro de **Meus Treinos**, usar abas internas:

- Treinos
- Exercícios

**2. Aluno vinculado à academia**

Esse aluno não pode criar nem alterar seus próprios treinos.

Menu do aluno vinculado à academia:

- Início
- Treinos
- Histórico
- Avaliação Física
- Sair

Nesse modo:

- A aba **Treinos** mostra apenas treinos criados pelo personal.
- O aluno pode selecionar e executar o treino.
- O aluno registra séries, repetições, carga e finaliza o treino.
- O treino finalizado vai para o histórico.
- O aluno não vê botão de criar treino.
- O aluno não vê botão de editar treino.
- O aluno não vê aba de biblioteca.
- O aluno não vê aba de rotinas.

A aba **Avaliação Física** só aparece para alunos vinculados à academia/personal.

---

**Etapa 5: Remover Ou Substituir Aba Rotinas**

A aba **Rotinas** não deve mais existir para o usuário comum.

No novo sistema:

- Aluno com treino próprio gerencia seus treinos em **Meus Treinos**.
- Aluno de academia recebe treinos do personal.
- O personal define quais treinos o aluno deve fazer.
- A academia apenas visualiza e gerencia.

Se for necessário manter uma lógica de agenda semanal, ela deve ficar dentro do treino atribuído pelo personal, e não como uma aba independente para o aluno.

---

**Etapa 6: Criar Fluxo Do Personal**

O personal terá um painel próprio.

Menu do personal:

- Início
- Alunos
- Treinos
- Avaliações
- Sair

Na tela inicial do personal, mostrar resumo:

- Quantidade de alunos vinculados
- Avaliações recentes
- Treinos criados
- Alunos com avaliação pendente
- Alunos com treino ativo

Na aba **Alunos**, o personal pode:

- Ver lista de alunos vinculados
- Buscar aluno por nome ou e-mail
- Abrir perfil do aluno
- Ver histórico do aluno
- Ver progresso do aluno
- Criar treino para o aluno
- Editar treino do aluno
- Realizar avaliação física

Na aba **Treinos**, o personal pode:

- Criar modelos de treino
- Editar modelos de treino
- Atribuir treino a um aluno
- Adaptar treino sugerido pelo sistema
- Visualizar treinos ativos de cada aluno

Na aba **Avaliações**, o personal pode:

- Criar nova avaliação física
- Ver avaliações anteriores
- Visualizar detalhes da avaliação
- Editar avaliação, se permitido
- Gerar sugestão de treino com base no questionário

---

**Etapa 7: Criar Avaliação Física E Questionário Inicial**

Criar uma área de avaliação física feita pelo personal.

A avaliação deve ser vinculada a:

- Personal
- Aluno
- Academia, se houver
- Data da avaliação

A avaliação deve conter etapas.

**1. Dados pessoais**

- Nome completo
- Data de nascimento
- Telefone / WhatsApp
- E-mail
- Objetivo principal:
  - Emagrecimento
  - Hipertrofia
  - Condicionamento
  - Reabilitação
  - Saúde geral

**2. Histórico médico e saúde**

- Algum médico já disse que possui problema no coração?
- Sente dor no peito ao praticar atividade física?
- Já teve tontura ou perda de consciência?
- Possui pressão alta?
- Possui diabetes?
- Possui colesterol alto?
- Usa medicamento contínuo?
- Qual medicamento?
- Fez cirurgia nos últimos 2 anos?
- Possui lesões?
- Possui dores articulares?

Se alguma resposta indicar risco, o sistema deve marcar a avaliação com alerta:

**Atenção: recomendada liberação médica antes de treinos intensos.**

**3. Histórico de atividade física**

- Já treinou em academia?
- Há quanto tempo?
- Nível atual:
  - Sedentário
  - Leve
  - Moderado
  - Intenso
- Já teve acompanhamento com personal?
- Exercícios que gosta
- Exercícios que não gosta

**4. Estilo de vida**

- Fuma?
- Horas de sono por noite
- Nível de estresse:
  - Baixo
  - Médio
  - Alto
- Rotina de trabalho:
  - Sentado
  - Em pé
  - Esforço físico
- Alimentação:
  - Desregulada
  - Moderada
  - Acompanhada por nutricionista

**5. Disponibilidade**

- Dias disponíveis para treino
- Horário ideal para treinar
- Quantos dias por semana pretende treinar?
- Tempo disponível por treino:
  - 30 minutos
  - 45 minutos
  - 60 minutos
  - Mais de 60 minutos

**6. Medidas físicas**

- Peso
- Altura
- IMC calculado
- Circunferência abdominal
- Circunferência torácica
- Braço direito
- Braço esquerdo
- Coxa direita
- Coxa esquerda
- Quadril
- Observações gerais

---

**Etapa 8: Gerar Preset De Treino Com Base Na Avaliação**

Após preencher o questionário, o sistema deve gerar uma sugestão inicial de treino.

Essa sugestão não deve ser enviada automaticamente para o aluno.

Fluxo:

1. Personal preenche avaliação.
2. Sistema analisa objetivo, nível, limitações e disponibilidade.
3. Sistema gera um preset de treino.
4. Personal revisa o treino.
5. Personal adapta exercícios, séries, repetições e frequência.
6. Personal salva e libera o treino para o aluno.

Exemplos de regras:

- Objetivo hipertrofia + iniciante: sugerir treino full body ou A/B.
- Objetivo emagrecimento: sugerir treino com musculação e condicionamento.
- Objetivo condicionamento: sugerir treino com exercícios multiarticulares e volume moderado.
- Objetivo reabilitação: gerar treino leve e exigir revisão cuidadosa do personal.
- Dor no joelho: evitar agachamento pesado e exercícios com muita sobrecarga no joelho.
- Dor no ombro: evitar desenvolvimento pesado e movimentos acima da cabeça.
- Poucos dias disponíveis: sugerir treino full body.
- Muitos dias disponíveis: sugerir divisão A/B/C ou grupos musculares.

---

**Etapa 9: Refatorar Permissões**

Criar regras claras de permissão.

**Aluno com treino próprio pode:**

- Criar treino
- Editar treino
- Excluir treino
- Cadastrar exercícios
- Editar exercícios
- Executar treino
- Ver histórico
- Ver progresso

**Aluno vinculado à academia pode:**

- Visualizar treinos atribuídos
- Executar treino
- Ver histórico
- Ver progresso
- Ver avaliação física

**Aluno vinculado à academia não pode:**

- Criar treino
- Editar treino
- Excluir treino
- Alterar treino do personal
- Cadastrar avaliação física

**Personal pode:**

- Ver alunos vinculados
- Criar treino para aluno
- Editar treino de aluno
- Realizar avaliação física
- Gerar preset de treino
- Acompanhar progresso do aluno

**Academia pode:**

- Adicionar alunos
- Adicionar personais
- Remover vínculos
- Ver alunos
- Ver personais
- Ver avaliações
- Ver treinos
- Ver relatórios

---

**Etapa 10: Refatorar Navegação**

A navegação deve mudar conforme o perfil ativo.

Se perfil ativo for **Aluno treino próprio**:

- Início
- Meus Treinos
- Histórico
- Sair

Se perfil ativo for **Aluno academia**:

- Início
- Treinos
- Histórico
- Avaliação Física
- Sair

Se perfil ativo for **Personal**:

- Início
- Alunos
- Treinos
- Avaliações
- Sair

Se perfil ativo for **Academia**:

- Início
- Alunos
- Personais
- Treinos
- Avaliações
- Relatórios
- Configurações
- Sair

Remover opções que não fazem sentido para aquele perfil.

---

**Etapa 11: Reaproveitar Telas Existentes**

Aproveitar o que já existe no projeto atual sempre que possível.

Reaproveitar:

- Login
- Dashboard
- Execução de treino
- Histórico
- Progresso
- Biblioteca de exercícios
- Criação de treino
- Admin panel, se útil como base para academia

Refatorar:

- Criar Treino + Biblioteca devem virar **Meus Treinos** para aluno treino próprio.
- Rotinas deve ser removida do fluxo do aluno.
- Dashboard deve ser adaptado por perfil.
- Histórico deve ser comum, mas filtrado pelo usuário/perfil.
- Treinos devem ter dono/criador e permissões.

---

**Etapa 12: Banco De Dados**

Planejar alterações no banco sem apagar os dados existentes.

Criar ou adaptar tabelas para:

- Perfis de usuário
- Academias
- Vínculos entre usuários e academias
- Vínculos entre personal e aluno
- Avaliações físicas
- Respostas do questionário
- Medidas físicas
- Treinos atribuídos a alunos
- Convites pendentes por e-mail

Garantir que os treinos tenham informações como:

- Criado por aluno
- Criado por personal
- Vinculado a aluno
- Vinculado à academia
- Ativo/inativo
- Editável ou não pelo aluno

---

**Etapa 13: Migração Dos Dados Atuais**

Os usuários atuais devem continuar funcionando.

Sugestão:

- Usuários existentes viram alunos com treino próprio.
- Treinos existentes continuam vinculados ao próprio usuário.
- Biblioteca atual continua pertencendo ao próprio usuário.
- Histórico atual continua funcionando.
- Admin atual pode continuar como administrador geral ou ser adaptado depois.

---

**Etapa 14: Ordem Recomendada De Implementação**

Implementar nesta ordem:

1. Criar estrutura de perfis.
2. Criar seleção de perfil após login.
3. Adaptar menu conforme perfil.
4. Transformar usuário comum em academia.
5. Criar vínculos de academia com alunos/personais.
6. Criar painel básico da academia.
7. Criar painel básico do personal.
8. Adaptar fluxo do aluno treino próprio.
9. Adaptar fluxo do aluno academia.
10. Unificar Criar Treino + Biblioteca em Meus Treinos.
11. Remover Rotinas do menu do aluno.
12. Criar avaliação física.
13. Criar questionário.
14. Criar geração de preset de treino.
15. Revisar permissões.
16. Testar fluxo completo.

---

**Resultado Esperado**

Ao final da refatoração, o JFTrack deve deixar de ser apenas um diário de treino e passar a ser uma plataforma fitness com:

- Gestão de alunos
- Gestão de personais
- Gestão de academia
- Treinos personalizados
- Avaliação física
- Questionário inicial
- Sugestão de treino
- Histórico de progresso
- Permissões por perfil

O sistema deve continuar simples para o aluno, mas mais poderoso para o personal e para a academia.

==============================================================================================================

Projeto: JFTrack

Objetivo:
Refatorar o JFTrack de diário de treino para plataforma fitness com perfis:
- Aluno
- Personal
- Academia
- Admin

Etapa 1 feita:
- Criada estrutura de múltiplos perfis.
- Perfis: student, personal, gym, admin.
- Criada tabela user_profiles.
- Login agora retorna profiles.
- Frontend tem activeProfile.
- Se usuário tem mais de um perfil, vai para tela ProfileSelect.
- Navbar muda conforme perfil ativo.
- Criadas telas ProfileSelect e ProfileWorkspace.

Etapa 2 feita:
- Criada estrutura de Academia.
- Criada tabela gyms.
- Academia possui nome, telefone, e-mail, endereço, responsável, status, created_at e updated_at.
- Qualquer usuário pode transformar conta em academia pela rota /gym/setup.
- APIs criadas:
  GET /api/gyms/me
  PUT /api/gyms/me
- Ao criar academia, usuário ganha perfil gym.
- Painel da academia mostra resumo dos dados.

Etapa 3 feita:
- Criada estrutura de vínculo entre academia e usuários.
- Criada tabela gym_memberships.
- Campos: gym_id, user_id, invited_email, role, status, created_at, updated_at.
- Roles: student e personal.
- Status: active, pending, removed.
- Academia pode adicionar aluno/personal por e-mail.
- Se usuário existe, vínculo fica active.
- Se usuário não existe, convite fica pending.
- Quando usuário se cadastra depois com o e-mail convidado, convite vira active.
- APIs criadas:
  GET /api/gyms/me/members?role=student
  GET /api/gyms/me/members?role=personal
  POST /api/gyms/me/members
  DELETE /api/gyms/me/members/:id
- Frontend do painel da academia agora tem formulários para adicionar alunos e personais e listas com status ativo/pendente.

Usuários de teste:
- aluno@teste.com / 123456
- personal@teste.com / 123456
- academia@teste.com / 123456
- admin.teste@teste.com / 123456
- admin@treino.com / admin123

Última etapa concluída:
Etapa 3: Vincular Alunos e Personais à Academia.

Próxima etapa sugerida:
Etapa 4: Refatorar fluxo do aluno.
- Aluno treino próprio: Início, Meus Treinos, Histórico, Sair.
- Aluno academia: Início, Treinos, Histórico, Avaliação Física, Sair.
- Aluno academia não pode criar/editar treino.
- Aluno treino próprio mantém criação de treino e biblioteca, mas unificadas em Meus Treinos.
