import { Constants } from '../utils/Constants.js';
import { ART_MANIFEST } from '../art/ArtManifest.js';
import { SKINS } from '../systems/SkinSystem.js';

// Aba 🖼️ SPRITES do /?setup — gestão de todos os sprites do jogo:
// 📚 catálogo vivo (todos os SVGs de art/, animados, com local e parâmetros),
// ⚙️ gerador de sprites de inimigo (moldes do gerador de skins) e
// 📥 área de "não atribuídos" (gerados, ainda fora do jogo).
//
// Carregada sob demanda pelo SetupPage (import dinâmico no 1º clique) — o
// /?setup abre instantâneo e nada aqui roda antes da vontade do dono. Os
// dados de design vêm dos módulos ES do próprio jogo (Constants já mesclado
// com SpriteParams + SPRITE_BASE pré-merge); o que é volátil (overrides
// frescos, índice de não atribuídos) vem da API local do estúdio.

// Mesmo helper do SetupPage (duplicado de propósito — cada página estática é
// autossuficiente). textContent sempre: nada de innerHTML com dado de fora.
function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

export function mount(root) {
  // Sub-views da aba: segmented control no mesmo estilo das abas da página
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
  views.gerador.painel.append(el('p', 'su-muted',
    'O gerador de sprites de inimigo chega na fatia S4 — por ora, use a aba 🎨 Skins como referência do fluxo.'));
  views.orfaos.painel.append(el('p', 'su-muted',
    'A área de sprites não atribuídos chega junto com o gerador (S4).'));
}

// ------------------------------------------------------------- 📚 catálogo
// S1: esqueleto com o inventário contado (prova que os módulos ES chegam);
// a S2 troca isto pelo catálogo completo (grupos, thumbs animadas, locais,
// parâmetros).
function montarCatalogo(root) {
  const card = el('div', 'su-card');
  card.id = 'sp-catalogo';
  card.append(el('h2', null, '📚 Catálogo de sprites'));
  const nManifesto = Object.keys(ART_MANIFEST).length;
  const nEspecies = Constants.ANIMAL_TYPES.length;
  const nSkins = SKINS.filter((s) => s.prefix).length;
  card.append(el('p', 'su-muted',
    `${nManifesto} texturas no manifesto · ${nEspecies} espécies · ${nSkins} skins com arte própria · `
    + `${Constants.SPRITE_NEW.length} espécie(s) criada(s) pela aba.`));
  card.append(el('p', 'su-muted', 'O catálogo completo (animado, com locais e parâmetros) chega na fatia S2.'));
  root.append(card);
}
