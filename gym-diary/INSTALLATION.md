# Documentação de Instalação e Configuração

## Pré-requisitos

- Node.js v18.0.0 ou superior
- npm v9.0.0 ou superior
- MySQL 5.7 ou superior

## Instalação Detalhada

### 1. Preparar o Banco de Dados

Criar um novo banco de dados MySQL:

```sql
CREATE DATABASE gym_diary;
CREATE USER 'gym_user'@'localhost' IDENTIFIED BY 'sua_senha_segura';
GRANT ALL PRIVILEGES ON gym_diary.* TO 'gym_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Configurar Backend

```bash
cd backend
npm install
```

Criar arquivo `.env`:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=gym_user
DB_PASSWORD=sua_senha_segura
DB_NAME=gym_diary

JWT_SECRET=sua_chave_secreta_muito_segura_e_aleatoria
```

Iniciar o servidor:

```bash
npm run dev
```

### 3. Configurar Frontend

```bash
cd frontend
npm install
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## Credenciais Padrão

Usuário admin padrão (criado automaticamente):
- Email: admin@treino.com
- Senha: [Definida durante inicialização]

## Troubleshooting

### Erro de conexão com MySQL

- Verificar se MySQL está rodando
- Confirmar credenciais em `.env`
- Verificar porta (padrão 3306)

### Porta já em uso

```bash
# Alterar porta no .env
PORT=3001
```

### Modules not found

```bash
# Limpar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install
```

## Variáveis de Ambiente Avançadas

### Backend
- `LOG_LEVEL` - Nível de logging (debug, info, warn, error)
- `CORS_ORIGIN` - Origem permitida para CORS
- `SESSION_TIMEOUT` - Tempo de expiração da sessão em minutos
- `MAX_LOGIN_ATTEMPTS` - Número máximo de tentativas de login

### Frontend
- `VITE_API_URL` - URL da API (padrão: http://localhost:3000/api)
- `VITE_DEBUG` - Ativar modo debug (true/false)

## Performance

### Otimizações Aplicadas

- Pool de conexões MySQL
- Compressão GZIP no Express
- Lazy loading de componentes React
- Vite para build rápido

## Segurança

- Senhas com hash bcrypt (10 rounds)
- JWT com expiração configurável
- CORS restritivo
- Validação de entrada de dados
- Rate limiting (implementar conforme necessário)
