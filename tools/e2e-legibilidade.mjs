// e2e de LEGIBILIDADE — mede o contraste de cada inimigo contra o fundo real
// da cena, no lugar e no clima em que ele nasce (v1.12.3 "Farol").
//
//   node tools/e2e-legibilidade.mjs                 → mede tudo e diz PASS/FAIL
//   node tools/e2e-legibilidade.mjs --salvar        → grava os PNGs em tools/snapshots/
//   node tools/e2e-legibilidade.mjs --especie=tropa → mede uma espécie só
//
// POR QUE EXISTE. O feedback do dono em 05/09: "o contraste da fase da cidade
// não está bom, o cenário está confundindo com os inimigos". A radiografia
// confirmou com número — na faixa 1000-1400 m o dardo responde por 27% das
// mortes contra ~7% no zoo. Mas "está ruim" não é critério de aceite: sem uma
// régua, o passe de legibilidade vira questão de gosto e a próxima release
// não sabe se melhorou ou piorou.
//
// COMO MEDE. Para cada espécie, em cada ponto de teste:
//   A = foto da cena COM o inimigo · B = a MESMA foto sem ele (setVisible)
//   M = máscara do inimigo (onde A e B diferem)  → os pixels que são o bicho
//   E = a BORDA de M (M menos sua erosão)        → a silhueta
//   F = o anel de FUNDO em volta (dilatações de M, subtraídas)
// Compara a luminância WCAG da borda com a do fundo local. A borda passa se
// tiver um componente CLARO contra fundo escuro (o rim, à noite) OU um
// componente ESCURO contra fundo claro (o contorno, de dia) — por isso o
// contraste é o máximo das duas razões, não a diferença das médias.
//
// ACEITE (WCAG 1.4.11 para elemento gráfico + separação de valor perceptual):
//   contraste de borda >= 3,0  E  |ΔL*| >= 30
//
// Sonda `claude-*` + notify_off: não grava no Firestore (regra 5 do CLAUDE.md).
import { chromium } from 'playwright';
import Jimp from 'jimp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALVO = process.env.ALVO || 'http://localhost:3000/';
const SALVAR = process.argv.includes('--salvar');
const SO_ESSA = (process.argv.find((a) => a.startsWith('--especie=')) || '').split('=')[1] || '';

// ---------------------------------------------------------------- os pontos
// Escolhidos por serem os piores casos REAIS, não por conveniência:
// o céu escurece de 800 a 1000 m e cicla a cada 600 m a partir de 1450 m.
const PONTOS = [
  { id: 'D1-noite', x: 55800, clima: 'limpo', nota: '1395 m — Subúrbio, noite quase fechada' },
  { id: 'D2-chuva', x: 58000, clima: 'chuva', nota: '1450 m — o instante MAIS ESCURO da cidade, na chuva' },
  { id: 'D2-dia', x: 66000, clima: 'limpo', nota: '1650 m — o Despertar já amanheceu (contraprova de dia)' },
  { id: 'D3-noite', x: 82000, clima: 'limpo', nota: '2050 m — Contenção, blecaute tático' },
];

// O elenco de cada distrito (espelho de CITY_DISTRICTS; a cena confirma)
const ELENCO = {
  'D1-noite': ['person', 'suit', 'scooter', 'viralata', 'gatobeco', 'pombo', 'reporter'],
  'D2-chuva': ['car', 'police', 'drone', 'reporter', 'pipa', 'helinews', 'camionete', 'k9'],
  'D2-dia': ['car', 'police', 'drone', 'pipa', 'helinews', 'camionete', 'k9'],
  'D3-noite': ['plane', 'pickup', 'camionete', 'k9', 'tropa', 'dronezig', 'dronesent'],
};

const ACEITE_CONTRASTE = 3.0;
const ACEITE_DELTA_L = 30;

