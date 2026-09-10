# CodeCam 📷

Plataforma web mobile-first de estudos com acessibilidade, IA e organização de materiais.

## Visão Geral

O CodeCam permite que estudantes fotografem materiais de estudo (lousas, cadernos, livros) e recebam automaticamente resumos, tópicos principais e flashcards gerados por inteligência artificial. A acessibilidade é o núcleo da experiência, com suporte a fontes ajustáveis, OpenDyslexic, alto contraste e leitura em voz alta.

**Stack:**

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4
- **Backend:** NestJS + Prisma + PostgreSQL
- **IA:** Google Gemini (modelo configurável — veja `GEMINI_MODEL`)
- **Onde roda:** máquina local, banco local. Não há ambiente publicado.

---

## Vai programar aqui?

Leia o **[AGENTS.md](AGENTS.md)** antes do primeiro commit. Ele reúne as
convenções do projeto — estrutura, comentários, acessibilidade, testes e o
formato dos commits — e vale igual para pessoas e para agentes de IA.

---

## Como rodar

### 1. O que você precisa antes

- **Node.js 20+**
- **PostgreSQL 17** rodando na sua máquina
- **Uma chave do Google Gemini** — opcional. Sem ela o app funciona de ponta a
  ponta com conteúdo de demonstração, o que basta para mexer na interface.

> O projeto roda **inteiramente local**: banco na sua máquina, backend na sua
> máquina, frontend na sua máquina. Não existe ambiente publicado, e depender de
> um banco remoto para programar significa que uma instância fora do ar derruba
> o trabalho de todo mundo.

### 2. Banco de dados

```bash
brew install postgresql@17
brew services start postgresql@17
createdb codecam
```

Em Linux, instale o `postgresql-17` pelo gerenciador da sua distribuição e crie
o banco com `createdb codecam`.

### 3. Instale as dependências

Um comando, a partir da raiz do repositório:

```bash
npm run install:all
```

### 4. Configure o backend

```bash
cp backend/.env.example backend/.env
```

Abra `backend/.env` e ajuste **duas linhas**:

```env
# Troque SEU_USUARIO pelo seu usuário do sistema (o mesmo do `whoami`)
DATABASE_URL=postgresql://SEU_USUARIO@localhost:5432/codecam?schema=public

# Qualquer texto com 32 caracteres ou mais. O servidor recusa subir com menos.
JWT_SECRET=troque-isto-por-uma-frase-longa-e-aleatoria
```

