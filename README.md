# OnTime

OnTime é uma aplicação de lembretes de ponto com o Jonas, um assistente que ajuda a criar e organizar lembretes por conversa. Os avisos podem ser encaminhados ao Discord ou ao Google Chat por webhooks.

## Objetivo

O projeto demonstra a integração entre uma interface React, uma API .NET, persistência com PostgreSQL e automações externas via n8n. O foco é oferecer uma experiência simples para cadastrar, editar, ativar e excluir lembretes.

## Funcionalidades

- Conversa com o assistente Jonas para interpretar lembretes.
- Cadastro e edição manual de lembretes.
- Ativação, desativação e exclusão de lembretes.
- Histórico recente de conversas.
- Integrações configuráveis com Discord e Google Chat.
- Funcionamento local do front-end quando a API estiver temporariamente indisponível.

## Tecnologias

- Front-end: React 19, TypeScript, Vite, Axios e React Icons.
- Back-end: .NET 8, ASP.NET Core, Entity Framework Core e PostgreSQL.
- Integrações: n8n, Discord e Google Chat por webhooks.
- Documentação da API: Swagger, habilitado em desenvolvimento.

## Estrutura

```text
OnTime/
├── OnTime-frontend/   # Interface React e cliente da API
├── OnTime.API/        # API .NET, migrations e persistência
├── .gitignore
└── README.md
```

## Como rodar localmente

### Pré-requisitos

- Node.js 20 ou superior.
- .NET SDK 8.
- Ollama com o modelo configurado ou uma instância do n8n para o provedor legado do Jonas.

### 1. Configurar o back-end

Entre em `OnTime.API` e configure os valores sensíveis com variáveis de ambiente. O arquivo `appsettings.example.json` mostra apenas valores fictícios.

PowerShell:

```powershell
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=ontime;Username=postgres;Password=SENHA_LOCAL"
$env:N8n__ChatWebhookUrl = "https://seu-n8n.exemplo/webhook/jonas-chat"
$env:N8n__ReminderMessageWebhookUrl = "https://seu-n8n.exemplo/webhook/jonas-reminder"
$env:Cors__AllowedOrigins = "http://localhost:5173"
$env:JonasAi__Provider = "Ollama"
$env:JonasAi__OllamaUrl = "http://127.0.0.1:11434"
$env:JonasAi__Model = "deepseek-r1:8b"
$env:JonasAi__TimeoutSeconds = "300"
$env:JonasAi__ReminderTimeoutSeconds = "45"
dotnet restore
dotnet run
```

O Swagger fica disponível no endereço exibido pelo .NET quando o ambiente é `Development`. Em produção, só é ativado quando `Swagger__Enabled=true`.

### 2. Configurar o front-end

Entre em `OnTime-frontend`, copie `.env.example` para `.env.local` e use a URL da API:

```env
VITE_API_URL=http://localhost:5120/api
VITE_JONAS_CHAT_TIMEOUT_MS=360000
```

Depois execute:

```powershell
npm install
npm run dev
```

O Vite carrega `.env.local` a partir da raiz de `OnTime-frontend`, não de `src`.
Depois de criar ou alterar esse arquivo, reinicie `npm run dev`. Em desenvolvimento,
o projeto também encaminha `/api` para `http://localhost:5120`; em produção,
`VITE_API_URL` deve apontar para a URL pública da API terminando em `/api`.

O chat usa 360 segundos no navegador e 300 segundos entre a API e o Ollama.
As demais chamadas HTTP do frontend mantêm 45 segundos, e a geração de uma
mensagem de notificação usa `JonasAi__ReminderTimeoutSeconds` (45 segundos por
padrão). O limite do navegador deve permanecer maior que o limite do backend.

Para reiniciar os processos em terminais separados do VS Code no Windows:

```powershell
# Terminal 1 - Ollama
ollama serve

# Terminal 2 - API
cd C:\Users\Emily\source\OnTime
$env:JonasAi__Provider = "Ollama"
$env:JonasAi__OllamaUrl = "http://127.0.0.1:11434"
$env:JonasAi__Model = "deepseek-r1:8b"
$env:JonasAi__TimeoutSeconds = "300"
$env:JonasAi__ReminderTimeoutSeconds = "45"
dotnet run --project .\OnTime.API\OnTime.API.csproj

# Terminal 3 - frontend
cd C:\Users\Emily\source\OnTime\OnTime-frontend
npm run dev
```