let pass = 0;
let fail = 0;
const ok = (n, c, det = '') => {
  if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n} ${det}`); }
};

// ------------------------------------------------------------ colorimetria
// Luminância relativa da WCAG (canal linearizado) e L* do CIELAB.
const canal = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lumY = (r, g, b) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
const estrelaL = (Y) => (Y <= 0.008856 ? 903.3 * Y : 116 * Math.cbrt(Y) - 16);
const razao = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const quantil = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const media = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

// ----------------------------------------------------------- morfologia
// Dilatação por vizinhança-4, `r` passos. A máscara é pequena (o recorte do
// bicho), então força bruta é mais barata que qualquer estrutura esperta.
function dilatar(mask, w, h, r) {
  let atual = mask;
  for (let passo = 0; passo < r; passo++) {
    const prox = new Uint8Array(atual);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (atual[i]) continue;
        if ((x > 0 && atual[i - 1]) || (x < w - 1 && atual[i + 1])
          || (y > 0 && atual[i - w]) || (y < h - 1 && atual[i + w])) prox[i] = 1;
      }
    }
    atual = prox;
  }
  return atual;
}
const erodir = (mask, w, h, r) => {
  const inv = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) inv[i] = mask[i] ? 0 : 1;
  const invD = dilatar(inv, w, h, r);
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = mask[i] && !invD[i] ? 1 : 0;
  return out;
};

// --------------------------------------------------------------- a medida
async function medir(bufA, bufB) {
  const A = await Jimp.read(bufA);
  const B = await Jimp.read(bufB);
  const w = A.bitmap.width;
  const h = A.bitmap.height;
  const da = A.bitmap.data;
  const db = B.bitmap.data;

  // máscara: onde a cena mudou ao esconder o sprite
  const M = new Uint8Array(w * h);
  let minX = w; let minY = h; let maxX = -1; let maxY = -1;
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const dif = Math.max(
      Math.abs(da[p] - db[p]), Math.abs(da[p + 1] - db[p + 1]), Math.abs(da[p + 2] - db[p + 2])
    );
    if (dif > 8) {
      M[i] = 1; n++;
      const x = i % w; const y = (i / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (n < 200) return { erro: `sprite não apareceu na cena (${n} px de diferença)` };

  // recorte: caixa do bicho + margem para o anel de fundo caber
  const MG = 14;
  const rx = Math.max(0, minX - MG); const ry = Math.max(0, minY - MG);
  const rw = Math.min(w - 1, maxX + MG) - rx + 1;
  const rh = Math.min(h - 1, maxY + MG) - ry + 1;
  const crop = (src) => {
    const out = new Uint8Array(rw * rh);
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) out[y * rw + x] = src[(ry + y) * w + (rx + x)];
    }
    return out;
  };
  const Mc = crop(M);

  const borda = new Uint8Array(rw * rh);
  const ero = erodir(Mc, rw, rh, 4);
  for (let i = 0; i < Mc.length; i++) borda[i] = Mc[i] && !ero[i] ? 1 : 0;

  const d2 = dilatar(Mc, rw, rh, 2);
  const d8 = dilatar(Mc, rw, rh, 8);
  const anel = new Uint8Array(rw * rh);
  for (let i = 0; i < anel.length; i++) anel[i] = d8[i] && !d2[i] ? 1 : 0;

  const yBorda = [];
  const yFundo = [];
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const i = y * rw + x;
      const p = ((ry + y) * w + (rx + x)) * 4;
      if (borda[i]) yBorda.push(lumY(da[p], da[p + 1], da[p + 2]));
      // o anel sai da foto SEM o bicho: fundo puro, sem contaminação
      else if (anel[i]) yFundo.push(lumY(db[p], db[p + 1], db[p + 2]));
    }
  }
  if (yBorda.length < 40 || yFundo.length < 40) return { erro: 'borda ou anel pequenos demais' };

  const fundo = media(yFundo);
  const claro = quantil(yBorda, 0.9);
  const escuro = quantil(yBorda, 0.1);
  const contraste = Math.max(razao(claro, fundo), razao(fundo, escuro));
  const deltaL = Math.max(
    Math.abs(estrelaL(claro) - estrelaL(fundo)), Math.abs(estrelaL(fundo) - estrelaL(escuro))
  );
  return {
    contraste, deltaL,
    fundoL: estrelaL(fundo), claroL: estrelaL(claro), escuroL: estrelaL(escuro),
    px: n,
  };
}

// ------------------------------------------------------------------- cena
const browser = await chromium.launch();
// `serviceWorkers: 'block'` NÃO é detalhe: o sw.js serve `art/*` como
// cache-first com revalidação (SWR, v1.9.7). Sem bloquear, a medição lê a
// arte da visita ANTERIOR e o resultado oscila entre execuções — foi o que
// aconteceu na calibração do rim (a mesma espécie deu 2,85 e 2,45).
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  serviceWorkers: 'block',
});
const page = await ctx.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
await page.addInitScript(() => {
  localStorage.setItem('furious_rhino_player_id', 'claude-e2e-legib');
  localStorage.setItem('furious_rhino_notify_off', '1');
  localStorage.setItem('furious_rhino_record', '3000');
  sessionStorage.setItem('furious_rhino_pwa_prompted', '1');
});
await page.goto(`${ALVO}?debug=1`, { waitUntil: 'domcontentloaded' });
// Esperar a CENA existir não basta: o `startRun` usa `this.audio`, que só
// nasce quando o create() termina. Contra a produção (boot de rede, não de
// cache) a diferença aparece — a suíte quebrava com "audio is undefined".
await page.waitForFunction(() => {
  const s = window.game && window.game.scene.getScene('GameScene');
  return Boolean(s && s.audio && s.rhino && s.spawnManager);
}, null, { timeout: 60000 });
await page.waitForTimeout(900);
await page.evaluate(() => {
  document.querySelectorAll('.lil-gui, #pwa-modal').forEach((e) => e.remove());
  const s = window.game.scene.getScene('GameScene');
  s.startRun();
  s.invincible = true;                       // o clamp do boss exige (doc §13)
  s.spawnManager.nextSpawnX = 1e9;           // nada nasce sozinho na foto
  // Silencia o que é ALEATÓRIO por frame. O que fica é o sistemático — o
  // tint da noite, a neblina e o desenho do cenário —, que é o que a
  // medição quer julgar. Folha ao vento, chuva e pássaros de fundo mudam o
  // anel de fundo a cada execução e transformariam a régua em sorteio.
  if (s.leafEmitter) s.leafEmitter.stop();
  if (s.rain) s.rain.stop();
  if (s.skyBirds) s.skyBirds.forEach((b) => b.setVisible(false));
  if (s.windEmitter) s.windEmitter.stop();
});
await page.waitForTimeout(400);

const linhas = [];
for (const ponto of PONTOS) {
  const elenco = ELENCO[ponto.id].filter((e) => !SO_ESSA || e === SO_ESSA);
  if (!elenco.length) continue;
  console.log(`
── ${ponto.id} · ${ponto.nota}`);

  // 1. Posiciona o mundo com a cena RODANDO (o crossfade de bioma, o tint da
  //    hora e o tween da neblina precisam de tempo real para assentar) e com
  //    a câmera SOLTA do rino — senão ela o segue e, ao fim da espera, a foto
  //    sai 660 px adiante do ponto que se queria medir.
  await page.evaluate(({ x, clima }) => {
    const s = window.game.scene.getScene('GameScene');
    s.scene.resume();
    s.spawnManager.getAnimalsGroup().children.entries.forEach((a) => a.deactivate());
    s.cameras.main.stopFollow();
    s.rhino.getSprite().body.reset(x, 450);
    s.cameras.main.setScroll(x - 440, 0);
    s.setWeather(clima);
  }, { x: ponto.x, clima: ponto.clima });
  await page.waitForTimeout(2200);

  // 2. CONGELA. Daqui em diante nada se move: cada espécie nasce, é
  //    fotografada e sai, sempre contra o MESMO fundo, pixel a pixel. É o que
  //    torna a régua repetível — sem isso a cena deriva entre uma espécie e a
  //    seguinte e os números viram sorteio.
  await page.evaluate(({ x }) => {
    const s = window.game.scene.getScene('GameScene');
    // O teleporte para além dos 1000 m dispara o crossGate: confete e fogos
    // ficam sobrevoando e ENTRAM na borda medida, inflando o contraste.
    s.children.list.forEach((o) => {
      if (o && typeof o.stop === 'function' && o.emitting !== undefined) o.stop();
    });
    if (s.rain) s.rain.stop();
    if (s.leafEmitter) s.leafEmitter.stop();
    if (s.skyBirds) s.skyBirds.forEach((b) => b.setVisible(false));
    s.cameras.main.setScroll(x - 440, 0);
    s.scene.pause();
  }, { x: ponto.x });
  await page.waitForTimeout(500);           // as partículas já no ar somem

  for (const especie of elenco) {
    const nasceu = await page.evaluate(async ({ x, especie }) => {
      const { Constants } = await import('./js/utils/Constants.js');
      const s = window.game.scene.getScene('GameScene');
      const b = Constants.ANIMAL_BEHAVIOR[especie] || {};
      const voa = Boolean(b.fly || (b.zig && b.zig.band));
      // com a cena pausada o spawn é síncrono: o sprite aparece no lugar e
      // fica parado — nem física, nem tween, nem animação de quadro
      s.spawnManager.spawnAnimal(x + 520, especie, voa ? Constants.flyerSpawnY(especie) : null);
      const vivo = s.spawnManager.getAnimalsGroup().children.entries.find((a) => a.active);
      return vivo ? { x: Math.round(vivo.x), y: Math.round(vivo.y) } : null;
    }, { x: ponto.x, especie });

    if (!nasceu) { ok(`[${ponto.id}] ${especie}: nasceu na cena`, false, 'pool vazio'); continue; }

    const bufA = await page.screenshot();
    await page.evaluate(() => {
      const s = window.game.scene.getScene('GameScene');
      const vivo = s.spawnManager.getAnimalsGroup().children.entries.find((a) => a.active);
      if (vivo) vivo.setVisible(false);
    });
    const bufB = await page.screenshot();
    await page.evaluate(() => {
      const s = window.game.scene.getScene('GameScene');
      s.spawnManager.getAnimalsGroup().children.entries.forEach((a) => {
        a.setVisible(true); a.deactivate();
      });
    });

    const m = await medir(bufA, bufB);
    if (m.erro) { ok(`[${ponto.id}] ${especie}`, false, m.erro); continue; }

    const passou = m.contraste >= ACEITE_CONTRASTE && m.deltaL >= ACEITE_DELTA_L;
    const det = `contraste ${m.contraste.toFixed(2)} · ΔL* ${m.deltaL.toFixed(0)} · fundo L* ${m.fundoL.toFixed(0)}`
      + ` · borda L* ${m.claroL.toFixed(0)}/${m.escuroL.toFixed(0)}`;
    ok(`[${ponto.id}] ${especie.padEnd(10)} ${det}`, passou,
      `(aceite: contraste ≥ ${ACEITE_CONTRASTE} e ΔL* ≥ ${ACEITE_DELTA_L})`);
    linhas.push({ ponto: ponto.id, especie, ...m });

    if (SALVAR) {
      const dir = join(ROOT, 'tools', 'snapshots', 'legibilidade');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${ponto.id}-${especie}.png`), bufA);
    }
  }
}

// ------------------------------------------------------------------ resumo
console.log('\n─────────────────────────────────────────────────────────────');
console.log('RESUMO — contraste de borda por espécie (pior ponto de cada uma)');
const porEspecie = new Map();
for (const l of linhas) {
  const atual = porEspecie.get(l.especie);
  if (!atual || l.contraste < atual.contraste) porEspecie.set(l.especie, l);
}
const ordenado = [...porEspecie.values()].sort((a, b) => a.contraste - b.contraste);
for (const l of ordenado) {
  const marca = l.contraste >= ACEITE_CONTRASTE && l.deltaL >= ACEITE_DELTA_L ? '  ' : '⚠ ';
  console.log(`${marca}${l.especie.padEnd(11)} ${l.contraste.toFixed(2).padStart(6)}  ΔL* ${l.deltaL.toFixed(0).padStart(3)}   (${l.ponto})`);
}
const piores = ordenado.filter((l) => l.contraste < ACEITE_CONTRASTE).length;
console.log(`\n${piores} de ${porEspecie.size} espécies abaixo do aceite de contraste ${ACEITE_CONTRASTE}.`);

ok('nenhum erro de JS durante a medição', erros.length === 0, erros.slice(0, 2).join(' | '));
console.log(`\n${pass}/${pass + fail} OK`);
await browser.close();
process.exitCode = fail ? 1 : 0;
