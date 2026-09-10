# AGENTS.md

Guia para quem for programar no CodeCam — pessoa ou agente de IA.

O objetivo é que código novo pareça escrito pela mesma mão que o resto. Se
alguma regra aqui atrapalhar o trabalho real, mude a regra junto com o código e
explique no commit — este arquivo é convenção, não lei.

---

## O que é o CodeCam

Um app web mobile-first onde o estudante fotografa material de estudo (lousa,
caderno, livro) e recebe resumo, tópicos e flashcards gerados por IA, com
revisão espaçada.

**Acessibilidade não é uma funcionalidade deste projeto — é o motivo dele.** O
público inclui pessoas com baixa visão, deficiência visual e dislexia. Toda
decisão de interface responde antes a "isso funciona para quem não enxerga a
tela?" do que a "isso está bonito?".

**Stack:** React 19 + Vite + TypeScript + Tailwind v4 (frontend), NestJS +
Prisma + PostgreSQL (backend), Google Gemini (IA).

---

## Começando

```bash
npm run install:all     # instala raiz, backend e frontend
npm run dev             # sobe os dois (backend :3000, frontend :5173)
```

O backend precisa de `backend/.env` (copie de `.env.example`) com um PostgreSQL
local e, opcionalmente, `GEMINI_API_KEY` — sem a chave o scan devolve conteúdo
de demonstração e o app continua percorrível de ponta a ponta.

Deixe `VITE_API_URL` **vazia** em desenvolvimento. Sem valor, o frontend deduz o
endereço da API a partir de onde a página está sendo servida, e é isso que faz
abrir pelo celular (via IP da máquina, que é como o app é usado de verdade)
funcionar sem editar nada.

Antes de abrir um PR:

```bash
npm run typecheck && npm run lint && npm test
```

---

## Estrutura

```
backend/src/
  config/        validação de env, política de CORS
  infra/         fronteiras com o mundo externo (Prisma, Gemini)
  modules/       uma pasta por domínio: controller + service + dto + spec
  common/        tipos e decorators compartilhados

frontend/src/
  app/           rotas e composição raiz
  design-system/ tokens e primitivos visuais
  features/      uma pasta por domínio: pages/, hooks/, lib/
  shared/        contextos, hooks e componentes usados por mais de uma feature
  api/           cliente HTTP e tipos da fronteira de rede
```

Duas regras de dependência:

- **Feature não importa de feature.** O que duas precisam vai para `shared/`.
- **Módulo de domínio não conhece SDK de fornecedor.** Quem fala com Gemini é
  `infra/gemini`; o módulo `scan` conhece a interface, não o SDK. Trocar de
  modelo (ou de fornecedor) não deve tocar em regra de produto nenhuma.

---

## Comentários

Esta é a convenção mais visível do projeto, e a mais fácil de quebrar sem
perceber.

**Comentário explica decisão, não mecânica.** O código já diz o que faz. O que
ele não diz é por que faz assim, o que foi tentado antes, e o que quebra se
alguém "simplificar".

Escreva em português. Prefira um comentário bom a três medianos — densidade
alta de comentário óbvio treina quem lê a ignorar todos.

```ts
// ✗ Ruim — narra o que a linha seguinte já diz
// Converte para base64
const base64 = file.buffer.toString("base64");

// ✓ Bom — explica uma escolha que não é óbvia e tem consequência
// 0.92 em vez dos 0.85 anteriores: o texto de lousa é fino e de baixo
// contraste, e o artefato do JPEG come exatamente esse traço — que é o
// único dado que a IA tem para ler.
const blob = await canvasToBlob(canvas, 0.92);
```

Quando corrigir um bug de causa não óbvia, deixe a causa escrita junto do
conserto. Veja `features/capture/hooks/useCamera.ts` — o comentário do topo
explica por que o stream mora em estado do React e não em uma ref, e sem ele a
próxima pessoa "arruma" isso de volta para o bug.

---

## Estilo e tipos

- **Modo estrito ligado nos dois apps.** Nada de `any`; na fronteira de rede,
  `unknown` mais validação. Resposta de IA é texto gerado, não contrato —
  trate como dado não confiável e valide.
- **Sem `!` para calar o compilador.** Estreite o tipo com uma checagem ou uma
  função de asserção.
- **Erro para o usuário é em português e acionável.** "Erro 500" não é
  mensagem. "A câmera está sendo usada por outro aplicativo. Feche a outra aba
  e tente de novo" é.
- Formatação é do Prettier: rode `npm run format` antes de commitar. Não discuta vírgula.

---

## Interface e acessibilidade

**Nunca escreva uma cor.** Nem hex, nem `text-gray-500`. Use os tokens
semânticos (`bg-surface`, `text-text-muted`, `border-border`). São eles que
fazem tema claro, escuro e alto contraste existirem sem um `if` na interface. Se
faltar um token para o que você precisa, crie o token — não a exceção.

