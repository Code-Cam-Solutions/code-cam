import { IsOptional, IsTimeZone } from 'class-validator';

export class StatsQueryDto {
  /**
   * Fuso do estudante, no formato IANA (`America/Sao_Paulo`).
   *
   * Sem isto, "estudou hoje" seria calculado em UTC — e no Brasil, das 21h à
   * meia-noite, toda revisão contaria para o dia seguinte. É exatamente a
   * janela em que a maioria dos estudantes estuda, então a sequência de dias
   * ficaria errada justamente para quem mais usa o app.
   */
  @IsOptional()
  @IsTimeZone({ message: 'Fuso horário inválido. Use o formato IANA, ex.: America/Sao_Paulo.' })
  timezone?: string;
}
