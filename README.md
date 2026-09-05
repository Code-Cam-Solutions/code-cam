# CodeCam 📷

Plataforma web mobile-first de estudos com acessibilidade, IA e organização de materiais.

## Visão Geral

O CodeCam permite que estudantes fotografem materiais de estudo (lousas, cadernos, livros) e recebam automaticamente resumos, tópicos principais e flashcards gerados por inteligência artificial. A acessibilidade é o núcleo da experiência, com suporte a fontes ajustáveis, OpenDyslexic, alto contraste e leitura em voz alta.

**Stack:**

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4
- **Backend:** NestJS + Prisma + PostgreSQL
- **IA:** Google Gemini 1.5 Flash
- **Deploy:** Vercel (frontend) + Railway (backend + banco)

---

## Vai programar aqui?

Leia o **[AGENTS.md](AGENTS.md)** antes do primeiro commit. Ele reúne as
convenções do projeto — estrutura, comentários, acessibilidade, testes e o
formato dos commits — e vale igual para pessoas e para agentes de IA.

---

## Pré-requisitos

- Node.js 20+
- PostgreSQL 17
- Conta no [Google AI Studio](https://aistudio.google.com/) para obter a chave do Gemini

### Banco local (macOS)

O desenvolvimento roda contra um Postgres na própria máquina — depender do
banco de produção para programar significa que uma instância pausada derruba o
trabalho de todo mundo.

```bash
brew install postgresql@17
brew services start postgresql@17
createdb codecam
```

A URL correspondente, em `backend/.env`:

```env
DATABASE_URL=postgresql://SEU_USUARIO@localhost:5432/codecam?schema=public
```

Em seguida, aplique o schema e popule com dados de demonstração:

```bash
cd backend
npx prisma migrate deploy
npm run prisma:seed
```

O seed cria o usuário **Demo**, com pastas, conteúdos e cartões em estados
variados de revisão — o suficiente para o painel e a fila de estudo terem o que
mostrar sem ninguém precisar estudar à mão antes.

---

## Configuração Local

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd codecam
```

### 2. Configure o Backend

```bash
cd backend

# Instale as dependências
npm install

# Copie o arquivo de variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `backend/.env` com seus valores:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/codecam?schema=public
JWT_SECRET=troque-por-uma-chave-segura-e-longa
GEMINI_API_KEY=sua-chave-do-gemini-aqui
PORT=3000
FRONTEND_URL=http://localhost:5173
```

Execute as migrations do banco de dados:

```bash
# Cria o banco e aplica as migrations
npx prisma migrate dev --name init

# Gera o Prisma Client
npx prisma generate
```

Inicie o backend:

```bash
npm run start:dev
```

O backend estará disponível em `http://localhost:3000`.

### 3. Configure o Frontend

```bash
cd ../frontend

# Instale as dependências
npm install

# Copie o arquivo de variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Inicie o frontend:

```bash
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

---

## Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável         | Descrição                             | Obrigatório |
| ---------------- | ------------------------------------- | ----------- |
| `DATABASE_URL`   | URL de conexão com PostgreSQL         | ✅          |
| `JWT_SECRET`     | Chave secreta para assinar tokens JWT | ✅          |
| `GEMINI_API_KEY` | Chave de API do Google Gemini         | ✅          |
| `PORT`           | Porta do servidor (padrão: 3000)      | ❌          |
| `FRONTEND_URL`   | URL do frontend para CORS             | ❌          |

### Frontend (`frontend/.env`)

| Variável       | Descrição           | Obrigatório |
| -------------- | ------------------- | ----------- |
| `VITE_API_URL` | URL base do backend | ✅          |

---

## Obter chave do Google Gemini

1. Acesse [Google AI Studio](https://aistudio.google.com/)
2. Faça login com sua conta Google
3. Clique em **“Get API key”** no menu lateral
4. Crie uma nova chave e copie-a
5. Cole em `backend/.env` como `GEMINI_API_KEY=sua-chave`

> ⚠️ **Nunca** exponha a chave do Gemini no frontend. Ela deve permanecer somente no backend.

---

## Deploy

### Backend no Railway

1. Acesse [railway.app](https://railway.app) e faça login
2. Clique em **New Project** → **Deploy from GitHub repo**
3. Selecione o repositório e configure o **Root Directory** como `backend`
4. Adicione um banco PostgreSQL: **New** → **Database** → **PostgreSQL**
5. Configure as variáveis de ambiente no painel do Railway:
   - `DATABASE_URL` (copiada automaticamente ao linkar o banco)
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `FRONTEND_URL` (URL do Vercel após o deploy)
6. Em **Settings** → **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
7. **Start Command**: `npm run start:prod`

### Frontend no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **New Project** → importe do GitHub
3. Configure o **Root Directory** como `frontend`
4. Adicione a variável de ambiente:
   - `VITE_API_URL`: URL do backend no Railway (ex: `https://codecam-backend.up.railway.app`)
5. Clique em **Deploy**

### Após o deploy

1. Copie a URL do frontend (ex: `https://codecam.vercel.app`)
2. Atualize a variável `FRONTEND_URL` no Railway com essa URL
3. Gere o QR Code da URL do frontend usando qualquer gerador (ex: [qr-code-generator.com](https://www.qr-code-generator.com/))

---

## Estrutura do Projeto

O backend separa três coisas que envelhecem em ritmos diferentes; um módulo de
produto importa infraestrutura, o caminho contrário não existe. O frontend
agrupa por funcionalidade: cada pasta em `features/` guarda suas páginas, seus
componentes e seus hooks juntos.

```
codecam/
├── frontend/
│   └── src/
│       ├── api/            # Cliente HTTP e uma função por operação do produto
│       ├── app/            # Rotas e provedores
│       ├── design-system/   # Tokens e primitivas — nenhuma tela cita um hex
│       ├── features/
│       │   ├── auth/       # Entrada
│       │   ├── capture/    # Câmera, conferência, formatos, processamento, resultado
│       │   ├── home/       # Painel com as estatísticas de estudo
│       │   ├── library/    # Pastas, materiais e busca
│       │   ├── settings/   # Acessibilidade e instalação do app
│       │   └── study/      # Sessão de revisão com repetição espaçada
│       └── shared/         # Componentes, hooks e contextos de uso geral
│
└── backend/
    └── src/
        ├── config/         # Validação das variáveis de ambiente no boot
        ├── common/         # Decorators e tipos compartilhados
        ├── infra/          # Fronteiras externas: Prisma e Gemini
        └── modules/        # auth, scan, folders, contents, study, stats, search
```

## API

| Método                        | Rota                         | O que faz                                               |
| ----------------------------- | ---------------------------- | ------------------------------------------------------- |
| `POST`                        | `/auth/login`                | Entra pelo nome e devolve o token                       |
| `POST`                        | `/scan`                      | Analisa a foto; `formats` escolhe o que gerar           |
| `GET` `POST` `PATCH` `DELETE` | `/folders`                   | CRUD de pastas                                          |
| `GET` `POST` `DELETE`         | `/contents`                  | Materiais salvos                                        |
| `GET`                         | `/study/queue`               | Cartões vencidos, do mais atrasado ao menos             |
| `GET`                         | `/study/contents/:id`        | Todos os cartões de um material                         |
| `POST`                        | `/study/sessions`            | Abre uma sessão de estudo                               |
| `POST`                        | `/study/sessions/:id/finish` | Fecha e devolve o placar                                |
| `POST`                        | `/study/reviews`             | Grava a avaliação e reagenda o cartão (SM-2)            |
| `GET`                         | `/stats/overview`            | Painel: vencidos, domínio, sequência, acerto, atividade |
| `GET`                         | `/search?q=`                 | Busca full-text nos materiais                           |

## Repetição espaçada

Os cartões são agendados pelo SM-2, o algoritmo do SuperMemo na variante que o
Anki popularizou: o intervalo até a próxima revisão cresce a cada acerto,
multiplicado por um fator de facilidade que o próprio desempenho ajusta. A
revisão acontece no ponto em que a memória está prestes a falhar — nem antes,
que é desperdício, nem depois, quando o conteúdo já se perdeu.

O algoritmo vive isolado em `backend/src/modules/study/spaced-repetition.ts`,
como função pura e coberto por testes. O app oferece três notas — "Não sei",
"Quase" e "Sei" —, que mapeiam para AGAIN, HARD e GOOD.

## Fluxo Principal

1. Acesse o CodeCam pelo QR Code (URL HTTPS)
2. Digite seu nome ou apelido para entrar
3. _(Opcional)_ Configure acessibilidade em **Ajustes**
4. Toque em **Escanear agora** na Home
5. Permita o acesso à câmera e fotografe o material
6. Aguarde a análise da IA
7. Visualize título, resumo, tópicos e flashcards
8. Use os botões 🔊 para ouvir qualquer conteúdo
9. Inicie uma sessão de flashcards e avalie seu desempenho
10. Salve o material em uma pasta

---

## Funcionalidades de Acessibilidade

| Recurso             | Descrição                                       |
| ------------------- | ----------------------------------------------- |
| Tamanho de fonte    | 4 níveis: Pequena, Normal, Grande, Extra grande |
| OpenDyslexic        | Fonte especializada para dislexia               |
| Alto contraste      | Cores de alto contraste para baixa visão        |
| Leitura em voz alta | Botão por elemento via Web Speech API           |
| Velocidade de TTS   | Ajustável de 0.5x a 2x                          |
| Foco visível        | Outline em todos os elementos interativos       |
| ARIA labels         | Todos os elementos com descrições acessíveis    |
| Tamanho mínimo      | Botões com 48px de altura mínima                |

---

## Licença

MIT