Ao mexer em cor, rode a validação de contraste: as combinações são conferidas
contra a WCAG 2.2 nas quatro variações de tema, e alterar um valor sem rodar o
script quebra alguém que depende de contraste alto.

Checklist para qualquer tela nova:

- [ ] Alvo de toque de no mínimo 44px (`--ds-touch-min`)
- [ ] Cor nunca é o único portador de significado (ícone ou texto junto)
- [ ] Todo controle tem nome acessível (`aria-label` quando o rótulo é visual)
- [ ] Estado de erro em `role="alert"`, carregamento em `role="status"`
- [ ] Funciona só com teclado, e o foco é visível
- [ ] Tamanhos em `rem`, não `px` — o ajuste de fonte precisa poder crescer
- [ ] Testado com fonte em "extra grande" sem estourar o layout

Movimento respeita `prefers-reduced-motion`, e os tokens de duração já cuidam
disso. Animação infinita precisa ser desligada explicitamente.

---

## Testes

Teste comportamento, não implementação. O nome do teste descreve o que o
usuário obtém, em português.

Vale a pena testar: regra de negócio (o SM-2 é o exemplo), parsing de resposta
de fornecedor, política de segurança (o CORS tem 17 testes por causa de um
incidente), e o caminho que já quebrou uma vez.

Não vale: cobertura por cobertura, nem teste que só repete a implementação.

```
npm test                              # tudo
npm --prefix backend test -- cors     # um arquivo
```

Quando corrigir um bug, o teste que falha antes do conserto é a melhor parte do
PR — é ele que impede o retorno.

---

## Commits e branches

**Conventional Commits**, descrição em português, no imperativo:

```
<tipo>(<escopo>): <descrição em minúscula, sem ponto final>
```

**Tipos:** `feat`, `fix`, `refactor`, `perf`, `style`, `docs`, `test`, `build`,
`ci`, `chore`, `revert`.

**Escopos:** `auth`, `scan`, `contents`, `folders`, `study`, `stats`, `search`,
`design-system`, `ui`, `a11y`, `pwa`, `api`, `db`, `config`, `deps`, `release`.

Nada valida isso automaticamente — conferir o formato é de quem commita.

```
feat(study): adiciona algoritmo de repetição espaçada SM-2
fix(scan): substitui o modelo aposentado do Gemini
```

**O corpo do commit é onde mora o valor.** Explique o problema que existia,
por que a solução é essa, e o que foi verificado. Um commit que diz "corrige
bug" custa horas a quem for investigar dali a seis meses.

Uma branch por assunto, mesclada com `--no-ff` para o histórico preservar o
agrupamento:

```
feat/nome-da-funcionalidade
fix/o-que-quebrou
refactor/o-que-muda
chore/manutencao
docs/o-que-documenta
```

---

## Segurança

- **Segredo nenhum entra no código.** `.env` é ignorado pelo git e continua
  assim. `.env.example` leva só nomes e valores de exemplo.
- **A chave do Gemini nunca chega ao frontend.** A IA é chamada pelo backend.
- **Configuração é validada no boot e o processo não sobe se estiver errada.**
  Já existiu um fallback de `JWT_SECRET` para uma string no código-fonte; em
  produção, com a variável esquecida, qualquer pessoa com acesso ao repositório
  poderia forjar a sessão de qualquer usuário. Falhar no boot é a resposta
  certa.
- **CORS é lista explícita.** Em desenvolvimento a rede local privada também
  passa, porque testar do celular é o uso normal deste projeto — mas só fora de
  produção, e só nas faixas da RFC 1918.
- Imagem enviada para análise é processada em memória e descartada; nunca toca
  o disco do servidor.

---

## Banco de dados

O desenvolvimento usa um PostgreSQL local, e é o único banco do projeto: não há
ambiente publicado.

Migração é sempre versionada (`prisma migrate dev`). Migração escrita à mão —
as que o Prisma não gera sem apagar dados — precisa ser ensaiada em um banco
descartável antes de tocar dado real.

---

## Se você é um agente de IA

Tudo acima vale igual. Além disso:

- **Não invente que testou.** Rode o comando e mostre a saída. Se não deu para
  verificar, diga qual parte ficou sem verificação e por quê.
- **Não faça `git push`** sem pedido explícito. Commit e merge local, sim.
- **Bug primeiro, causa depois, conserto por último.** Reproduza antes de
  propor solução — neste projeto, duas falhas seguidas tinham causa diferente
  da aparente (o "erro ao tirar foto" era um modelo aposentado no Google; o
  "não consigo entrar" era CORS bloqueando o IP da rede local).
- **Escopo é o que foi pedido.** Notou outro problema? Termine o pedido, e
  então mencione o que viu.
