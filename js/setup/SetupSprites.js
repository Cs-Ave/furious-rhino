import { Constants } from '../utils/Constants.js';
import { ART_MANIFEST } from '../art/ArtManifest.js';
import { SKINS } from '../systems/SkinSystem.js';

// Aba 🖼️ SPRITES do /?setup — gestão de todos os sprites do jogo:
// 📚 catálogo vivo (todos os SVGs de art/, animados, com local e parâmetros),
// ⚙️ gerador de sprites de inimigo (moldes do gerador de skins) e
// 📥 área de "não atribuídos" (gerados, ainda fora do jogo).
//
// Carregada sob demanda pelo SetupPage (import dinâmico no 1º clique) — o
// /?setup abre instantâneo e NADA aqui toca a rede sozinho (o e2e assere).
// Os dados de design vêm dos módulos ES do próprio jogo (Constants já
// mesclado com SpriteParams; SPRITE_BASE é o pré-merge); os SVGs chegam por
// <img src="art/..."> servidos pela mesma origem — catálogo funciona
// inteiro mesmo com o gerador parado.

// Mesmo helper do SetupPage (duplicado de propósito — cada página estática é
// autossuficiente). textContent sempre: nada de innerHTML com dado de fora.
function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

// Um observador só para a página: anima apenas as thumbs visíveis (254
// animações simultâneas seria desperdício de compositor)
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const cls = e.target.dataset.live3 ? 'sp-live3' : 'sp-live';
    e.target.classList.toggle(cls, e.isIntersecting);
  }
});
const observar = (root) => {
  for (const t of root.querySelectorAll('[data-live], [data-live3]')) io.observe(t);
};

// fps/sufixo por espécie (a tabela subiu para Constants na v1.8.9)
const ANIMS_MAP = Object.fromEntries(
  Constants.ENEMY_ANIMS.map(([t, s, f]) => [t, { sufixo: s, fps: f }]));

export function mount(root) {
  const sub = el('div', 'su-variant-tabs');
  sub.id = 'sp-subtabs';
  const defs = [
    ['catalogo', '📚 Catálogo'],
    ['gerador', '⚙️ Gerar inimigo'],
    ['orfaos', '📥 Não atribuídos'],
  ];
  const views = {};
  for (const [key, rotulo] of defs) {
    const btn = el('button', key === 'catalogo' ? 'su-active' : null, rotulo);
    btn.id = `sp-sub-btn-${key}`;
    const painel = el('div');
    painel.id = `sp-sub-${key}`;
    painel.hidden = key !== 'catalogo';
    views[key] = { btn, painel };
    sub.append(btn);
  }
  root.append(sub);
  for (const v of Object.values(views)) root.append(v.painel);
  for (const [key, v] of Object.entries(views)) {
    v.btn.addEventListener('click', () => {
      for (const [k2, v2] of Object.entries(views)) {
        v2.painel.hidden = k2 !== key;
        v2.btn.classList.toggle('su-active', k2 === key);
      }
    });
  }

  montarCatalogo(views.catalogo.painel);
  montarGerador(views.gerador.painel);
  montarOrfaos(views.orfaos.painel);
  // o estoque re-busca a cada visita (o gerador pode ter guardado algo novo)
  views.orfaos.btn.addEventListener('click', () => {
    if (atualizarOrfaos) atualizarOrfaos();
  });
}

// ================================================================ 📚 catálogo
function montarCatalogo(root) {
  const card = el('div', 'su-card');
  card.id = 'sp-catalogo';
  card.append(el('h2', null, '📚 Catálogo de sprites'));
  card.append(el('p', 'su-muted',
    `${Object.keys(ART_MANIFEST).length} texturas no manifesto · `
    + `${Constants.ANIMAL_TYPES.length} espécies · `
    + `${SKINS.filter((s) => s.prefix).length} skins com arte própria · `
    + `${Constants.SPRITE_NEW.length} criada(s) pela aba. `
    + 'Cenário (paredes, rampas, fundos) é procedural — fora deste catálogo.'));

  card.append(grupoEspecies());
  card.append(grupo('🏹 Bosses (4 atiradores)', false, montarBosses));
  card.append(grupo(`🦏 Rino & Skins (${SKINS.filter((s) => s.prefix).length + 2} conjuntos)`, false, montarSkins));
  card.append(grupo('🎛️ HUD (4 ícones)', false, montarHud));
  root.append(card);
}

// `<details>` com montagem preguiçosa: grupo fechado nem cria as <img>
function grupo(titulo, aberto, montar) {
  const d = document.createElement('details');
  d.className = 'sp-grupo';
  if (aberto) d.open = true;
  const s = document.createElement('summary');
  s.textContent = titulo;
  d.append(s);
  const cont = el('div');
  d.append(cont);
  let montado = false;
  const monta = () => {
    if (montado) return;
    montado = true;
    montar(cont);
    observar(cont);
  };
  if (aberto) monta();
  else d.addEventListener('toggle', () => { if (d.open) monta(); });
  return d;
}

// ------------------------------------------------------------- espécies (38+)
function grupoEspecies() {
  const d = document.createElement('details');
  d.className = 'sp-grupo';
  d.open = true;
  const s = document.createElement('summary');
  s.textContent = `🐾 Espécies (${Constants.ANIMAL_TYPES.length})`;
  // Toggle tamanho natural × tamanho de jogo (w × scale — é como o elenco
  // aparece de verdade: raster 2x exibido a scale/2, Animal.setType)
  const lbl = el('label', 'su-muted', ' tamanho de jogo ');
  lbl.style.cssText = 'float:right;font-weight:400;cursor:pointer';
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.id = 'sp-size-toggle';
  lbl.prepend(chk);
  s.append(lbl);
  d.append(s);
  const cont = el('div');
  d.append(cont);
  for (const t of Constants.ANIMAL_TYPES) cont.append(linhaEspecie(t));
  observar(cont);
  chk.addEventListener('click', (e) => e.stopPropagation());
  chk.addEventListener('change', () => {
    for (const th of cont.querySelectorAll('.sp-thumb')) {
      const w = chk.checked ? th.dataset.wJogo : th.dataset.wNatural;
      if (w) th.style.setProperty('--w', `${w}px`);
    }
  });
  return d;
}

