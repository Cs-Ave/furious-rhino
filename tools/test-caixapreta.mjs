// Testes da CAIXA-PRETA (v1.9.8→v1.9.11) — sem navegador, sem rede.
//
// POR QUE ESTE ARQUIVO EXISTE. Em 28-29/08 um jogador real não conseguia abrir
// o jogo ("Um problema ocorreu repetidamente", CASO 2) — sem console, sem
// telemetria, sem nada: a página morria antes de qualquer coisa nossa
// registrar. A saída foi fazer a própria página deixar rastro, e três releases
// de instrumentação estreitaram o crash até um nome de bloco de código
// (`cena:chao`) que virou a correção da v1.9.11.
//
// O instrumento é hoje o ÚNICO olho do projeto para crash de campo — e até
// aqui nenhum teste o protegia: qualquer refactor podia arrancar um marco e
// nada ficaria vermelho. Um marco que some não quebra o jogo; quebra a
// próxima investigação, e só se descobre quando ela for necessária.
//
// São text-asserts (mesmo molde da seção 7 do test-crash.mjs, que trava o
// service worker): o valor está em falhar quando alguém MEXE, não em provar
// comportamento — o comportamento tem sonda de navegador própria.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8');

let pass = 0;
let fail = 0;
function eq(nome, obtido, esperado) {
  const a = JSON.stringify(obtido);
  const b = JSON.stringify(esperado);
  if (a === b) { pass++; console.log(`PASS  ${nome}`); }
  else { fail++; console.log(`FAIL  ${nome}\n      esperado ${b}\n      obtido   ${a}`); }
}

const html = ler('index.html');
const boot = ler('js/scenes/BootScene.js');
const cena = ler('js/scenes/GameScene.js');
const jogo = ler('js/game.js');
const tex = ler('js/systems/TextureFactory.js');

// ---------- 1. a cadeia de marcos, na ordem do voo ----------
// Cada marco é um degrau: o último gravado antes da morte diz onde ela foi.
// Buraco na cadeia = cego naquele trecho, e é exatamente o que aconteceu com
// a v1.9.8 (que parava no v8) quando a morte era lá adiante, no create().
const CADEIA = [
  ['v0-head', html, 'o gravador nasce ANTES de tudo'],
  ['v1-css', html, 'o CSS inteiro foi parseado'],
  ['v2-body', html, 'o body abriu'],
  ['v3-dom', html, 'o HTML da home terminou'],
  ['v4-phaser-pre', html, 'véspera do document.write do Phaser'],
  ['v5-phaser', html, 'depois do Phaser (ou pulado, no modo seguro)'],
  ['v6-module', jogo, 'o módulo do jogo chegou a rodar'],
  ['v7-home', jogo, 'a home pintou'],
  ['v8-engine', jogo, 'o motor subiu'],
  ['v9-preload', boot, 'o preload dos SVGs começou'],
  ['v9-load-25', boot, 'progresso do preload'],
  ['v9-load-50', boot, 'progresso do preload'],
  ['v9-load-75', boot, 'progresso do preload'],
  ['v10-loaded', boot, 'os arquivos terminaram'],
  ['v11-texfab', boot, 'a geração de texturas começou'],
  ['v12-texfab-ok', boot, 'a geração de texturas terminou'],
  ['v13-anims-ok', boot, 'as animações foram criadas'],
  ['v14-cena', cena, 'o create da cena começou'],
  ['v14b-cena-ok', cena, 'o create TERMINOU (morte aqui = 1º frame do WebGL)'],
  ['v15-update1', cena, 'o primeiro update — o mundo está vivo'],
];
for (const [marco, arquivo, papel] of CADEIA) {
  eq(`marco ${marco}: ${papel}`, arquivo.includes(marco), true);
}

// ---------- 2. o conta-giros: o ITEM, não a fase ----------
// A fase (v14-cena) dizia "morreu no create"; o conta-giros disse `cena:chao`.
// É a diferença entre saber o cômodo e saber o móvel.
eq('o conta-giros existe e grava no localStorage',
  html.includes('__frPasso') && html.includes("localStorage.setItem('fr_voo_passo'"), true);
