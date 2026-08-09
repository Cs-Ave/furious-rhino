// Notificações do administrador via ntfy (v1.6.1) — DEFAULTS.
//
// Estes valores são o piso versionado. O doc `config/notify` do Firestore
// SOBREPÕE campo a campo (leitura pública, escrita só pelo console do
// Firebase), então dá para ligar/desligar e ajustar limiares sem deploy.
// Ver NotifySystem.config().
//
// ⚠️ `topic` nasce VAZIO de propósito: sem tópico o sistema inteiro fica
// desligado. Quem clonar este repositório não passa a notificar ninguém, e
// um tópico não preenchido nunca vira spam acidental.
//
// ⚠️ Um tópico do ntfy é público para quem souber o nome, e o nome fica no
// código-fonte de um repositório público. Use um sufixo aleatório longo
// (ex.: 'rhino-a7f3c91b2e04') e lembre que apelido e cidade JÁ são de
// leitura pública no Firestore — é o que faz o painel /?stats funcionar.
// Ainda assim, `includeName` e `includePlace` existem para você decidir.
export const notifyConfig = {
  enabled: true,
  // `server` é só o HOST — o tópico NÃO entra na URL. Quem publica monta
  // `POST <server>/` com o tópico dentro do corpo JSON (ver NotifySystem.post).
  server: 'https://ntfy.sh',
  topic: 'furiousrhino-f8497207e3be',

  // Quais eventos disparam
  onStart: true,          // 1ª corrida de cada sessão
  onSessionEnd: true,     // resumo quando a sessão encerra (ou no tempo abaixo)
  onWorldRecord: true,    // alguém passou o líder mundial

  // Manda o resumo da sessão depois deste tempo mesmo que ela continue viva
  sessionSummaryAfterMin: 15,
  // Silencia sessões irrelevantes: resumo só sai se a melhor marca passar disto
  minMetersToNotify: 0,

  // Faixa de silêncio, em HORAS de America/Sao_Paulo (não no relógio do
  // jogador). [0, 7] = das 00h às 06h59. [0, 0] desliga o silêncio.
  quietHours: [0, 7],

  // Conteúdo das mensagens
  includeName: true,
  includePlace: true,

  // Trava de segurança: teto de mensagens por aba aberta
  maxPerSession: 4,
};