// Frame 2 e modo de animação de uma espécie, pelo MESMO contrato do jogo
// (ENEMY_ANIMS → loop; airTexture → troca por estado; zig → telegraph -alt)
function infoAnim(t) {
  const spec = Constants.ANIMAL_SPECS[t];
  const b = Constants.ANIMAL_BEHAVIOR[t];
  const base = spec.tex || `animal-${t}`;
  const nova = Constants.SPRITE_NEW.find((n) => n.id === t);
  if (nova) {
    if (!nova.anim) return { base, modo: 'estatico' };
    const f2 = `${base}-${nova.anim.sufixo}`;
    if (nova.anim.sufixo === 'air') return { base, f2, modo: 'estado' };
    if (!nova.anim.fps) return { base, f2, modo: 'telegraph' };
    return { base, f2, modo: 'loop', fps: nova.anim.fps };
  }
  if (ANIMS_MAP[t]) return { base, f2: `${base}-${ANIMS_MAP[t].sufixo}`, modo: 'loop', fps: ANIMS_MAP[t].fps };
  if (t === 'lion' || t === 'giraffe') return { base, f2: `${base}-run-1`, modo: 'loop', fps: t === 'lion' ? 10 : 8 };
  if (b.airTexture) return { base, f2: b.airTexture, modo: 'estado' };
  if (b.zig) return { base, f2: `${base}-alt`, modo: 'telegraph' };
  return { base, modo: 'estatico' };
}

// Onde a espécie aparece, em chips humanos (biomas + distritos da cidade)
function ondeChips(t) {
  const chips = [];
  for (const [bioma, cast] of Object.entries(Constants.BIOME_ANIMALS)) {
    if (cast.includes(t)) chips.push(Constants.BIOME_LABELS[bioma] || bioma);
  }
  for (const dist of Constants.CITY_DISTRICTS) {
    if (Array.isArray(dist.cast) && dist.cast.includes(t)) chips.push(dist.label || dist.key);
  }
  if (!chips.length) chips.push('⚠️ fora de rotação');
  return chips;
}

function badgesDe(t) {
  const b = Constants.ANIMAL_BEHAVIOR[t];
  const spec = Constants.ANIMAL_SPECS[t];
  const out = [];
  if (t === 'bird' || b.fly) out.push('🪽 voa');
  if (b.zig) out.push('⚡ zig-zag');
  if (b.jumpV) out.push('🦘 pula');
  if (b.shoot) out.push('🎯 atira');
  if (b.sentinel) out.push('📡 sentinela');
  if (spec.pair) out.push('👥 par');
  return out;
}

// Nº de chaves que diferem do design (SPRITE_BASE) — o "● N ajustes"
function contarAjustes(t) {
  const base = Constants.SPRITE_BASE;
  if (!base.specs[t]) return 0; // criada pela aba: não é ajuste, é origem
  let n = 0;
  for (const [tabela, atual] of [[base.specs[t], Constants.ANIMAL_SPECS[t]],
    [base.behavior[t], Constants.ANIMAL_BEHAVIOR[t]]]) {
    const chaves = new Set([...Object.keys(tabela), ...Object.keys(atual)]);
    for (const k of chaves) {
      if (JSON.stringify(tabela[k]) !== JSON.stringify(atual[k])) n++;
    }
  }
  return n;
}

function linhaEspecie(t) {
  const spec = Constants.ANIMAL_SPECS[t];
  const row = el('div', 'sp-row');
  row.dataset.especie = t;

  if (t === 'bird') {
    // 1 linha, 5 plumagens (o jogo sorteia a espécie visual no spawn)
    for (const sp of Constants.BIRD_SPECIES) {
      row.append(thumb2(`animal-bird-${sp}`, `animal-bird-${sp}-flap`,
        { modo: 'loop', fps: 8, spec }));
    }
  } else {
    const info = infoAnim(t);
    row.append(thumb2(info.base, info.f2 || null, { ...info, spec }));
  }

  const meta = el('div', 'sp-meta');
  const nome = el('b', null, t);
  meta.append(nome);
  const info = t === 'bird' ? { base: 'animal-bird-*', modo: 'loop', fps: 8 } : infoAnim(t);
  const detalhes = [`${spec.w}×${spec.h}`,
    info.modo === 'loop' ? `${info.fps} fps` : { estado: 'troca por estado', telegraph: 'telegraph', estatico: 'estático' }[info.modo],
    `escala ${spec.scale || Constants.ANIMAL_SCALE}`];
  if (t === 'camionete') detalhes.push('arte compartilhada com pickup');
  if (Constants.SPRITE_NEW.some((n) => n.id === t)) detalhes.push('criada pela aba');
  meta.append(el('span', 'su-muted', ` ${detalhes.join(' · ')}`));
  const chips = el('div');
  for (const c of ondeChips(t)) chips.append(el('span', 'sp-chip', c));
  for (const b of badgesDe(t)) chips.append(el('span', 'sp-chip sp-badge', b));
  const ajustes = contarAjustes(t);
  if (ajustes > 0) chips.append(el('span', 'sp-chip sp-ajustes', `● ${ajustes} ajuste${ajustes > 1 ? 's' : ''}`));
  meta.append(chips);
  row.append(meta);

  // Editor de parâmetros (S3) — espécies criadas pela aba se editam pela
  // própria ficha de criação (S5), não por override
  if (!Constants.SPRITE_NEW.some((n) => n.id === t)) {
    const btn = el('button', 'sp-edit-btn', '✏️');
    btn.title = 'editar parâmetros desta espécie';
    btn.addEventListener('click', () => alternarEditor(row, t));
    row.append(btn);
  }
  return row;
}