eq('cada arquivo do preload anuncia o próprio nome',
  boot.includes("passo('carregando:' + f.key)"), true);
eq('os 34 geradores de textura anunciam (o slot diz qual rodava)',
  (tex.match(/passo\('generate[A-Za-z0-9]+'\)/g) || []).length >= 30, true);

// Os blocos do create — a resolução que nomeou o assassino do CASO 2.
const BLOCOS = ['fundo', 'rino', 'spawns', 'chao', 'arcos-e-marcas',
  'input-pausa-colisoes', 'audio', 'tela-inicio', 'particulas-vento', 'camera'];
eq('os 10 blocos do create anunciam',
  BLOCOS.filter((b) => cena.includes(`passo('${b}')`)), BLOCOS);
eq('o chão tem sub-marcos próprios (foi ele o culpado da v1.9.11)',
  ['visual', 'corpo', 'colisores'].every((s) => cena.includes(`passo('${s}')`)), true);

// ---------- 3. o viewer: tem de sobreviver à página quebrada ----------
// Se o assassino mora no nosso CSS, um viewer que dependa do CSS morre junto.
// O <plaintext> escrito durante o parse neutraliza TODO o resto do documento.
eq('/?voo=1 é reconhecido', html.includes("q.get('voo') === '1'"), true);
eq('...e neutraliza o resto do documento com <plaintext>',
  html.includes('<plaintext>'), true);
eq('...mostrando o voo atual, o anterior E o passo fino',
  html.includes('fr_voo_atual') && html.includes('fr_voo_anterior')
  && html.includes('ULTIMO PASSO FINO'), true);
eq('...e o user-agent (o UA do iOS congela a versão do sistema — a real vem daqui)',
  html.includes('navigator.userAgent'), true);
// O window.stop() foi TESTADO e removido: impedia o DOMContentLoaded e o
// plaintext já basta. Registrado para ninguém "consertar" isso de volta.
eq('o viewer NÃO usa window.stop (foi testado e atrapalhava)',
  html.includes('window.stop()'), false);

// ---------- 4. o voo anterior é arquivado ----------
// Um crash-loop sobrescreve o voo bom; sem arquivar, a evidência da morte
// anterior se perderia na recarga seguinte.
eq('o voo anterior é preservado antes de começar o novo',
  html.includes("localStorage.setItem('fr_voo_anterior'"), true);

// ---------- 5. os modos de bisseção ----------
eq('/?safe=1 existe e pula o Phaser no index',
  html.includes("q.get('safe') === '1'") && html.includes('!window.__frSafe'), true);
eq('...e para na home, sem construir a cena',
  jogo.includes('if (window.__frSafe)') && jogo.includes('MODO SEGURO'), true);
eq('/?canvas=1 força o renderer CANVAS (separa WebGL do resto)',
  html.includes("q.get('canvas') === '1'")
  && jogo.includes('window.__frCanvas ? Phaser.CANVAS : Phaser.AUTO'), true);

// ---------- 6. o gravador jamais derruba a página que ele vigia ----------
// Ele roda ANTES de tudo: se lançar, leva o jogo junto — e o modo privado do
// Safari (que recusa localStorage) é exatamente o cenário de quem já está com
// problema. Por isso todo acesso a storage é embrulhado.
{
  const bloco = html.slice(html.indexOf('GRAVADOR DE VOO'), html.indexOf("__frVoo('v0-head')"));
  const setItems = (bloco.match(/localStorage\.setItem/g) || []).length;
  const trys = (bloco.match(/try \{/g) || []).length;
  eq('o gravador embrulha todo acesso ao storage em try/catch',
    trys >= setItems && setItems > 0, true);
  eq('...e nasce com stubs inertes (chamador antes do setup não quebra)',
    bloco.includes('window.__frVoo = function () {}')
    && bloco.includes('window.__frPasso = function () {}'), true);
}
eq('os marcos do jogo são chamados com guarda (a página /?stats não tem gravador)',
  cena.includes("typeof window !== 'undefined' && window.__frVoo"), true);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
