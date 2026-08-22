// ATENÇÃO: arquivo de DADOS, gerado e reescrito pela página /?setup (via
// gerador-de-sprites/server.mjs). Dá para editar à mão, mas a próxima
// gravação da página reformata tudo — o miolo é JSON ESTRITO de propósito
// (o servidor faz o round-trip por texto, sem import()).
//
// Cada entrada: { id, name, prefix, firePrefix?, access, desc, pending?, hidden? }
// access:
//   { "type": "default" }                            — grátis
//   { "type": "rank", "rank": N }                    — pódio (rank EXATO)
//   { "type": "achievement", "condition": { ... } }  — façanha numa corrida
//       chaves: meters, towersDowned, bossLayers, escaped (AND; número = "≥ N")
//   { "type": "total", "condition": { ... } }        — totais de vida
//       chaves: attempts, wins, animals (AND; número = "≥ N")
// A lógica (desbloqueio, textura, anim) vive no SkinSystem, que importa e
// re-exporta esta lista — ninguém mais importa daqui.
export const SKINS = [
  {
    "id": "default",
    "name": "Furious Rhino",
    "prefix": null,
    "access": {"type":"default"},
    "desc": "O original."
  },
  {
    "id": "party",
    "name": "Thanks for playing",
    "prefix": "rhino-party-run",
    "access": {"type":"default"},
    "desc": "🎉 De graça, pela companhia — chapéu e língua-de-sogra."
  },
  {
    "id": "robot",
    "name": "Rino Robô",
    "prefix": "rhino-robot-run",
    "access": {"type":"default"},
    "desc": "🤖 De graça — latão, vapor e um chifre de energia."
  },
  {
    "id": "gold",
    "name": "Rino de Ouro",
    "prefix": "rhino-gold-run",
    "access": {"type":"rank","rank":1},
    "desc": "🥇 Exclusiva do nº 1 do mundo.",
    "hidden": true
  },
  {
    "id": "bronze",
    "name": "Rino de Bronze",
    "prefix": "rhino-bronze-run",
    "access": {"type":"rank","rank":3},
    "desc": "🥉 Exclusiva do nº 3 do mundo.",
    "hidden": true
  },
  {
    "id": "pratagrande",
    "name": "MecaSilver",
    "prefix": "rhino-pratagrande-run",
    "access": {"type":"rank","rank":2},
    "desc": ""
  },
  {
    "id": "1-gold",
    "name": "MecaGold",
    "prefix": "rhino-1-gold-run",
    "access": {"type":"rank","rank":1},
    "desc": "Mecanico Dourado"
  },
  {
    "id": "bronze-2",
    "name": "MecaBronze",
    "prefix": "rhino-bronze-2-run",
    "access": {"type":"rank","rank":3},
    "desc": "Bronze Mecanico"
  },
  {
    "id": "catisquicksrhino",
    "name": "Rhino do Catisquick",
    "prefix": "rhino-catisquicksrhino-run",
    "access": {"type":"achievement","condition":{"towersDowned":5,"bossLayers":3}},
    "desc": "feito pelo GOAT 😎"
  },
  {
    "id": "mecacolor",
    "name": "Meca Color",
    "prefix": "rhino-mecacolor-run",
    "access": {"type":"default"},
    "desc": "Meca Color"
  }
];