// Thumb de 2 frames: loop (opacidade por keyframe único, --dur = 2/fps),
// estado/telegraph (2º frame no hover) ou estática
function thumb2(baseKey, frame2Key, { modo, fps, spec }) {
  const size = ART_MANIFEST[baseKey] || { w: (spec && spec.w) || 64, h: (spec && spec.h) || 64 };
  const box = el('div', 'sp-thumb');
  box.dataset.wNatural = size.w;
  if (spec) box.dataset.wJogo = Math.round(size.w * (spec.scale || Constants.ANIMAL_SCALE));
  box.style.setProperty('--w', `${size.w}px`);
  const img1 = document.createElement('img');
  img1.loading = 'lazy';
  img1.src = `art/${baseKey}.svg`;
  img1.alt = baseKey;
  box.append(img1);
  if (frame2Key) {
    const img2 = document.createElement('img');
    img2.loading = 'lazy';
    img2.src = `art/${frame2Key}.svg`;
    img2.alt = frame2Key;
    box.append(img2);
    if (modo === 'loop') {
      box.style.setProperty('--dur', `${(2 / (fps || 8)).toFixed(3)}s`);
      box.dataset.live = '1';
    } else {
      box.classList.add('sp-state');
      box.title = 'passe o mouse: 2º estado';
    }
  }
  return box;
}

// Thumb de 3 frames (rino/skins): ciclo ping-pong 0-1-2-1 a 12fps via CSS
function thumb3(prefix) {
  const box = el('div', 'sp-thumb sp-3');
  box.dataset.wNatural = 96;
  box.style.setProperty('--w', '96px');
  box.dataset.live3 = '1';
  for (let f = 0; f < 3; f++) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = `art/${prefix}-${f}.svg`;
    img.alt = `${prefix}-${f}`;
    box.append(img);
  }
  return box;
}

// ------------------------------------------------------------------- bosses
function montarBosses(cont) {
  const BOSSES = [
    ['boss-hunter', 'Caçador do rifle', 'portão do zoo · 1000 m', null],
    ['muralha-hunter', 'Comandante da Muralha', 'A Muralha · 2000 m', null],
    ['boss3-hunter', 'Caçador-Mor', 'fim do mundo · 9995 m', null],
    ['boss2-hunter', 'Capturador do Cerco', 'realocado para o deserto (sem wiring)', 'órfão — carregado e nunca usado'],
  ];
  for (const [key, nome, local, aviso] of BOSSES) {
    const row = el('div', 'sp-row');
    row.append(thumb2(key, `${key}-aim`, { modo: 'estado' }));
    const meta = el('div', 'sp-meta');
    meta.append(el('b', null, nome));
    meta.append(el('span', 'su-muted', ` ${key} · pose de mira no hover`));
    const chips = el('div');
    chips.append(el('span', 'sp-chip', local));
    if (aviso) chips.append(el('span', 'sp-chip su-warn', `⚠️ ${aviso}`));
    meta.append(chips);
    row.append(meta);
    cont.append(row);
  }
}

// -------------------------------------------------------------- rino & skins
function montarSkins(cont) {
  const nota = el('p', 'su-muted',
    'Catálogo-somente: criação, desbloqueio e edição de skins moram na aba 🎨 Skins.');
  cont.append(nota);
  const linhas = [
    ['rhino-run', 'Furious Rhino (base)', 'o jogador'],
    ['rhino-fire-run', 'Fúria Total', 'rampage (compartilhada por todas as skins)'],
    ...SKINS.filter((s) => s.prefix).map((s) => [s.prefix, s.name, `skin · ${s.access.type}${s.hidden ? ' · oculta' : ''}`]),
  ];
  for (const [prefix, nome, local] of linhas) {
    const row = el('div', 'sp-row');
    row.append(thumb3(prefix));
    const meta = el('div', 'sp-meta');
    meta.append(el('b', null, nome));
    meta.append(el('span', 'su-muted', ` ${prefix}-{0,1,2} · 12 fps ping-pong`));
    const chips = el('div');
    chips.append(el('span', 'sp-chip', local));
    meta.append(chips);
    row.append(meta);
    cont.append(row);
  }
}

// ---------------------------------------------------------------------- HUD
function montarHud(cont) {
  const HUD = [
    ['rhino-face-full', 'rhino-face-empty', 'Ícone da investida', 'HUD · cheio/vazio no hover'],
    ['fury-fire-full', 'fury-fire-empty', 'Ícone da Fúria Total', 'HUD · cheio/vazio no hover'],
  ];
  for (const [a, b, nome, local] of HUD) {
    const row = el('div', 'sp-row');
    row.append(thumb2(a, b, { modo: 'estado' }));
    const meta = el('div', 'sp-meta');
    meta.append(el('b', null, nome));
    meta.append(el('span', 'su-muted', ` ${a} / ${b}`));
    const chips = el('div');
    chips.append(el('span', 'sp-chip', local));
    meta.append(chips);
    row.append(meta);
    cont.append(row);
  }
}

// ============================================== ✏️ editor de parâmetros (S3)
// Painel inline sob a linha (um aberto por vez). O diff é sempre contra o
// DESIGN (SPRITE_BASE): valor igual ao design não vira override; chave de
// design desligada vira null (apagar). Salvar = POST /api/sprite-params —
// o servidor grava o SpriteParams, roda o portão (test-sprites+test-skins)
// e REVERTE tudo se reprovar; o stdout do portão aparece cru aqui.
const API = 'http://localhost:3210';
const LIMITES = {
  specs: { bodyW: [8, 200], bodyH: [8, 160], offX: [0, 160], offY: [0, 120], scale: [0.5, 2] },
  behavior: { speed: [10, 600], jumpV: [-1200, -100], jumpIntervalMs: [100, 3000], bobVy: [0, 120] },
};
let editorAberto = null;

function alternarEditor(row, t) {
  const jaEra = editorAberto && editorAberto.t === t;
  if (editorAberto) {
    editorAberto.painel.remove();
    if (editorAberto.overlay) editorAberto.overlay.remove();
    editorAberto = null;
  }
  if (jaEra) return;
  const { painel, overlay } = construirEditor(row, t);
  row.after(painel);
  editorAberto = { painel, overlay, t };
}

