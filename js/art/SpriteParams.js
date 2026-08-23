// ATENÇÃO: arquivo de DADOS, gerado e reescrito pela aba 🖼️ Sprites do
// /?setup (via gerador-de-sprites/server.mjs). O miolo é JSON ESTRITO — o
// servidor faz o round-trip por TEXTO (sem import(): o cache de módulo do
// node devolveria versão velha), fatiando do primeiro '{' após a declaração
// (a linha do export) até o último '}' do arquivo.
//
// REGRAS (tools/test-sprites.mjs as vigia; violar = gravação revertida):
//  - NENHUM import aqui (o Constants importa este arquivo — ciclo mata o boot);
//  - nada de código depois do objeto;
//  - "overrides": { "especie": { "specs": {...}, "behavior": {...} } } —
//    merge raso por chave; sub-objetos (zig/shoot/fly) substituem INTEIRO;
//    valor null APAGA a chave; w/h/tex/anim/pair proibidos aqui;
//  - "novas": espécies criadas pela aba — specs completos + behavior +
//    "anim" ({"sufixo","fps"} | {"sufixo":"air"} | null) +
//    "casts" ({"biomas":[...], "distritos":[...]}).
export const SPRITE_PARAMS = {
  "version": 1,
  "overrides": {},
  "novas": []
};
