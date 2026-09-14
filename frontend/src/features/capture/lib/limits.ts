/**
 * Quantas fotos podem descrever o mesmo material.
 *
 * Espelha `MAX_IMAGES_PER_SCAN` do backend, que é quem recusa de fato. Aqui o
 * valor serve para a interface parar de oferecer "adicionar foto" antes de o
 * usuário levar um erro — validar só no servidor funcionaria, mas só depois de
 * ele já ter tirado a foto.
 *
 * Três porque cada imagem soma tempo à resposta, e a análise já leva de 10 a 20
 * segundos com uma.
 */
export const MAX_PHOTOS_PER_SCAN = 3;