function construirEditor(row, t) {
  const spec = Constants.ANIMAL_SPECS[t];
  const b = Constants.ANIMAL_BEHAVIOR[t];
  const baseS = Constants.SPRITE_BASE.specs[t] || {};
  const baseB = Constants.SPRITE_BASE.behavior[t] || {};

  const painel = el('div', 'sp-editor');
  const inputs = {};
  const flags = {};
  const num = (chave) => {
    const i = inputs[chave];
    return !i || i.value === '' ? undefined : Number(i.value);
  };

  // Overlay de hitbox sobre a thumb da linha. O offX gravado já vem
  // ESPELHADO para o setFlipX do jogo — a arte olha para a direita, então
  // aqui o retângulo é des-espelhado: left = w − offX − bodyW.
  const thumb = row.querySelector('.sp-thumb');
  const overlay = el('div', 'sp-hitwrap');
  const rect = el('div', 'sp-hitbox');
  overlay.append(rect);
  if (thumb) thumb.append(overlay);
  const atualizarOverlay = () => {
    const bw = num('specs.bodyW') || 0;
    const bh = num('specs.bodyH') || 0;
    const ox = num('specs.offX') || 0;
    const oy = num('specs.offY') || 0;
    rect.style.left = `${((spec.w - ox - bw) / spec.w) * 100}%`;
    rect.style.top = `${(oy / spec.h) * 100}%`;
    rect.style.width = `${(bw / spec.w) * 100}%`;
    rect.style.height = `${(bh / spec.h) * 100}%`;
  };

  const campo = (grupo, chave, rotulo, valor, faixa, step = 1, onInput = null) => {
    const l = el('label', 'sp-campo', `${rotulo} `);
    const i = document.createElement('input');
    i.type = 'number';
    [i.min, i.max] = faixa;
    i.step = step;
    if (valor !== undefined && valor !== null) i.value = valor;
    if (onInput) i.addEventListener('input', onInput);
    l.append(i);
    inputs[`${grupo}.${chave}`] = i;
    return l;
  };
  const grupoCampos = (titulo) => {
    const d = el('div', 'sp-campos');
    if (titulo) d.append(el('b', 'sp-campos-titulo', titulo));
    return d;
  };

  const gHit = grupoCampos('Hitbox');
  gHit.append(
    campo('specs', 'bodyW', 'largura', spec.bodyW, LIMITES.specs.bodyW, 1, atualizarOverlay),
    campo('specs', 'bodyH', 'altura', spec.bodyH, LIMITES.specs.bodyH, 1, atualizarOverlay),
    campo('specs', 'offX', 'offX (espelhado)', spec.offX, LIMITES.specs.offX, 1, atualizarOverlay),
    campo('specs', 'offY', 'offY', spec.offY, LIMITES.specs.offY, 1, atualizarOverlay),
    campo('specs', 'scale', 'escala', spec.scale || Constants.ANIMAL_SCALE, LIMITES.specs.scale, 0.05));
  painel.append(gHit);
  atualizarOverlay();

  const gBeh = grupoCampos('Comportamento');
  gBeh.append(campo('behavior', 'speed', 'velocidade', b.speed, LIMITES.behavior.speed, 5));
  gBeh.append(campo('behavior', 'bobVy', 'ondulação (vazio = sem)', b.bobVy, LIMITES.behavior.bobVy, 5));
  if (baseB.jumpV !== undefined || b.jumpV !== undefined) {
    gBeh.append(campo('behavior', 'jumpV', 'impulso do pulo', b.jumpV, LIMITES.behavior.jumpV, 10));
    gBeh.append(campo('behavior', 'jumpIntervalMs', 'intervalo do pulo (ms)', b.jumpIntervalMs, LIMITES.behavior.jumpIntervalMs, 50));
  }
  painel.append(gBeh);

  // Fieldsets com checkbox-mestre — fly/zig mudam a CLASSIFICAÇÃO de spawn
  const fieldsetFlag = (nome, rotulo, ativo, mudaClasse, montarCorpo) => {
    const fs = el('div', 'sp-fieldset');
    const head = el('label', null, ` ${rotulo}`);
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = ativo;
    head.prepend(chk);
    fs.append(head);
    const corpo = el('div', 'sp-campos');
    montarCorpo(corpo);
    corpo.hidden = !ativo;
    fs.append(corpo);
    chk.addEventListener('change', () => {
      if (mudaClasse) {
        const txt = chk.checked
          ? `Ligar "${rotulo}" muda a CLASSIFICAÇÃO de spawn (${t} passa a voador). O portão de testes valida os invariantes por bioma e REVERTE se quebrar. Continuar?`
          : `Desligar "${rotulo}" devolve ${t} ao chão. O portão valida. Continuar?`;
        if (!confirm(txt)) { chk.checked = !chk.checked; return; }
      }
      corpo.hidden = !chk.checked;
    });
    flags[nome] = chk;
    return fs;
  };
  const fly0 = b.fly || [440, 520];
  painel.append(fieldsetFlag('fly', '🪽 voo (banda y)', Boolean(b.fly), true, (c) => {
    c.append(campo('fly', 'min', 'y mín', fly0[0], [300, 600], 5),
      campo('fly', 'max', 'y máx', fly0[1], [300, 600], 5));
  }));
  const zig0 = b.zig || { vy: 260, band: [400, 545] };
  painel.append(fieldsetFlag('zig', '⚡ zig-zag', Boolean(b.zig), true, (c) => {
    c.append(campo('zig', 'vy', 'vy', zig0.vy, [50, 600], 10),
      campo('zig', 'bandMin', 'banda mín', zig0.band[0], [300, 600], 5),
      campo('zig', 'bandMax', 'banda máx', zig0.band[1], [300, 600], 5));
  }));
  const sh0 = b.shoot || { telegraphMs: 300, dartSpeed: 620 };
  painel.append(fieldsetFlag('shoot', '🎯 atirador', Boolean(b.shoot), false, (c) => {
    c.append(campo('shoot', 'telegraphMs', 'telegraph (ms)', sh0.telegraphMs, [150, 2000], 10),
      campo('shoot', 'dartSpeed', 'vel. do dardo', sh0.dartSpeed, [100, 1200], 10),
      campo('shoot', 'intervalMs', 'intervalo (ms)', sh0.intervalMs, [300, 5000], 100),
      campo('shoot', 'rangeMin', 'alcance mín', sh0.range && sh0.range[0], [200, 1500], 10),
      campo('shoot', 'rangeMax', 'alcance máx', sh0.range && sh0.range[1], [200, 1500], 10),
      campo('shoot', 'cap', 'máx em tela', sh0.cap, [1, 5], 1));
    const aim = el('label', 'sp-campo', ' mirado ');
    const ai = document.createElement('input');
    ai.type = 'checkbox';
    ai.checked = Boolean(sh0.aimed);
    aim.prepend(ai);
    inputs['shoot.aimed'] = ai;
    const sen = el('label', 'sp-campo', ' conta como torre (sentinela) ');
    const se = document.createElement('input');
    se.type = 'checkbox';
    se.checked = Boolean(b.sentinel);
    sen.prepend(se);
    inputs['behavior.sentinel'] = se;
    c.append(aim, sen);
  }));

  // Diff contra o DESIGN — só o que difere vira override; o que o design
  // tinha e foi desligado vira null (apagar)
  const diffDe = () => {
    const oSpecs = {};
    const oBeh = {};
    for (const k of ['bodyW', 'bodyH', 'offX', 'offY', 'scale']) {
      const v = num(`specs.${k}`);
      if (v === undefined) continue;
      const baseV = baseS[k];
      if (JSON.stringify(v) !== JSON.stringify(baseV)) {
        if (!(k === 'scale' && baseV === undefined && v === Constants.ANIMAL_SCALE)) oSpecs[k] = v;
      }
    }
    const escalar = (chave, baseV) => {
      const v = num(`behavior.${chave}`);
      if (v === undefined) { if (baseV !== undefined) oBeh[chave] = null; }
      else if (v !== baseV) oBeh[chave] = v;
    };
    escalar('speed', baseB.speed);
    escalar('bobVy', baseB.bobVy);
    if (inputs['behavior.jumpV']) {
      escalar('jumpV', baseB.jumpV);
      escalar('jumpIntervalMs', baseB.jumpIntervalMs);
    }
    if (flags.fly.checked && flags.zig.checked) return { erro: 'fly e zig não podem coexistir' };
    if (flags.fly.checked) {
      const v = [num('fly.min'), num('fly.max')];
      if (v.some((x) => x === undefined)) return { erro: 'preencha a banda de voo' };
      if (JSON.stringify(v) !== JSON.stringify(baseB.fly)) oBeh.fly = v;
    } else if (baseB.fly) oBeh.fly = null;
    if (flags.zig.checked) {
      const v = { vy: num('zig.vy'), band: [num('zig.bandMin'), num('zig.bandMax')] };
      if (v.vy === undefined || v.band.some((x) => x === undefined)) return { erro: 'preencha o zig-zag' };
      if (JSON.stringify(v) !== JSON.stringify(baseB.zig)) oBeh.zig = v;
    } else if (baseB.zig) oBeh.zig = null;
    if (flags.shoot.checked) {
      const v = { telegraphMs: num('shoot.telegraphMs'), dartSpeed: num('shoot.dartSpeed') };
      if (v.telegraphMs === undefined || v.dartSpeed === undefined) {
        return { erro: 'atirador exige telegraph e vel. do dardo' };
      }
      const iv = num('shoot.intervalMs');
      if (iv !== undefined) v.intervalMs = iv;
      const rMin = num('shoot.rangeMin');
      const rMax = num('shoot.rangeMax');
      if (rMin !== undefined && rMax !== undefined) v.range = [rMin, rMax];
      const cap = num('shoot.cap');
      if (cap !== undefined) v.cap = cap;
      if (inputs['shoot.aimed'].checked) v.aimed = true;
      if (JSON.stringify(v) !== JSON.stringify(baseB.shoot)) oBeh.shoot = v;
      const sent = inputs['behavior.sentinel'].checked;
      if (sent !== Boolean(baseB.sentinel)) oBeh.sentinel = sent || null;
    } else {
      if (baseB.shoot) oBeh.shoot = null;
      if (baseB.sentinel) oBeh.sentinel = null;
    }
    return { specs: oSpecs, behavior: oBeh };
  };

  const acoes = el('div', 'sp-acoes');
  const btnSalvar = el('button', 'su-primary', '💾 Salvar espécie');
  const btnReverter = el('button', 'su-danger', '↩ Reverter ao design');
  const status = el('span', 'su-muted', '');
  acoes.append(btnSalvar, btnReverter, status);
  painel.append(acoes);
  const out = document.createElement('pre');
  out.hidden = true;
  painel.append(out);
  const banner = el('p', 'su-ok', '');
  banner.hidden = true;
  painel.append(banner);

  const enviar = async (payload, rotuloOk) => {
    btnSalvar.disabled = true;
    btnReverter.disabled = true;
    out.hidden = true;
    banner.hidden = true;
    status.className = 'su-muted';
    status.textContent = 'gravando + rodando o portão de testes…';
    try {
      const r = await fetch(`${API}/api/sprite-params`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: t, ...payload }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        status.className = 'su-err';
        status.textContent = j.error || `erro ${r.status}`;
        if (j.testOutput) { out.textContent = j.testOutput; out.hidden = false; }
        return;
      }
      const salvo = (j.params.overrides || {})[t] || null;
      reaplicarLocal(t, salvo);
      status.className = 'su-ok';
      status.textContent = rotuloOk;
      banner.textContent = '✔ Aplicado na árvore de trabalho. F5 na aba do jogo '
        + '(localhost:3000) para ver — o site ao vivo só muda na release.';
      banner.hidden = false;
      const nova = linhaEspecie(t);
      row.replaceWith(nova);
      observar(nova);
      row = nova;
    } catch (e) {
      status.className = 'su-err';
      status.textContent = 'gerador parado — suba pelo iniciar-estudio.bat (ou npm run sprite-gen) e tente de novo';
    } finally {
      btnSalvar.disabled = false;
      btnReverter.disabled = false;
    }
  };

  btnSalvar.addEventListener('click', () => {
    const d = diffDe();
    if (d.erro) {
      status.className = 'su-err';
      status.textContent = d.erro;
      return;
    }
    if (!Object.keys(d.specs).length && !Object.keys(d.behavior).length) {
      if (contarAjustes(t) > 0) { enviar({ reset: true }, 'ajustes limpos — de volta ao design'); return; }
      status.className = 'su-muted';
      status.textContent = 'nada mudou em relação ao design';
      return;
    }
    enviar({ specs: d.specs, behavior: d.behavior }, 'salvo com o portão verde');
  });
  btnReverter.addEventListener('click', () => {
    if (contarAjustes(t) === 0) {
      status.className = 'su-muted';
      status.textContent = 'esta espécie já está no design';
      return;
    }
    if (!confirm(`Descartar TODOS os ajustes de ${t} e voltar ao design?`)) return;
    enviar({ reset: true }, 'revertida ao design');
  });

  return { painel, overlay };
}