Em produção, quando o navegador chama diretamente a URL `onrender.com`, a
hospedagem estática da Vercel não intermedeia o `POST /api/chat`. Se a aplicação
passar a usar um rewrite/proxy externo da Vercel, o proxy limita a espera sem o
primeiro byte a 120 segundos, portanto esse caminho não suporta uma resposta
silenciosa de 300 segundos. Os Web Services do Render aceitam respostas HTTP
longas, mas o plano gratuito pode adicionar tempo de inicialização apó inatividade.

## Integrações

### Ollama / DeepSeek

Para usar o Jonas localmente sem substituir os webhooks n8n salvos, configure
`JonasAi__Provider=Ollama`, `JonasAi__OllamaUrl`, `JonasAi__Model` e um
`JonasAi__DispatchToken` longo e aleatório. Remover `JonasAi__Provider` ou usar
`N8n` mantém o provedor anterior. O endpoint protegido
`POST /api/schedule/{id}/notification-message` gera uma mensagem nova por
disparo e aceita `{ "previousMessage": "..." }` para evitar repetição imediata.

O agendador recorrente não está neste repositório: o fluxo n8n deve chamar essa
rota imediatamente antes de enviar ao Discord/Google Chat, usando
`Authorization: Bearer <JonasAi__DispatchToken>`. Só depois do envio bem-sucedido
deve guardar a resposta `text` como `previousMessage` da próxima ocorrência.

### n8n

O back-end usa dois webhooks: um para conversar com o Jonas e outro para gerar a mensagem final do lembrete. Configure-os por `N8n__ChatWebhookUrl` e `N8n__ReminderMessageWebhookUrl`. Sem o webhook de chat, o Jonas responde com uma mensagem amigável de contingência; sem o webhook de lembrete, a mensagem informada pelo usuário é preservada.

### Discord e Google Chat

As URLs podem ser informadas nas configurações da interface. Use webhooks de canais de teste durante o desenvolvimento, restrinja quem pode vê-los e revogue imediatamente qualquer URL exposta. Nunca inclua webhooks reais no código, em screenshots ou em commits.

## Deploy no Render

O arquivo `render.yaml` configura um Web Service Docker com .NET 8, usando `OnTime.API` como diretório raiz e `/health` como health check. No painel, preencha `ConnectionStrings__DefaultConnection`, use `https://ontime-virid.vercel.app,http://localhost:5173` em `Cors__AllowedOrigins` e configure `N8n__ChatWebhookUrl` e `N8n__ReminderMessageWebhookUrl`. A connection string do Supabase deve usar SSL (`SSL Mode=Require`).

As migrations existentes foram criadas originalmente para SQLite e, por segurança, não são executadas automaticamente no PostgreSQL. Confirme o schema já existente no Supabase antes de habilitar `Database__MigrateOnStartup` ou gerar migrations específicas para PostgreSQL.

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/schedule` | Lista os lembretes. |
| `POST` | `/api/schedule` | Cria um lembrete. |
| `PUT` | `/api/schedule/{id}` | Atualiza um lembrete. |
| `PATCH` | `/api/schedule/{id}/toggle` | Ativa ou desativa um lembrete. |
| `DELETE` | `/api/schedule/{id}` | Exclui um lembrete. |
| `POST` | `/api/chat` | Envia uma mensagem ao Jonas. |
| `GET` | `/api/conversation` | Lista as 20 conversas mais recentes. |
| `GET` | `/health` | Verifica a disponibilidade da API. |
| `GET` | `/api/status` | Retorna o status público do serviço. |

## Screenshots

> Adicione aqui capturas da tela inicial, da conversa com o Jonas e da gestão de lembretes antes de publicar o portfólio. Oculte webhooks e outros dados privados.

## Status

Projeto funcional em preparação para portfólio. Não há autenticação de usuários nesta versão; antes de expor a API publicamente, avalie adicionar autenticação, autorização e limites de requisição.

## Melhorias futuras

- Autenticação e isolamento dos dados por usuário.
- Testes automatizados de unidade e integração.
- Proteção contra abuso e rate limiting.
- Armazenamento seguro de webhooks no servidor.
- Monitoramento e observabilidade de produção.

## Guia de contribuição e operação

- Visão do produto: [`PRODUCT.md`](PRODUCT.md)
- Instruções e comandos canônicos: [`AGENTS.md`](AGENTS.md)
- Arquitetura: [`docs/architecture.md`](docs/architecture.md)
- Design: [`docs/design.md`](docs/design.md)
- Onboarding: [`docs/onboarding.md`](docs/onboarding.md)
- Qualidade e segurança: [`docs/quality.md`](docs/quality.md)
- Registro da adoção do toolkit: [`docs/setup.md`](docs/setup.md)


