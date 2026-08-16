// Grupo de testes do sistema de skins (v1.8.0; condições declarativas e
// registry data-driven na v1.8.1 — o registry vive em SkinRegistry.js e é
// reescrito pela página /?setup).
//   npm run test-skins
//
// REGRA DA SUÍTE: esta suíte é o PORTÃO do /?setup — ela roda (com rollback)
// a cada gravação da página, e o dono pode editar QUALQUER skin menos o
// default. Logo, nenhum assert pode pinar valores das skins reais (rank da
// gold, condição da catisquick...): a LÓGICA é testada com skins sintéticas
// (push/splice em SKINS) e o registry real só passa por checagens
// ESTRUTURAIS (ids, prefixos, arte em disco, sw.js, JSON estrito).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { StorageManager } = await import('../js/utils/StorageManager.js');
const { SkinSystem, SKINS } = await import('../js/systems/SkinSystem.js');

let pass = 0;
let fail = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}\n      esperado ${w}\n      obtido   ${g}`);
  }
}
function reset() {
  localStorage._m.clear();
}
const has = (list, id) => list.some((s) => (s.id || s) === id);

// ---------- 1. Registry real: só estrutura (valores são do dono) ----------
eq('ids únicos', new Set(SKINS.map((s) => s.id)).size, SKINS.length);
eq('default presente e sem prefix (texturas legadas)',
  [SKINS[0].id, SKINS[0].prefix], ['default', null]);
eq('toda não-default tem prefix no padrão rhino-<id>-run',
  SKINS.filter((s) => s.id !== 'default')
    .every((s) => s.prefix === `rhino-${s.id}-run`), true);
eq('firePrefix, quando existe, segue rhino-<id>-fire-run',
  SKINS.filter((s) => s.firePrefix)
    .every((s) => s.firePrefix === `rhino-${s.id}-fire-run`), true);
eq('access de todas tem um tipo conhecido',
  SKINS.every((s) => ['default', 'rank', 'achievement', 'total'].includes(s.access.type)), true);
eq('get de id desconhecido cai no default', SkinSystem.get('naoexiste').id, 'default');

// ---------- skins sintéticas usadas pelas seções de lógica ----------
const tmpFree = {
  id: 'tmpfree', name: 'Grátis Teste', prefix: 'rhino-tmpfree-run',
  access: { type: 'default' }, desc: 'teste',
};
const tmpRank = {
  id: 'tmprank', name: 'Pódio Teste', prefix: 'rhino-tmprank-run',
  access: { type: 'rank', rank: 2 }, desc: 'teste',
};
const tmpAch = {
  id: 'tmpach', name: 'Conquista Teste', prefix: 'rhino-tmpach-run',
  firePrefix: 'rhino-tmpach-fire-run',
  access: { type: 'achievement', condition: { towersDowned: 5, bossLayers: 3 } }, desc: 'teste',
};
SKINS.push(tmpFree, tmpRank, tmpAch);

// ---------- 2. Acesso ----------
reset();
eq('default sempre desbloqueada', SkinSystem.isUnlocked(SkinSystem.get('default')), true);
eq('skin grátis é equipável sem seed algum', SkinSystem.isEquippable(tmpFree), true);
eq('pódio bloqueado sem rank', SkinSystem.isUnlocked(tmpRank), false);
StorageManager.setLastRank(2);
eq('pódio com o rank EXATO', SkinSystem.isUnlocked(tmpRank), true);
StorageManager.setLastRank(1);
eq('rank melhor que o exigido NÃO vale (cada degrau tem a sua)',
  SkinSystem.isUnlocked(tmpRank), false);
StorageManager.setLastRank(4);
eq('rank pior: bloqueada', SkinSystem.isUnlocked(tmpRank), false);

eq('conquista bloqueada por padrão', SkinSystem.isUnlocked(tmpAch), false);
StorageManager.addSkins(['tmpach']);
eq('conquista desbloqueada após addSkins', SkinSystem.isUnlocked(tmpAch), true);
eq('conquista desbloqueada é equipável', SkinSystem.isEquippable(tmpAch), true);
StorageManager.addSkins(['tmpach']);
eq('addSkins é merge (não duplica)', StorageManager.getSkins(), ['tmpach']);

// ---------- 3. resolveEquipped: pódio dinâmico ----------
reset();
StorageManager.setSelectedSkin('tmprank');
StorageManager.setLastRank(2);
eq('escolhida pódio + rank certo → veste', SkinSystem.resolveEquipped().id, 'tmprank');
StorageManager.setLastRank(5);
eq('caiu do pódio → default na leitura', SkinSystem.resolveEquipped().id, 'default');
eq('...SEM regravar a escolha', StorageManager.getSelectedSkin(), 'tmprank');
StorageManager.setLastRank(2);
eq('voltou ao degrau → a skin volta sozinha', SkinSystem.resolveEquipped().id, 'tmprank');

reset();
StorageManager.setSelectedSkin('id-corrompido');
eq('id desconhecido no storage → default sem lançar', SkinSystem.resolveEquipped().id, 'default');

// ---------- 4. Chaves de anim/textura ----------
eq('default usa as texturas legadas',
  [SkinSystem.runAnimKey(SkinSystem.get('default')), SkinSystem.textureKey(SkinSystem.get('default'), 0)],
  ['rhino-run', 'rhino-run-0']);
eq('skin com prefix usa o próprio',
  [SkinSystem.runAnimKey(tmpRank), SkinSystem.textureKey(tmpRank, 2)],
  ['rhino-tmprank-run', 'rhino-tmprank-run-2']);
eq('fúria: sem firePrefix pega fogo com a arte compartilhada',
  [SkinSystem.fireAnimKey(SkinSystem.get('default')), SkinSystem.fireAnimKey(tmpRank)],
  ['rhino-fire-run', 'rhino-fire-run']);
eq('fúria: firePrefix próprio vale',
  SkinSystem.fireAnimKey(tmpAch), 'rhino-tmpach-fire-run');

// ---------- 5. Conquista por corrida: evaluateRun ----------
reset();
eq('condição composta satisfeita concede',
  has(SkinSystem.evaluateRun({ towersDowned: 5, bossLayers: 3 }), 'tmpach'), true);
eq('segunda chamada é idempotente (nada novo)',
  SkinSystem.evaluateRun({ towersDowned: 5, bossLayers: 3 }), []);
eq('...mas a skin segue possuída', has(StorageManager.getSkins(), 'tmpach'), true);
reset();
eq('um critério abaixo: NÃO concede',
  has(SkinSystem.evaluateRun({ towersDowned: 4, bossLayers: 3 }), 'tmpach'), false);
eq('o outro critério abaixo: NÃO concede',
  has(SkinSystem.evaluateRun({ towersDowned: 5, bossLayers: 2 }), 'tmpach'), false);
eq('sem argumento: não explode nem concede', SkinSystem.evaluateRun(), []);

// ---------- 6. Retro-scan de runs[] (contadores de 1 letra) ----------
reset();
StorageManager.addRun(1200, 90, 'win', { towersDowned: 5, bossLayersBroken: 3 });
SkinSystem.migrateFromRuns();
eq('retro-scan concede pela janela de 50', has(StorageManager.getSkins(), 'tmpach'), true);
reset();
StorageManager.addRun(1200, 90, 'win', { towersDowned: 4, bossLayersBroken: 3 });
StorageManager.addRun(800, 70, 'wall', { towersDowned: 5 });
SkinSystem.migrateFromRuns();
eq('retro-scan: façanha repartida em 2 corridas NÃO conta',
  has(StorageManager.getSkins(), 'tmpach'), false);

// ---------- 7. Telemetria runs[].g ----------
reset();
StorageManager.addRun(500, 40, 'wall', { skin: 'gold' });
StorageManager.addRun(300, 30, 'wall', { skin: 'default' });
StorageManager.addRun(200, 20, 'wall', {});
const runs = StorageManager.getRuns();
eq('skin não-default vira run.g', runs[0].g, 'gold');
eq('default é omitido (byte-budget)', 'g' in runs[1], false);
eq('sem skin no extra: sem chave g', 'g' in runs[2], false);
eq('g truncado em 8 chars',
  (StorageManager.addRun(100, 10, 'wall', { skin: 'nomecomprido' }), StorageManager.getRuns().at(-1).g),
  'nomecomp');

// ---------- 8. Condições declarativas (conditionMet) ----------
eq('condition vazia nunca passa (skin impossível > liberada por engano)',
  SkinSystem.conditionMet({}, { meters: 9999 }), false);
eq('numérica é "pelo menos N"',
  [SkinSystem.conditionMet({ meters: 100 }, { meters: 100 }),
    SkinSystem.conditionMet({ meters: 100 }, { meters: 99 })],
  [true, false]);
eq('AND: todas as chaves precisam passar',
  SkinSystem.conditionMet({ meters: 100, towersDowned: 2 }, { meters: 500, towersDowned: 1 }),
  false);
eq('booleana exige o valor exato',
  [SkinSystem.conditionMet({ escaped: true }, { escaped: true }),
    SkinSystem.conditionMet({ escaped: true }, {})],
  [true, false]);
eq('chave desconhecida no condition nunca passa',
  SkinSystem.conditionMet({ naoexiste: 1 }, { meters: 9999 }), false);

// ---------- 9. Tipo "total" + evaluateTotals ----------
const tmpTotal = {
  id: 'tmptotal', name: 'Veterano', prefix: 'rhino-tmptotal-run',
  access: { type: 'total', condition: { attempts: 3, wins: 1 } }, desc: 'teste',
};
SKINS.push(tmpTotal);
reset();
eq('total bloqueada sem os agregados', SkinSystem.isUnlocked(tmpTotal), false);
eq('evaluateTotals sem os agregados: nada', SkinSystem.evaluateTotals(), []);
localStorage.setItem('furious_rhino_attempts', '3');
localStorage.setItem('furious_rhino_wins', '1');
eq('isUnlocked ao vivo (rede de segurança, antes do evaluate)',
  SkinSystem.isUnlocked(tmpTotal), true);
eq('evaluateTotals concede e devolve a novidade',
  has(SkinSystem.evaluateTotals(), 'tmptotal'), true);
eq('...e grava permanente', has(StorageManager.getSkins(), 'tmptotal'), true);
eq('segunda chamada é idempotente', SkinSystem.evaluateTotals(), []);

// ---------- 10. Conquista genérica: meters/escaped + retro-scan ----------
const tmpRunner = {
  id: 'tmprunner', name: 'Maratonista', prefix: 'rhino-tmprunner-run',
  access: { type: 'achievement', condition: { meters: 1500, escaped: true } }, desc: 'teste',
};
SKINS.push(tmpRunner);
reset();
eq('evaluateRun genérico: 1500m sem fuga NÃO concede',
  has(SkinSystem.evaluateRun({ meters: 1600, escaped: false }), 'tmprunner'), false);
eq('evaluateRun genérico: 1500m + fuga concede',
  has(SkinSystem.evaluateRun({ meters: 1600, escaped: true }), 'tmprunner'), true);
reset();
StorageManager.addRun(1600, 120, 'spike', {}); // 1600m morre depois do portão: fugiu
SkinSystem.migrateFromRuns();
eq('retro-scan: escaped deriva de m>=1000 mesmo sem c=win',
  has(StorageManager.getSkins(), 'tmprunner'), true);
reset();
StorageManager.addRun(900, 80, 'win', {}); // c=win vale como fuga (dado legado)
SkinSystem.migrateFromRuns();
eq('retro-scan: c=win vale como fuga, mas 900m < 1500m NÃO concede',
  has(StorageManager.getSkins(), 'tmprunner'), false);
reset();
StorageManager.addRun(1600, 120, 'win', {});
SkinSystem.migrateFromRuns();
eq('retro-scan: 1600m + win concede', has(StorageManager.getSkins(), 'tmprunner'), true);

// ---------- 11. requirementText (copy do cadeado gerada da condition) ----------
eq('requirement de conquista composta',
  SkinSystem.requirementText(tmpAch),
  'Derrube 5 torres e vença o caçador do portão na mesma corrida.');
eq('requirement de conquista simples',
  SkinSystem.requirementText({ access: { type: 'achievement', condition: { meters: 3000 } } }),
  'Corra 3000m em uma corrida.');
eq('requirement de fuga + camadas parciais',
  SkinSystem.requirementText({ access: { type: 'achievement', condition: { bossLayers: 2, escaped: true } } }),
  'Quebre 2 camadas do portão e escape do zoológico na mesma corrida.');
eq('requirement de totais',
  SkinSystem.requirementText(tmpTotal),
  'Jogue 3 corridas e complete 1 fuga no total.');
eq('requirement de 3 partes usa vírgula',
  SkinSystem.requirementText({ access: { type: 'total', condition: { attempts: 100, wins: 10, animals: 500 } } }),
  'Jogue 100 corridas, complete 10 fugas e atropele 500 animais no total.');
eq('condition vazia cai na desc', SkinSystem.requirementText({
  access: { type: 'achievement', condition: {} }, desc: 'fallback',
}), 'fallback');
eq('rank cai na desc', SkinSystem.requirementText({
  access: { type: 'rank', rank: 1 }, desc: 'só do topo',
}), 'só do topo');

// ---------- 12. Flag hidden ("fora do jogo", v2 do /?setup) ----------
const tmpHid = {
  id: 'tmphid', name: 'Escondida', prefix: 'rhino-tmphid-run',
  access: { type: 'default' }, desc: 'teste', hidden: true,
};
const tmpHidAch = {
  id: 'tmphidach', name: 'Escondida 2', prefix: 'rhino-tmphidach-run',
  access: { type: 'achievement', condition: { meters: 1 } }, desc: 'teste', hidden: true,
};
const tmpHidTotal = {
  id: 'tmphidtot', name: 'Escondida 3', prefix: 'rhino-tmphidtot-run',
  access: { type: 'total', condition: { attempts: 1 } }, desc: 'teste', hidden: true,
};
SKINS.push(tmpHid, tmpHidAch, tmpHidTotal);
reset();
eq('hidden continua desbloqueada, mas NUNCA equipável',
  [SkinSystem.isUnlocked(tmpHid), SkinSystem.isEquippable(tmpHid)], [true, false]);
StorageManager.setSelectedSkin('tmphid');
eq('equipada que ficou hidden → default na leitura', SkinSystem.resolveEquipped().id, 'default');
eq('...sem regravar a escolha (a flag é reversível)',
  StorageManager.getSelectedSkin(), 'tmphid');
delete tmpHid.hidden;
eq('flag removida → a skin volta sozinha', SkinSystem.resolveEquipped().id, 'tmphid');
localStorage.setItem('furious_rhino_attempts', '5');
StorageManager.addRun(2000, 100, 'win', {});
eq('evaluateRun não concede skin hidden',
  has(SkinSystem.evaluateRun({ meters: 2000 }), 'tmphidach'), false);
eq('evaluateTotals não concede skin hidden',
  has(SkinSystem.evaluateTotals(), 'tmphidtot'), false);
SkinSystem.migrateFromRuns();
eq('retro-scan também pula hidden', has(StorageManager.getSkins(), 'tmphidach'), false);
delete tmpHidAch.hidden;
SkinSystem.migrateFromRuns();
eq('flag removida → o retro-scan do boot seguinte concede',
  has(StorageManager.getSkins(), 'tmphidach'), true);

// limpa as sintéticas antes da consistência com o disco
for (const t of [tmpFree, tmpRank, tmpAch, tmpTotal, tmpRunner, tmpHid, tmpHidAch, tmpHidTotal]) {
  SKINS.splice(SKINS.indexOf(t), 1);
}
reset();

// ---------- 13. Consistência registry ↔ art/ ↔ sw ----------
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
for (const skin of SKINS) {
  if (skin.pending) continue; // hidden NÃO pula: a arte existe e fica no cache
  for (const prefix of [skin.prefix, skin.firePrefix].filter(Boolean)) {
    const missingArt = [0, 1, 2].filter((f) => !existsSync(join(ROOT, 'art', `${prefix}-${f}.svg`)));
    const missingSw = [0, 1, 2].filter((f) => !sw.includes(`./art/${prefix}-${f}.svg`));
    eq(`${prefix}: 3 SVGs em art/`, missingArt, []);
    eq(`${prefix}: 3 SVGs no ASSETS do sw.js`, missingSw, []);
  }
}
// O caminho inverso: TODO './art/*.svg' do ASSETS existe no disco. É a rede
// de segurança da remoção física de uma original (v3 do /?setup): se a linha
// manuscrita dela sobrar no sw, o cache.addAll dá 404 e o PWA não instala —
// este assert fica vermelho e o servidor faz rollback da gravação.
eq('nenhuma sobra no ASSETS: todo ./art/*.svg do sw existe no disco',
  [...sw.matchAll(/'\.\/(art\/[^']+\.svg)'/g)].map((m) => m[1])
    .filter((rel) => !existsSync(join(ROOT, ...rel.split('/')))), []);
eq('SkinSystem.js está no ASSETS do sw.js', sw.includes('./js/systems/SkinSystem.js'), true);
eq('SkinRegistry.js está no ASSETS do sw.js', sw.includes('./js/systems/SkinRegistry.js'), true);
// Os marcadores do bloco gerenciado pelo /?setup existem exatamente 1x cada
eq('marcador @setup:skins existe 1x',
  sw.split('// @setup:skins —').length - 1, 1);
eq('marcador @setup:skins:fim existe 1x',
  sw.split('// @setup:skins:fim').length - 1, 1);
// O registry é JSON estrito parseável (contrato do round-trip do servidor)
const registrySrc = readFileSync(join(ROOT, 'js', 'systems', 'SkinRegistry.js'), 'utf8');
const jsonSlice = registrySrc.slice(registrySrc.indexOf('['), registrySrc.lastIndexOf(']') + 1);
let registryParsed = null;
try { registryParsed = JSON.parse(jsonSlice); } catch (e) { /* fica null */ }
eq('SkinRegistry.js: miolo é JSON estrito', Array.isArray(registryParsed), true);
eq('SkinRegistry.js: mesmo conteúdo importado', registryParsed ? registryParsed.length : 0, SKINS.length);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