// ================================================= ⚙️ gerador de inimigo (S4)
// Os moldes do gerador de skins com ids/classes PRÓPRIOS (sp-*) — o fluxo de
// skins usa estado global de módulo e seletores por classe no documento
// inteiro; compartilhar markup contaminaria os dois. A extração de um
// SpriteWizard comum fica como dívida declarada (plano B aprovado no design).
const FPS_SUGERIDO = { 'run-1': 8, flap: 8, alt: 6 };

function montarGerador(root) {
  let sessionId = null;
  let thumbs = [];
  let selecionados = []; // índices na ordem do clique (base, peça móvel)
  let paleta = []; // [{hex, outline}]

  const card = el('div', 'su-card');
  card.id = 'sp-gerador';
  card.append(el('h2', null, '⚙️ Gerar sprite de inimigo'));
  card.append(el('p', 'su-muted',
    'Receita da folha: 2 células em linha, fundo branco puro, margens largas e NADA '
    + 'atravessando o vão; cel-shading chapado (máx. 5 cores + contorno grosso); criatura '
    + 'de PERFIL virada para a DIREITA (o jogo espelha); corpo IDÊNTICO entre as células — '
    + 'só a peça móvel muda (pernas na passada, asa no flap, hélice/roda no alt); ≥2000px de largura.'));

  const drop = el('div', 'su-drop', '📄 solte a folha aqui, ou clique para escolher (PNG/JPG/SVG)');
  drop.id = 'sp-drop';
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/*,.svg';
  file.hidden = true;
  card.append(drop, file);
  const statusUp = el('p', 'su-muted', '');
  card.append(statusUp);
  const gridFrames = el('div', 'su-frames');
  gridFrames.id = 'sp-frames';
  card.append(gridFrames);
  const paletaBox = el('div');
  paletaBox.id = 'sp-palette';
  card.append(paletaBox);

  // ---- opções
  const opts = el('div', 'sp-campos');
  const campoTxt = (id, rotulo, valor, largura = 110) => {
    const l = el('label', 'sp-campo', `${rotulo} `);
    const i = document.createElement('input');
    i.id = id;
    i.value = valor;
    i.style.width = `${largura}px`;
    l.append(i);
    return [l, i];
  };
  const [lId, inpId] = campoTxt('sp-gen-id', 'id', '');
  const hintId = el('span', 'su-muted', '');
  const selSufixo = document.createElement('select');
  selSufixo.id = 'sp-gen-sufixo';
  for (const [v, rot] of [['run-1', '-run-1 (passada)'], ['flap', '-flap (asa)'],
    ['alt', '-alt (peça móvel)'], ['air', '-air (pose no ar)'], ['', 'só 1 frame']]) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = rot;
    selSufixo.append(o);
  }
  const lSuf = el('label', 'sp-campo', '2º frame ');
  lSuf.append(selSufixo);
  const selArq = document.createElement('select');
  selArq.id = 'sp-gen-arquetipo';
  for (const v of ['terrestre', 'saltador', 'voador', 'voador-zig', 'atirador', 'sentinela']) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    selArq.append(o);
  }
  const lArq = el('label', 'sp-campo', 'arquétipo ');
  lArq.append(selArq);
  const [lW, inpW] = campoTxt('sp-gen-w', 'alvo L', '64', 60);
  const [lH, inpH] = campoTxt('sp-gen-h', 'alvo A', '46', 60);
  const dl = document.createElement('datalist');
  dl.id = 'sp-presets';
  for (const t of Constants.ANIMAL_TYPES) {
    const s = Constants.ANIMAL_SPECS[t];
    const o = document.createElement('option');
    o.value = `${s.w}×${s.h}`;
    o.label = t;
    dl.append(o);
  }
  const lMaster = el('label', 'sp-campo', ' corpo-mestre (frames com corpo idêntico) ');
  const chkMaster = document.createElement('input');
  chkMaster.type = 'checkbox';
  lMaster.prepend(chkMaster);
  opts.append(lId, hintId, lSuf, lArq, lW, lH, dl, lMaster);
  card.append(opts);
  card.append(el('p', 'su-muted',
    'Presets de alvo (L×A do elenco atual): vira-lata 62×42 · pombo 48×34 · hiena 66×46 · '
    + 'k9 56×44 · camionete 132×56 · helinews 96×44.'));

  const acoes = el('div', 'sp-acoes');
  const btnGerar = el('button', 'su-primary', '⚙️ Gerar e guardar em Não atribuídos');
  const statusGen = el('span', 'su-muted', '');
  acoes.append(btnGerar, statusGen);
  card.append(acoes);
  const resultado = el('div');
  resultado.id = 'sp-gen-resultado';
  card.append(resultado);
  root.append(card);

  // crítica do id ao vivo (espécies do jogo + pendentes conhecidos)
  inpId.addEventListener('input', () => {
    const v = inpId.value.trim();
    if (!v) { hintId.textContent = ''; return; }
    if (!/^[a-z0-9][a-z0-9-]{0,23}$/.test(v)) {
      hintId.className = 'su-err';
      hintId.textContent = ' a-z, 0-9 e hífen (até 24)';
    } else if (Constants.ANIMAL_TYPES.includes(v)) {
      hintId.className = 'su-err';
      hintId.textContent = ` ⛔ "${v}" já é uma espécie do jogo`;
    } else {
      hintId.className = 'su-ok';
      hintId.textContent = ' ✓ livre';
    }
  });

  const escolherArquivo = () => file.click();
  drop.addEventListener('click', escolherArquivo);
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('su-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('su-over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('su-over');
    if (e.dataTransfer.files[0]) processar(e.dataTransfer.files[0]);
  });
  file.addEventListener('change', () => { if (file.files[0]) processar(file.files[0]); });

  async function processar(f) {
    statusUp.className = 'su-muted';
    statusUp.textContent = 'fatiando a folha…';
    gridFrames.textContent = '';
    resultado.textContent = '';
    selecionados = [];
    try {
      const b64 = await new Promise((res2, rej) => {
        const r = new FileReader();
        r.onload = () => res2(String(r.result).split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const r = await fetch(`${API}/api/slice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64 }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `erro ${r.status}`);
      sessionId = j.sessionId;
      thumbs = j.frames;
      statusUp.textContent = `${j.frames.length} célula(s) — clique na BASE e depois na peça móvel`;
      for (const fr of j.frames) {
        const cel = el('div', 'su-frame');
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${fr.png}`;
        cel.append(img);
        const badge = el('span', 'su-badge', '');
        cel.append(badge);
        cel.addEventListener('click', () => {
          const at = selecionados.indexOf(fr.index);
          if (at >= 0) selecionados.splice(at, 1);
          else if (selecionados.length < 2) selecionados.push(fr.index);
          for (const c of gridFrames.children) {
            const i2 = [...gridFrames.children].indexOf(c);
            const ordem = selecionados.indexOf(thumbs[i2].index);
            c.classList.toggle('su-sel', ordem >= 0);
            c.querySelector('.su-badge').textContent = ordem >= 0 ? ['①', '②'][ordem] : '';
          }
        });
        gridFrames.append(cel);
      }
      paleta = (j.suggestedPalette || []).map((hex) => ({ hex, outline: hex === j.suggestedOutline }));
      if (paleta.length && !paleta.some((p) => p.outline)) paleta[0].outline = true;
      renderPaleta();
    } catch (e) {
      statusUp.className = 'su-err';
      statusUp.textContent = `não deu: ${e.message} (o gerador está no ar?)`;
    }
  }

  function renderPaleta() {
    paletaBox.textContent = '';
    if (!paleta.length) return;
    paletaBox.append(el('b', 'sp-campos-titulo', 'Paleta (1 contorno)'));
    const linha = el('div', 'sp-campos');
    paleta.forEach((p, i) => {
      const sw = el('label', 'sp-campo', '');
      const cor = document.createElement('input');
      cor.type = 'color';
      cor.value = p.hex;
      cor.addEventListener('input', () => { p.hex = cor.value; });
      const rad = document.createElement('input');
      rad.type = 'radio';
      rad.name = 'sp-outline';
      rad.checked = p.outline;
      rad.title = 'contorno';
      rad.addEventListener('change', () => paleta.forEach((q, k) => { q.outline = k === i; }));
      sw.append(cor, rad);
      if (paleta.length > 2) {
        const x = el('button', null, '×');
        x.addEventListener('click', () => { paleta.splice(i, 1); renderPaleta(); });
        sw.append(x);
      }
      linha.append(sw);
    });
    const add = el('button', null, '+ cor');
    add.addEventListener('click', () => { paleta.push({ hex: '#888888', outline: false }); renderPaleta(); });
    linha.append(add);
    paletaBox.append(linha);
  }

  btnGerar.addEventListener('click', async () => {
    const id = inpId.value.trim();
    const suf = selSufixo.value || null;
    const nFrames = suf ? 2 : 1;
    statusGen.className = 'su-muted';
    if (!sessionId) { statusGen.className = 'su-err'; statusGen.textContent = 'suba uma folha primeiro'; return; }
    if (selecionados.length !== nFrames) {
      statusGen.className = 'su-err';
      statusGen.textContent = `escolha ${nFrames} frame(s) na grade`;
      return;
    }
    statusGen.textContent = 'vetorizando…';
    btnGerar.disabled = true;
    try {
      const r = await fetch(`${API}/api/sprite/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          frameIndexes: selecionados,
          id,
          sufixo: suf,
          arquetipo: selArq.value,
          targetW: Number(inpW.value),
          targetH: Number(inpH.value),
          palette: paleta.map((p) => ({ hex: p.hex, outline: p.outline })),
          masterBody: chkMaster.checked,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `erro ${r.status}`);
      statusGen.className = 'su-ok';
      statusGen.textContent = `✓ guardado em 📥 Não atribuídos (${j.sizesKb.join(' / ')} KB)`;
      mostrarResultado(j);
      if (atualizarOrfaos) atualizarOrfaos();
    } catch (e) {
      statusGen.className = 'su-err';
      statusGen.textContent = e.message;
    } finally {
      btnGerar.disabled = false;
    }
  });

  function mostrarResultado(j) {
    resultado.textContent = '';
    const row = el('div', 'sp-row');
    const modo = j.files.length < 2 ? 'estatico' : (selSufixo.value === 'air' ? 'estado' : 'loop');
    const box = el('div', 'sp-thumb');
    box.style.setProperty('--w', `${Number(inpW.value)}px`);
    for (const f of j.files) {
      const img = document.createElement('img');
      img.src = `gerador-de-sprites/output/enemies/${j.id}/${f}?t=${Date.now()}`;
      box.append(img);
    }
    if (modo === 'loop') {
      box.style.setProperty('--dur', `${(2 / (FPS_SUGERIDO[selSufixo.value] || 8)).toFixed(3)}s`);
      box.classList.add('sp-live');
    } else if (modo === 'estado') box.classList.add('sp-state');
    // hitbox sugerida por cima (des-espelhada, como no editor)
    const hw = el('div', 'sp-hitwrap');
    const hb = el('div', 'sp-hitbox');
    const s = j.hitboxSugerida;
    const tw = Number(inpW.value);
    const th = Number(inpH.value);
    hb.style.left = `${((tw - s.offX - s.bodyW) / tw) * 100}%`;
    hb.style.top = `${(s.offY / th) * 100}%`;
    hb.style.width = `${(s.bodyW / tw) * 100}%`;
    hb.style.height = `${(s.bodyH / th) * 100}%`;
    hw.append(hb);
    box.append(hw);
    row.append(box);
    const meta = el('div', 'sp-meta');
    meta.append(el('b', null, `enemy-${j.id}`));
    meta.append(el('span', 'su-muted',
      ` hitbox sugerida ${s.bodyW}×${s.bodyH} offset (${s.offX},${s.offY}) — ajustável na atribuição`));
    for (const w of j.warnings || []) meta.append(el('p', 'su-warn', `⚠️ ${w}`));
    row.append(meta);
    resultado.append(row);
  }
}

// ================================================ 📥 não atribuídos (S4/S5)
let atualizarOrfaos = null;

function montarOrfaos(root) {
  const card = el('div', 'su-card');
  card.id = 'sp-orfaos';
  card.append(el('h2', null, '📥 Sprites não atribuídos'));
  card.append(el('p', 'su-muted',
    'Gerados pela aba e ainda FORA do jogo. Atribuir = trocar a arte de uma espécie '
    + 'existente ou criar uma espécie nova. As pastas antigas de skins em output/ não '
    + 'aparecem aqui (são domínio da aba 🎨 Skins).'));
  const lista = el('div');
  lista.id = 'sp-orfaos-lista';
  card.append(lista);
  root.append(card);

  const carregar = async () => {
    lista.textContent = '';
    lista.append(el('p', 'su-muted', 'consultando o estoque…'));
    try {
      const r = await fetch(`${API}/api/sprites/pending`);
      const j = await r.json();
      lista.textContent = '';
      const pendentes = (j.sprites || []).filter((s) => !s.recuperado || s.frames.length);
      if (!pendentes.length) {
        lista.append(el('p', 'su-muted', 'vazio — gere um sprite na sub-aba ⚙️.'));
        return;
      }
      for (const s of pendentes) lista.append(linhaOrfao(s, carregar));
      observar(lista);
    } catch (e) {
      lista.textContent = '';
      lista.append(el('p', 'su-err',
        'gerador parado — o estoque mora nele. Suba pelo iniciar-estudio.bat e volte aqui.'));
    }
  };
  atualizarOrfaos = carregar;
  carregar();
}

function linhaOrfao(s, recarregar) {
  const row = el('div', 'sp-row');
  row.dataset.pendente = s.id;
  const box = el('div', 'sp-thumb');
  box.style.setProperty('--w', `${s.alvoW || 64}px`);
  for (const f of s.frames || []) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = `gerador-de-sprites/output/enemies/${s.id}/${f}`;
    box.append(img);
  }
  if ((s.frames || []).length > 1) {
    if (s.sufixo === 'air') box.classList.add('sp-state');
    else {
      box.style.setProperty('--dur', `${(2 / (FPS_SUGERIDO[s.sufixo] || 8)).toFixed(3)}s`);
      box.dataset.live = '1';
    }
  }
  row.append(box);
  const meta = el('div', 'sp-meta');
  meta.append(el('b', null, s.id));
  const infos = [`${s.alvoW || '?'}×${s.alvoH || '?'}`, s.arquetipo || '—',
    s.sufixo ? `-${s.sufixo}` : '1 frame',
    s.criadoEm ? new Date(s.criadoEm).toLocaleDateString('pt-BR') : ''];
  meta.append(el('span', 'su-muted', ` ${infos.filter(Boolean).join(' · ')}`));
  const chips = el('div');
  if (s.atribuido) {
    chips.append(el('span', 'sp-chip su-ok',
      `✓ atribuído (${s.atribuido.modo === 'new' ? 'espécie nova' : 'arte de'} ${s.atribuido.alvo})`));
  }
  if (s.recuperado) chips.append(el('span', 'sp-chip su-warn', '⚠️ recuperado do disco (índice refeito)'));
  meta.append(chips);
  row.append(meta);
  const acoes = el('div', 'sp-acoes');
  const btnAtrib = el('button', 'su-primary', '🎯 Atribuir');
  btnAtrib.addEventListener('click', () => {
    alert('A atribuição (trocar arte de espécie existente ou criar espécie nova) chega na fatia S5.');
  });
  const btnDel = el('button', 'su-danger', '🗑');
  btnDel.title = 'excluir do estoque';
  btnDel.addEventListener('click', async () => {
    if (!confirm(`Excluir "${s.id}" do estoque? (apaga os SVGs gerados)`)) return;
    try {
      const r = await fetch(`${API}/api/sprite/remove-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `erro ${r.status}`);
      recarregar();
    } catch (e) {
      alert(`não deu: ${e.message}`);
    }
  });
  acoes.append(btnAtrib, btnDel);
  row.append(acoes);
  return row;
}

// Reaplica localmente o estado salvo (a página não recarrega módulos):
// espécie volta ao design e recebe o override novo — mesmo merge do Constants
function reaplicarLocal(t, override) {
  const base = Constants.SPRITE_BASE;
  if (!base.specs[t]) return; // criada pela aba: fora do fluxo de override
  Constants.ANIMAL_SPECS[t] = JSON.parse(JSON.stringify(base.specs[t]));
  Constants.ANIMAL_BEHAVIOR[t] = JSON.parse(JSON.stringify(base.behavior[t]));
  for (const [src, dst] of [[override && override.specs, Constants.ANIMAL_SPECS[t]],
    [override && override.behavior, Constants.ANIMAL_BEHAVIOR[t]]]) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src)) {
      if (v === null) delete dst[k];
      else dst[k] = v;
    }
  }
}
