/*
 * Os testes rodam com `TZ=UTC`, definido no script do package.json — o mesmo
 * fuso do servidor em produção.
 *
 * Não é preciosismo. As estatísticas convertem instantes para o fuso do
 * estudante, e um defeito nessa conversão só aparece quando o servidor está em
 * um fuso diferente do dele. Rodando na máquina de quem desenvolve, que aqui
 * fica em São Paulo, o código antigo passava — e o gráfico de atividade
 * chegava à produção sem o dia de hoje.
 */

/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/../tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@common/(.*)$": "<rootDir>/common/$1",
    "^@config/(.*)$": "<rootDir>/config/$1",
    "^@infra/(.*)$": "<rootDir>/infra/$1",
    "^@modules/(.*)$": "<rootDir>/modules/$1",
  },
  collectCoverageFrom: ["**/*.(t|j)s", "!**/*.module.ts", "!**/main.ts", "!**/*.dto.ts"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  clearMocks: true,
};
