/**
 * Conventional Commits — https://www.conventionalcommits.org
 *
 * Formato:  <tipo>(<escopo>): <descrição>
 * Exemplo:  feat(study): adiciona algoritmo de repetição espaçada SM-2
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // nova funcionalidade
        "fix", // correção de bug
        "refactor", // mudança de código sem alterar comportamento
        "perf", // melhoria de performance
        "style", // formatação, sem impacto em lógica
        "docs", // documentação
        "test", // testes
        "build", // build system ou dependências
        "ci", // integração contínua
        "chore", // manutenção geral
        "revert", // reverte um commit anterior
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "auth",
        "scan",
        "contents",
        "folders",
        "study",
        "stats",
        "search",
        "design-system",
        "ui",
        "a11y",
        "pwa",
        "api",
        "db",
        "config",
        "deps",
        "release",
      ],
    ],
    "scope-empty": [1, "never"],
    "subject-case": [2, "never", ["upper-case", "pascal-case", "start-case"]],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [0],
  },
};
