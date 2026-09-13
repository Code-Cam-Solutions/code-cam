/**
 * Escolha da voz da leitura em voz alta.
 *
 * Vive fora do contexto porque é decisão pura — dada uma lista de vozes,
 * qual usar — e porque errar aqui é audível: o app lia texto em português do
 * Brasil com sotaque de Portugal, que muda pronúncia, vocabulário e ritmo o
 * bastante para atrapalhar justamente quem depende da leitura para estudar.
 *
 * A causa era um `lang.startsWith("pt")`, que casa com `pt-BR` e `pt-PT` sem
 * distinção: ganhava quem aparecesse primeiro na lista do sistema.
 */

/** Normaliza `pt_BR`, `pt-br` e `pt-BR` na mesma forma. */
function normalize(lang: string): string {
  return lang.toLowerCase().replace("_", "-");
}

const isBrazilian = (voice: SpeechSynthesisVoice) => normalize(voice.lang) === "pt-br";
const isPortuguese = (voice: SpeechSynthesisVoice) => normalize(voice.lang).startsWith("pt");

/**
 * Devolve a melhor voz disponível, ou `null` para deixar o navegador decidir.
 *
 * A ordem de preferência é deliberada:
 *
 *   1. pt-BR instalada no aparelho — sotaque certo, e não depende de rede
 *   2. pt-BR de qualquer origem — o sotaque importa mais que a latência
 *   3. qualquer português instalado — melhor que uma voz inglesa lendo
 *      português, que é o que acontece sem voz alguma escolhida
 *   4. qualquer português
 */
export function pickVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find((voice) => isBrazilian(voice) && voice.localService) ??
    voices.find(isBrazilian) ??
    voices.find((voice) => isPortuguese(voice) && voice.localService) ??
    voices.find(isPortuguese) ??
    null
  );
}