`GEMINI_API_KEY` pode ficar como está por enquanto — veja
[Chave do Gemini](#chave-do-gemini) quando quiser análise de verdade.

### 5. Crie as tabelas e popule

```bash
cd backend
npx prisma migrate deploy   # aplica as migrações que já existem no repositório
npm run prisma:seed         # dados de demonstração
cd ..
```

O seed cria o usuário **Demo** com pastas, materiais e cartões em estados
variados de revisão — o suficiente para o painel e a fila de estudo terem o que
mostrar sem ninguém precisar estudar à mão antes.

> Use `migrate deploy`, não `migrate dev`. As migrações já estão versionadas;
> `migrate dev` tentaria gerar uma nova e pode zerar o banco.
>
> Os dois comandos podem ser repetidos à vontade: `migrate deploy` não faz nada
> se já estiver tudo aplicado, e o seed recria apenas o usuário Demo, sem tocar
> em contas ou materiais seus.

### 6. Configure o frontend

```bash
cp frontend/.env.example frontend/.env
```

**Não preencha nada.** `VITE_API_URL` fica vazia em desenvolvimento: o servidor
do Vite encaminha `/api` para o backend, o que mantém tudo na mesma origem e
dispensa configurar endereço e CORS.

### 7. Suba os dois

```bash
npm run dev
```

Sobe backend e frontend juntos. O app abre em **https://localhost:5173**.

> **Por que https?** Porque a câmera exige. `getUserMedia` só existe em contexto
> seguro; em `http` fora de `localhost` a API nem aparece no navegador. O
> certificado é autoassinado, então o navegador mostra um aviso na primeira
> visita — aceite e siga. Para desligar o https (trabalho só em localhost, sem o
> aviso), use `VITE_DEV_HTTPS=false npm run dev`.

---

## Rodando no celular

É como o app foi feito para ser usado — e é a única forma de testar a câmera de
verdade.

1. Confirme que o computador e o celular estão **na mesma rede Wi-Fi**
2. Descubra o IP da máquina:

```bash
ipconfig getifaddr en0    # macOS
hostname -I               # Linux
```

3. No celular, abra `https://SEU_IP:5173` (por exemplo, `https://192.168.0.7:5173`)
4. Aceite o aviso de certificado
5. Permita o acesso à câmera quando o navegador pedir

O backend aceita origens de rede privada automaticamente em desenvolvimento, e
o endereço da API é deduzido da própria página — não há nada a configurar.

---

## Comandos

Todos a partir da raiz do repositório:

| Comando               | O que faz                                     |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | Sobe backend e frontend juntos                |
| `npm run build`       | Compila os dois para produção                 |
| `npm test`            | Roda os testes dos dois                       |
| `npm run lint`        | ESLint nos dois                               |
| `npm run typecheck`   | Checagem de tipos nos dois                    |
| `npm run format`      | Prettier em tudo                              |
| `npm run install:all` | Instala dependências da raiz, backend e front |

**Antes de commitar, rode `npm run format` e `npm run lint`.** O projeto não tem
mais hooks de git fazendo isso automaticamente.

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável                  | Obrigatória | Descrição                                               |
| ------------------------- | ----------- | ------------------------------------------------------- |
| `DATABASE_URL`            | ✅          | Conexão com o PostgreSQL local                          |
| `JWT_SECRET`              | ✅          | Segredo para assinar os tokens. Mínimo de 32 caracteres |
| `GEMINI_API_KEY`          | ❌          | Sem ela, o scan devolve conteúdo de demonstração        |
| `GEMINI_MODEL`            | ❌          | Modelo da análise. O padrão está no código              |
| `PORT`                    | ❌          | Porta do backend (padrão: 3000)                         |
| `FRONTEND_URL`            | ❌          | Origens autorizadas, separadas por vírgula              |
| `DATABASE_URL_PRODUCTION` | ❌          | Usada só pelos scripts de promoção; o app nunca lê      |

A configuração é validada no boot: **o servidor não sobe com valor inválido** e
diz exatamente o que está errado.

`GEMINI_MODEL` existe porque o Google aposenta modelos sem aviso — foi o que
derrubou toda captura de foto uma vez, quando o modelo fixo no código passou a
responder 404. Se a análise começar a falhar dizendo que está "fora do ar",
confira a [lista atual](https://ai.google.dev/gemini-api/docs/models) e ajuste
aqui, sem precisar tocar em código.

### Frontend (`frontend/.env`)

| Variável         | Obrigatória | Descrição                                                                      |
| ---------------- | ----------- | ------------------------------------------------------------------------------ |
| `VITE_API_URL`   | ❌          | **Deixe vazia** em desenvolvimento. Só se usa apontando para uma API publicada |
| `VITE_DEV_HTTPS` | ❌          | `false` desliga o https do servidor de desenvolvimento                         |

---

## Chave do Gemini

Opcional, mas sem ela o app não analisa foto de verdade — devolve sempre o mesmo
conteúdo de demonstração.

1. Acesse o [Google AI Studio](https://aistudio.google.com/)
2. Faça login e clique em **Get API key**
3. Crie uma chave e copie
4. Cole em `backend/.env` como `GEMINI_API_KEY=sua-chave`

> ⚠️ A chave vive **só no backend**. Ela nunca é enviada ao navegador, e a
> análise da imagem acontece no servidor justamente por isso.

---

## Deploy

**Não há ambiente publicado.** Houve uma tentativa no Railway (backend + banco)
com frontend na Vercel, mas o banco saiu do ar e a migração foi arquivada — o
projeto roda local por decisão, não por pendência.

O que ficou pronto para o dia em que isso mudar:

```bash
cd backend
npm run db:promote:check   # diagnostica a conexão com o banco de produção
```

O script distingue as três falhas que se parecem no cliente e pedem ações
opostas — DNS que não resolve, TCP que não abre, e handshake sem resposta — e
imprime o que fazer em cada caso.

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
| `GET` `POST` `PATCH` `DELETE` | `/folders` `/folders/:id`    | CRUD de pastas                                          |
| `GET` `POST` `DELETE`         | `/contents` `/contents/:id`  | Materiais salvos                                        |
| `GET`                         | `/study/queue`               | Cartões vencidos, do mais atrasado ao menos             |
| `GET`                         | `/study/contents/:id`        | Todos os cartões de um material                         |
| `POST`                        | `/study/sessions`            | Abre uma sessão de estudo                               |
| `POST`                        | `/study/sessions/:id/finish` | Fecha e devolve o placar                                |
| `POST`                        | `/study/reviews`             | Grava a avaliação e reagenda o cartão (SM-2)            |
| `GET`                         | `/stats/overview`            | Painel: vencidos, domínio, sequência, acerto, atividade |
| `GET`                         | `/search?q=`                 | Busca full-text nos materiais                           |
| `GET`                         | `/health`                    | Sinal de vida do servidor, sem autenticação             |

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

1. Abra o CodeCam no celular (veja [Rodando no celular](#rodando-no-celular))
2. Digite seu nome ou apelido para entrar
3. _(Opcional)_ Configure acessibilidade em **Ajustes**
4. Toque em **Escanear material** na tela inicial
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
| Alvo de toque       | 44px de altura mínima em todo controle          |

---

## Licença

MIT
