// GERADOR DE SPRITES — servidor local da ferramenta (dev-only, nunca é
// servido ao jogador; a pasta fica FORA do sw.js/ASSETS).
//   npm run sprite-gen        → http://localhost:3210
//   gerador-de-sprites/iniciar-gerador.bat (duplo-clique no Windows)
//
// node:http puro, como todos os scripts do projeto — zero framework. A
// página (index.html) também funciona servida pelo servidor do jogo
// (python :3000/gerador-de-sprites/): o CORS liberado aqui permite que ela
// converse com esta API de qualquer origem local.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import Jimp from 'jimp';
import { sliceSheet, sliceGrid, samplePalette, vectorizeFrames, buildPreviewHtml } from './lib.mjs';
import {
  LOCKED_IDS, BUILTIN_IDS, parseRegistry, renderRegistry, validateEntry, validateAccess,
  upsertSkin, removeSkin, patchSwAssets, stripSwArtLines,
} from './integrate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(HERE, 'output');
const PORT = 3210;
const STARTED = Date.now();
const MAX_BODY = 25 * 1024 * 1024;

// Sessões de fatiamento em memória (id → frames Jimp); morrem com o server
const sessions = new Map();
let nextSession = 1;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
};

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // Chrome (Private Network Access): a página /?setup em PRODUÇÃO (https)
    // fala com este servidor local — sem este header o preflight é barrado
    // (mixed content perdoa localhost; o PNA não)
    'Access-Control-Allow-Private-Network': 'true',
    'Cache-Control': 'no-store',
  });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('corpo grande demais')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// "rhino-" à frente é redundante (o prefixo do arquivo já é rhino-<nome>-run
// — sem isto, "rhino-original" viraria rhino-rhino-original-run)
const slug = (name) => String(name || '').toLowerCase()
  .replace(/[^a-z0-9-]/g, '').replace(/^rhino-+/, '').slice(0, 24);

// Snippets de integração no jogo — gerados, nunca aplicados automaticamente
function integrationSnippets(name) {
  const prefix = `rhino-${name}-run`;
  return [
    `// js/art/ArtManifest.js — dentro de ART_MANIFEST:`,
    ...[0, 1, 2].map((f) => `  '${prefix}-${f}': { w: 96, h: 64 },`),
    ``,
    `// sw.js — dentro de ASSETS (e lembrar do bump do CACHE na release):`,
    ...[0, 1, 2].map((f) => `  './art/${prefix}-${f}.svg',`),
    ``,
    `// js/systems/SkinSystem.js — dentro de SKINS (ajuste nome/acesso):`,
    `  { id: '${name}', name: '${name[0].toUpperCase()}${name.slice(1)}', prefix: '${prefix}',`,
    `    access: { type: 'default' }, desc: '✨ Descreva a skin aqui.' },`,
    ``,
    `// A anim no BootScene é automática (laço sobre SKINS). Rode npm run`,
    `// test-skins para validar manifest+sw, e adicione asserts se quiser.`,
  ].join('\n');
}

// ------------------------------------------------- integração no jogo
// (usada pela página /?setup; a página antiga do gerador segue nos snippets)
const REGISTRY_PATH = join(ROOT, 'js', 'systems', 'SkinRegistry.js');
const SW_PATH = join(ROOT, 'sw.js');

// Valida a árvore DEPOIS de escrever: o test-skins confere registry ↔ art/ ↔
// sw.js e as regras de acesso. Se falhar, quem chamou faz rollback.
function runSkinTests() {
  return new Promise((resolve) => {
    execFile('node', [join('tools', 'test-skins.mjs')], { cwd: ROOT, timeout: 60000 },
      (err, stdout, stderr) => resolve({
        ok: !err,
        output: `${stdout || ''}${stderr ? `\n${stderr}` : ''}`.trim(),
      }));
  });
}

