# OnTime

OnTime é uma aplicação de lembretes de ponto com o Jonas, um assistente que ajuda a criar e organizar lembretes por conversa. Os avisos podem ser encaminhados ao Discord ou ao Google Chat por webhooks.

## Objetivo

O projeto demonstra a integração entre uma interface React, uma API .NET, persistência com SQLite e automações externas via n8n. O foco é oferecer uma experiência simples para cadastrar, editar, ativar e excluir lembretes.

## Funcionalidades

- Conversa com o assistente Jonas para interpretar lembretes.
- Cadastro e edição manual de lembretes.
- Ativação, desativação e exclusão de lembretes.
- Histórico recente de conversas.
- Integrações configuráveis com Discord e Google Chat.
- Funcionamento local do front-end quando a API estiver temporariamente indisponível.

## Tecnologias

- Front-end: React 19, TypeScript, Vite, Axios e React Icons.
- Back-end: .NET 8, ASP.NET Core, Entity Framework Core e SQLite.
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
- Uma instância do n8n, caso queira usar o chat e a geração de mensagens.

### 1. Configurar o back-end

Entre em `OnTime.API` e configure os valores sensíveis com variáveis de ambiente. O arquivo `appsettings.example.json` mostra apenas valores fictícios.

PowerShell:

```powershell
$env:ConnectionStrings__DefaultConnection = "Data Source=ontime.db"
$env:N8N_CHAT_WEBHOOK_URL = "https://seu-n8n.exemplo/webhook/jonas-chat"
$env:N8n__ReminderMessageWebhookUrl = "https://seu-n8n.exemplo/webhook/jonas-reminder"
$env:Cors__AllowedOrigins__0 = "http://localhost:5173"
dotnet restore
dotnet run
```

O Swagger fica disponível no endereço exibido pelo .NET quando o ambiente é `Development`. Em produção, só é ativado quando `Swagger__Enabled=true`.

### 2. Configurar o front-end

Entre em `OnTime-frontend`, copie `.env.example` para `.env.local` e use a URL da API:

```env
VITE_API_URL=http://localhost:5120
```

Depois execute:

```powershell
npm install
npm run dev
```

## Integrações

### n8n

O back-end usa dois webhooks: um para conversar com o Jonas e outro para gerar a mensagem final do lembrete. Configure-os por `N8N_CHAT_WEBHOOK_URL` e `N8n__ReminderMessageWebhookUrl`. Sem o webhook de chat, o Jonas responde com uma mensagem amigável de contingência; sem o webhook de lembrete, a mensagem informada pelo usuário é preservada.

### Discord e Google Chat

As URLs podem ser informadas nas configurações da interface. Use webhooks de canais de teste durante o desenvolvimento, restrinja quem pode vê-los e revogue imediatamente qualquer URL exposta. Nunca inclua webhooks reais no código, em screenshots ou em commits.

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


