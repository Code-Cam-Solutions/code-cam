import { lastDays } from './stats.service';

/*
 * Estes testes existem por causa de um defeito que passou por outro teste.
 *
 * A série do gráfico era montada somando dias a um instante e convertendo cada
 * um para o fuso do estudante. O instante era meia-noite UTC — que em São Paulo
 * é 21h do dia anterior —, então a série inteira saía um dia atrás e o dia de
 * hoje não existia nela. `reviewedToday` passava a contar ontem, e a sequência
 * era calculada sobre uma janela desatualizada.
 *
 * O defeito só aparecia das 0h às 21h. Depois das 21h a data em UTC alcança a
 * de São Paulo e tudo parecia certo — que é exatamente o horário em que o
 * conserto anterior, do agrupamento, foi verificado à mão.
 */
describe('lastDays', () => {
  const comRelogio = <T>(iso: string, executar: () => T): T => {
    jest.useFakeTimers().setSystemTime(new Date(iso));
    try {
      return executar();
    } finally {
      jest.useRealTimers();
    }
  };

  it('termina no dia de hoje no fuso do estudante, não no de UTC', () => {
    // 16/09 às 23h26 em UTC são 20h26 do dia 16 em São Paulo.
    const serie = comRelogio('2026-09-16T23:26:00Z', () => lastDays(14, 'America/Sao_Paulo'));

    expect(serie.at(-1)).toBe('2026-09-16');
    expect(serie).toHaveLength(14);
  });

  it('cobre a janela inteira, sem buraco nem repetição', () => {
    const serie = comRelogio('2026-09-16T23:26:00Z', () => lastDays(14, 'America/Sao_Paulo'));

    expect(serie[0]).toBe('2026-09-03');
    expect(new Set(serie).size).toBe(14);
  });

  /*
   * O horário em que o defeito se escondia: com UTC e São Paulo na mesma data,
   * a versão antiga acertava. O teste fixa os dois lados da fronteira.
   */
  it('acerta tanto antes quanto depois de a data virar em UTC', () => {
    // 21h30 em São Paulo já é 00h30 do dia seguinte em UTC.
    const aNoite = comRelogio('2026-09-17T00:30:00Z', () => lastDays(14, 'America/Sao_Paulo'));
    // 9h da manhã em São Paulo, com as duas datas iguais.
    const deDia = comRelogio('2026-09-16T12:00:00Z', () => lastDays(14, 'America/Sao_Paulo'));

    expect(aNoite.at(-1)).toBe('2026-09-16');
    expect(deDia.at(-1)).toBe('2026-09-16');
  });

  it('atravessa a virada de mês sem inventar dia', () => {
    const serie = comRelogio('2026-10-02T15:00:00Z', () => lastDays(7, 'America/Sao_Paulo'));

    expect(serie).toEqual([
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });

  it('serve um estudante em fuso adiantado em relação a UTC', () => {
    // Em Tóquio, 8h do dia 17 ainda são 23h do dia 16 em UTC.
    const serie = comRelogio('2026-09-16T23:00:00Z', () => lastDays(5, 'Asia/Tokyo'));

    expect(serie.at(-1)).toBe('2026-09-17');
  });
});