// Escreve registry+sw, roda a suíte e REVERTE se ela ficar vermelha — o
// repositório nunca fica num estado que quebre o jogo. `extraRollback`
// desfaz efeitos fora dos 2 arquivos (ex.: SVGs removidos de art/).
// `swBase` troca a base do patch (o rollback usa sempre snapshot.sw) — é por
// onde a remoção de uma builtin entrega o sw já sem as linhas manuscritas.
async function writeAndValidate(newRegistry, snapshot, extraRollback = null, swBase = null) {
  const skins = parseRegistry(newRegistry); // valida ANTES de escrever
  const newSw = patchSwAssets(swBase || snapshot.sw, skins);
  writeFileSync(REGISTRY_PATH, newRegistry);
  writeFileSync(SW_PATH, newSw);
  const test = await runSkinTests();
  if (!test.ok) {
    writeFileSync(REGISTRY_PATH, snapshot.registry);
    writeFileSync(SW_PATH, snapshot.sw);
    if (extraRollback) extraRollback();
    return { ok: false, test };
  }
  return { ok: true, test, skins };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;

    if (req.method === 'OPTIONS') return send(res, 204, '');

    // ------------------------------------------------------------- API
    if (path === '/api/status') {
      return send(res, 200, { ok: true, uptimeS: Math.round((Date.now() - STARTED) / 1000), pid: process.pid });
    }
    if (path === '/api/shutdown' && req.method === 'POST') {
      send(res, 200, { ok: true, bye: true });
      // responde antes de morrer; o polling da página detecta a queda
      setTimeout(() => { server.close(); process.exit(0); }, 150);
      return;
    }
    if (path === '/api/slice' && req.method === 'POST') {
      const { imageBase64, grid } = JSON.parse((await readBody(req)).toString());
      let buf = Buffer.from(imageBase64, 'base64');
      // SVG: o Jimp não decodifica — rasteriza via resvg antes de fatiar.
      // (Atenção: SVG "auto-trace" de sites conversores é só o raster
      // pequeno disfarçado — a qualidade continua a do original traçado.)
      const headStr = buf.slice(0, 300).toString('utf8').trimStart();
      if (headStr.startsWith('<?xml') || headStr.startsWith('<svg')) {
        const { Resvg } = await import('@resvg/resvg-js');
        buf = new Resvg(buf.toString('utf8'), { fitTo: { mode: 'width', value: 2048 } }).render().asPng();
      }
      const img = await Jimp.read(buf);
      // grade manual = fallback para folhas com efeitos atravessando células
      const frames = (grid && grid.rows >= 1 && grid.cols >= 1)
        ? sliceGrid(img, Math.min(6, grid.rows), Math.min(8, grid.cols))
        : await sliceSheet(img);
      if (!frames.length) return send(res, 422, { error: 'nenhum frame detectado — a folha tem fundo claro e desenhos escuros?' });
      const id = String(nextSession++);
      sessions.set(id, frames);
      const { palette, outline } = samplePalette(frames[0].jimp);
      const out = [];
      for (let i = 0; i < frames.length; i++) {
        const thumb = frames[i].jimp.clone();
        if (thumb.getWidth() > 360) thumb.resize(360, Jimp.AUTO);
        out.push({
          index: i, w: frames[i].w, h: frames[i].h,
          png: (await thumb.getBufferAsync(Jimp.MIME_PNG)).toString('base64'),
        });
      }
      return send(res, 200, { sessionId: id, frames: out, suggestedPalette: palette, suggestedOutline: outline });
    }
    if (path === '/api/generate' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString());
      const frames = sessions.get(String(body.sessionId));
      if (!frames) return send(res, 410, { error: 'sessão expirou — fatie a folha de novo' });
      const idx = body.frameIndexes || [];
      if (idx.length !== 3) return send(res, 400, { error: 'escolha exatamente 3 frames (estendido, apoio, recolhido)' });
      const name = slug(body.name);
      if (!name) return send(res, 400, { error: 'dê um nome à skin (letras minúsculas, números e hífen)' });
      const palette = (body.palette || []).map((p) => [p.hex, Boolean(p.outline)]);
      if (palette.length < 2 || palette.filter(([, o]) => o).length !== 1) {
        return send(res, 400, { error: 'a paleta precisa de 2+ cores e exatamente 1 marcada como contorno' });
      }
      // v1.8.1 (/?setup): variant 'fire' gera a folha da FÚRIA PRÓPRIA da
      // skin (prefixo -fire-run), no mesmo output/<name>/ da corrida normal
      const variant = body.variant === 'fire' ? 'fire' : 'run';
      const prefix = variant === 'fire' ? `rhino-${name}-fire-run` : `rhino-${name}-run`;
      const chosen = idx.map((i) => frames[i].jimp);
      // Upscale automático: traço fica ruim abaixo de ~500px de largura
      const w = chosen[0].getWidth();
      const upscale = w < 300 ? 3 : w < 500 ? 2 : 1;
      const { svgs, diagnostics } = await vectorizeFrames(chosen, palette, {
        upscale,
        masterBody: body.masterBody !== false,
        // corpos muito diferentes entre frames? gera sem corpo-mestre em vez
        // de entregar cortes/sobreposição (e avisa abaixo)
        autoMasterFallback: true,
        comment: `FURIOUS RHINO — skin "${name}" (${variant}), gerada pelo gerador-de-sprites (folha raster vetorizada)`,
      });
      const warnings = [];
      const iouPct = Math.round(Math.min(...diagnostics.bodyIoU) * 100);
      if (diagnostics.masterBodyRequested && !diagnostics.masterBodyUsed) {
        warnings.push(`⚠️ Os corpos diferem demais entre os frames escolhidos (semelhança ${iouPct}%). `
          + 'Gerei SEM o corpo-mestre para evitar cortes e sobreposição — o corpo vai balançar um pouco na corrida. '
          + 'Para o resultado ideal, regenere a folha no Gemini exigindo corpos IDÊNTICOS entre as poses (só as pernas mudam).');
      } else if (diagnostics.masterBodyUsed && iouPct < 90) {
        warnings.push(`ℹ️ Corpos ${iouPct}% parecidos entre os frames — se notar emendas na linha da barriga, `
          + 'tente gerar de novo com o corpo-mestre desligado, ou regenere a folha com corpos idênticos.');
      }
      const dir = join(OUT, name);
      mkdirSync(dir, { recursive: true });
      const files = [];
      svgs.forEach((svg, f) => {
        const file = `${prefix}-${f}.svg`;
        writeFileSync(join(dir, file), svg);
        files.push(file);
      });
      const previewFile = variant === 'fire' ? 'preview-fire.html' : 'preview.html';
      writeFileSync(join(dir, previewFile),
        buildPreviewHtml(`🎨 ${name} (${variant}) — preview do gerador de sprites`, [{ name: prefix, svgs }]));
      return send(res, 200, {
        ok: true, name, variant, files, upscale, warnings, diagnostics,
        sizesKb: svgs.map((s) => +(s.length / 1024).toFixed(1)),
        svgs,
        previewUrl: `/output/${name}/${previewFile}`,
      });
    }
    if (path === '/api/apply' && req.method === 'POST') {
      const { name: rawName, fire } = JSON.parse((await readBody(req)).toString());
      const name = slug(rawName);
      const dir = join(OUT, name);
      const files = [0, 1, 2].map((f) => `rhino-${name}-run-${f}.svg`);
      // fúria própria opcional (/?setup): a folha -fire-run também precisa
      // ter sido gerada nesta pasta
      if (fire) files.push(...[0, 1, 2].map((f) => `rhino-${name}-fire-run-${f}.svg`));
      if (!name || !files.every((f) => existsSync(join(dir, f)))) {
        return send(res, 404, { error: 'gere a skin antes de aplicar' });
      }
      for (const f of files) copyFileSync(join(dir, f), join(ROOT, 'art', f));
      return send(res, 200, { ok: true, copied: files.map((f) => `art/${f}`), snippets: integrationSnippets(name) });
    }

    // ----------------------------------------- integração (/?setup, v1.8.1)
    if (path === '/api/skins') {
      const skins = parseRegistry(readFileSync(REGISTRY_PATH, 'utf8'));
      return send(res, 200, { ok: true, skins, lockedIds: LOCKED_IDS, builtinIds: BUILTIN_IDS });
    }
    if (path === '/api/integrate' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString());
      const name = slug(body.name);
      const hasFire = Boolean(body.hasFire);
      const entry = {
        id: name,
        name: String(body.displayName || '').trim(),
        prefix: `rhino-${name}-run`,
        ...(hasFire ? { firePrefix: `rhino-${name}-fire-run` } : {}),
        access: body.access,
        desc: String(body.desc || '').trim(),
      };
      const check = validateEntry(entry);
      if (!check.ok) return send(res, 400, { error: check.errors.join('; ') });
      // id vira runs[].g truncado em 8 — avisa, não bloqueia (é telemetria)
      const warnings = name.length > 8
        ? [`ℹ️ id com ${name.length} caracteres — na telemetria (runs[].g) ele aparece truncado como "${name.slice(0, 8)}".`]
        : [];
      // a arte precisa estar em art/ (o passo "aplicar" copia) ANTES do
      // registro — senão o jogo nasceria pedindo SVGs que não existem
      const prefixes = [entry.prefix, entry.firePrefix].filter(Boolean);
      const missing = prefixes.flatMap((p) => [0, 1, 2]
        .map((f) => `${p}-${f}.svg`)
        .filter((f) => !existsSync(join(ROOT, 'art', f))));
      if (missing.length) {
        return send(res, 409, { error: `faltam em art/: ${missing.join(', ')} — aplique a arte antes de registrar` });
      }
      const snapshot = { registry: readFileSync(REGISTRY_PATH, 'utf8'), sw: readFileSync(SW_PATH, 'utf8') };
      const result = await writeAndValidate(upsertSkin(snapshot.registry, entry), snapshot);
      if (!result.ok) {
        return send(res, 422, { error: 'a validação reprovou — nada foi alterado', testOutput: result.test.output });
      }
      return send(res, 200, { ok: true, skin: entry, skins: result.skins, warnings, testOutput: result.test.output });
    }
    if (path === '/api/skin/update' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString());
      const id = String(body.id || '');
      if (LOCKED_IDS.includes(id)) {
        return send(res, 403, { error: `"${id}" é o fallback do jogo — não se edita nem se esconde` });
      }
      const snapshot = { registry: readFileSync(REGISTRY_PATH, 'utf8'), sw: readFileSync(SW_PATH, 'utf8') };
      const current = parseRegistry(snapshot.registry).find((s) => s.id === id);
      if (!current) return send(res, 404, { error: `skin "${id}" não está no registry` });
      // o que a página edita depois de criada: vitrine, desbloqueio e a flag
      // "no jogo / fora do jogo". prefix/firePrefix/pending ficam como estão
      // (a arte não muda aqui). hidden: true grava; false REMOVE a chave —
      // assim "visível" volta ao formato original byte a byte.
      const entry = {
        ...current,
        ...(body.displayName !== undefined ? { name: String(body.displayName).trim() } : {}),
        ...(body.desc !== undefined ? { desc: String(body.desc).trim() } : {}),
        ...(body.access !== undefined ? { access: body.access } : {}),
      };
      if (body.hidden !== undefined) {
        if (body.hidden === true) entry.hidden = true;
        else delete entry.hidden;
      }
      const check = validateEntry(entry, { updating: true });
      if (!check.ok) return send(res, 400, { error: check.errors.join('; ') });
      const result = await writeAndValidate(upsertSkin(snapshot.registry, entry), snapshot);
      if (!result.ok) {
        return send(res, 422, { error: 'a validação reprovou — nada foi alterado', testOutput: result.test.output });
      }
      return send(res, 200, { ok: true, skin: entry, skins: result.skins, testOutput: result.test.output });
    }
    if (path === '/api/skin/remove' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString());
      const id = String(body.id || '');
      if (LOCKED_IDS.includes(id)) {
        return send(res, 403, { error: `"${id}" é o fallback do jogo — não se remove` });
      }
      const snapshot = { registry: readFileSync(REGISTRY_PATH, 'utf8'), sw: readFileSync(SW_PATH, 'utf8') };
      const current = parseRegistry(snapshot.registry).find((s) => s.id === id);
      if (!current) return send(res, 404, { error: `skin "${id}" não está no registry` });
      const newRegistry = removeSkin(snapshot.registry, id);
      const prefixes = [current.prefix, current.firePrefix].filter(Boolean);
      // builtin: os SVGs dela são manuscritos no sw FORA do bloco @setup:skins
      // — o patch do bloco não os alcança, então saem daqui (senão o PWA
      // nasceria pedindo arte que não existe). Skin criada: no-op (as linhas
      // dela vivem no bloco, que o patch reescreve do registry).
      const swBase = stripSwArtLines(snapshot.sw, prefixes);
      // apaga os SVGs de art/ guardando os bytes para o rollback (o output/
      // do gerador fica intacto — é a matéria-prima)
      const artFiles = [];
      for (const prefix of prefixes) {
        for (const f of [0, 1, 2]) {
          const file = join(ROOT, 'art', `${prefix}-${f}.svg`);
          if (existsSync(file)) artFiles.push({ file, bytes: readFileSync(file) });
        }
      }
      for (const { file } of artFiles) unlinkSync(file);
      const restoreArt = () => { for (const { file, bytes } of artFiles) writeFileSync(file, bytes); };
      const result = await writeAndValidate(newRegistry, snapshot, restoreArt, swBase);
      if (!result.ok) {
        return send(res, 422, { error: 'a validação reprovou — nada foi alterado', testOutput: result.test.output });
      }
      return send(res, 200, {
        ok: true, removed: id, skins: result.skins,
        deleted: artFiles.map(({ file }) => `art/${file.split(/[\\/]/).pop()}`),
        testOutput: result.test.output,
      });
    }

    // --------------------------------------------------- estáticos
    if (path === '/' || path === '/index.html') {
      return send(res, 200, readFileSync(join(HERE, 'index.html')), MIME['.html']);
    }
    if (path.startsWith('/output/')) {
      const file = normalize(join(HERE, path)).replace(/\\/g, '/');
      const base = normalize(OUT).replace(/\\/g, '/');
      if (!file.startsWith(base) || !existsSync(file)) return send(res, 404, { error: 'não achei' });
      const ext = file.slice(file.lastIndexOf('.'));
      return send(res, 200, readFileSync(file), MIME[ext] || 'application/octet-stream');
    }
    return send(res, 404, { error: 'rota desconhecida' });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
});

// Toma a porta de uma instância ANTIGA antes de escutar: sem isto, subir o
// server com código novo enquanto o velho roda dá EADDRINUSE — e pior, a
// página continua conversando com o código desatualizado sem ninguém notar
// (aconteceu 3× no desenvolvimento).
try {
  const r = await fetch(`http://localhost:${PORT}/api/shutdown`, {
    method: 'POST', signal: AbortSignal.timeout(1500),
  });
  if (r.ok) {
    console.log('♻️  Instância anterior encontrada — assumindo a porta…');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
} catch (e) { /* porta livre */ }

server.listen(PORT, () => {
  console.log(`🎨 Gerador de Sprites no ar: http://localhost:${PORT}`);
  console.log('   (parar: botão na página, ou Ctrl+C aqui)');
});
