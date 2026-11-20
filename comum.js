/* Código compartilhado entre index.html (médicos) e clinicas.html. */

const MINUSCULAS = new Set(["da", "de", "do", "das", "dos", "e", "a", "o", "em"]);
const SIGLAS = new Set(["UFMG", "EBSERH", "SUS", "UPA", "UBS", "SA", "S/A", "ME", "EPP", "FHEMIG", "CTI", "BH", "MG", "II", "III", "IV", "CEO", "IPSEMG", "UNIMED", "AMMG", "CRM"]);
const NUMERO_TESTE_PADRAO = "(31) 9163-9519";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const semAcento = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const titulo = s => String(s ?? "").split(/\s+/).filter(Boolean).map((p, i) => {
  const up = p.toUpperCase();
  if (SIGLAS.has(up.replace(/[.,]/g, ""))) return up;
  const low = p.toLowerCase();
  if (i > 0 && MINUSCULAS.has(low)) return low;
  return low.charAt(0).toUpperCase() + low.slice(1);
}).join(" ");
const telHref = t => `tel:+55${t.replace(/\D/g, "")}`;
const siteHref = s => /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^\/+/, "")}`;

const svg = corpo => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${corpo}</svg>`;
const icone = {
  tel: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  cel: svg('<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>'),
  wa: svg('<path d="M3 21l1.7-4.6A9 9 0 1 1 8.2 19.6L3 21z"/>'),
  mail: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  web: svg('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>'),
  map: svg('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
};

// Preferências de quem usa a página, guardadas só neste navegador.
const guardado = {
  ler(chave, padrao) { try { return localStorage.getItem(chave) ?? padrao; } catch { return padrao; } },
  gravar(chave, valor) { try { localStorage.setItem(chave, valor); } catch { /* modo privado: segue sem guardar */ } },
};

// API (FastAPI + Postgres no Railway) que guarda contatos e mensagens padrão para todos os aparelhos.
// "api.base" no localStorage aponta para uma API local de teste.
const API_BASE = guardado.ler("api.base", "https://api-production-e7b4ca28.up.railway.app");
async function chamarApi(metodo, caminho, corpo) {
  const r = await fetch(API_BASE + caminho, {
    method: metodo, cache: "no-store",
    ...(corpo === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }),
  });
  if (!r.ok) throw new Error(`${metodo} ${caminho}: ${r.status}`);
  return r.status === 204 ? null : r.json();
}

// "(31) 9163-9519" -> "5531991639519". Celular antigo de 8 dígitos ganha o 9 (mesma regra de telefones.py).
function digitosWhatsApp(telefone) {
  let d = String(telefone).replace(/\D/g, "").replace(/^0+/, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length === 8 || d.length === 9) d = "31" + d;
  if (d.length === 10 && /[6-9]/.test(d[2])) d = d.slice(0, 2) + "9" + d.slice(2);
  return d.length === 11 && d[2] === "9" ? "55" + d : null;
}
const waHref = (telefone, mensagem) => {
  const d = digitosWhatsApp(telefone);
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(mensagem)}` : null;
};

// Mostra a mensagem como o WhatsApp mostra: quebras de linha, *negrito* e _itálico_.
const formatarWhatsApp = texto => esc(texto)
  .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
  .replace(/(^|\s)_([^_\n]+)_/g, "$1<em>$2</em>");

// Botões de telefone de um card: celular (+ WhatsApp com a mensagem) e fixo.
function htmlTelefones(celulares, fixos, mensagem) {
  const links = [];
  for (const t of celulares) {
    links.push(`<a href="${telHref(t)}" title="Celular">${icone.cel}<span>${esc(t)}</span></a>`);
    const href = waHref(t, mensagem);
    if (href) links.push(`<a class="wa-link" href="${esc(href)}" target="_blank" rel="noopener" title="Abrir conversa no WhatsApp com a mensagem padrão">${icone.wa}<span>WhatsApp</span></a>`);
  }
  for (const t of fixos) links.push(`<a href="${telHref(t)}" title="Telefone fixo">${icone.tel}<span>${esc(t)}</span></a>`);
  return links.join("");
}

/* Configurações comuns às duas páginas, salvas na API (/configuracoes). */
const CONFIG_PADRAO = { empresa: "", equipe: ["Luciano", "Mauro", "Marino"] };
const soConfig = valor => ({ empresa: String(valor?.empresa ?? ""), equipe: Array.isArray(valor?.equipe) ? valor.equipe : CONFIG_PADRAO.equipe });
const CONFIG = (() => { try { return soConfig({ ...CONFIG_PADRAO, ...JSON.parse(guardado.ler("config", "{}")) }); } catch { return { ...CONFIG_PADRAO }; } })();
const guardarConfig = valor => { Object.assign(CONFIG, soConfig(valor)); guardado.gravar("config", JSON.stringify(CONFIG)); };

// Troca os campos comuns às duas páginas: {responsavel} e {empresa}.
function completarCampos(texto, { responsavel = "", config = CONFIG }) {
  return texto
    .replaceAll("{responsavel}", responsavel)
    .replaceAll("{empresa}", config.empresa.trim())
    .replace(/[ \t]{2,}/g, " ").replace(/ ([,.!?])/g, "$1"); // campo vazio não deixa espaço sobrando
}

const CAMPOS_COMUNS = [
  { token: "{responsavel}", rotulo: "Responsável", dica: "quem está com o contato" },
  { token: "{empresa}", rotulo: "Empresa", dica: "definida abaixo" },
];

// Mensagens de uma página: a geral e, opcionalmente, uma de cada responsável.
const textoPara = (textos, responsavel) => (responsavel && textos.por_responsavel[responsavel]?.trim()) ? textos.por_responsavel[responsavel] : textos.geral;

/**
 * Painel "Mensagem padrão do WhatsApp": prévia e teste; o botão Configurações abre a janela
 * onde se mudam as mensagens (geral e de cada responsável), a empresa e a equipe.
 *  el            elemento <section class="wa-painel"> onde o painel é montado
 *  chave         prefixo no localStorage (cópia das mensagens e painel aberto/fechado)
 *  textoPadrao   mensagem geral inicial
 *  campos        campos desta página: [{ token: "{nome}", rotulo: "Nome da clínica" }, ...]
 *  montar        (texto, item) => mensagem com os campos desta página trocados pelos dados do item
 *  responsavelDe item => nome do responsável pelo contato (ou "")
 *  exemplo       () => { item, nome } usado na prévia, ou null enquanto não há dados
 *  aoMudar       chamado quando as mensagens ou as configurações mudam, para refazer os cards
 *  lista         "clinicas" ou "medicos": as mensagens desta página ficam salvas na API
 */
function criarPainelWhatsApp({ el, chave, textoPadrao, descricao, campos, montar, responsavelDe, exemplo, aoMudar, lista }) {
  const lerTextos = () => {
    try {
      const t = JSON.parse(guardado.ler(`${chave}.textos`, "null"));
      if (t && typeof t.geral === "string") return { geral: t.geral, por_responsavel: t.por_responsavel || {} };
    } catch { /* cópia corrompida: usa o padrão */ }
    return { geral: guardado.ler(`${chave}.texto`, textoPadrao), por_responsavel: {} }; // versão anterior guardava só um texto
  };
  const estado = { textos: lerTextos(), numero: guardado.ler("wa.numero", NUMERO_TESTE_PADRAO) };
  const guardarTextos = () => guardado.gravar(`${chave}.textos`, JSON.stringify(estado.textos));
  const todosCampos = [...campos, ...CAMPOS_COMUNS];
  const engrenagem = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  el.setAttribute("aria-labelledby", "wa-titulo");
  el.innerHTML = `
    <details id="wa-details" open>
      <summary>
        <span class="wa-selo" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21l1.7-4.6A9 9 0 1 1 8.2 19.6L3 21z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a4 4 0 0 1-2.1-2.1l.8-1-1-2L9 9.5z"/></svg></span>
        <span class="wa-cabeca">
          <span class="wa-titulo" id="wa-titulo">Mensagem padrão do WhatsApp</span>
          <span class="wa-sub">${descricao}</span>
        </span>
        <svg class="wa-seta" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </summary>
      <div class="wa-corpo">
        <div class="wa-previa">
          <div class="wa-rotulo">Prévia <span class="wa-exemplo">exemplo com <b id="wa-exemplo"></b></span></div>
          <div class="wa-quem" id="wa-quem" role="group" aria-label="Ver a mensagem de"></div>
          <div class="wa-tela"><div class="wa-bolha" id="wa-bolha"></div></div>
          <div class="wa-resumo" id="wa-resumo"></div>
          <button type="button" class="wa-config-btn" id="wa-abrir">${engrenagem}Configurações da mensagem</button>
        </div>
        <div class="wa-lado">
          <label class="wa-rotulo" for="wa-numero">Teste no seu WhatsApp</label>
          <div class="wa-teste">
            <input type="tel" id="wa-numero" inputmode="tel" autocomplete="off" aria-describedby="wa-numero-ajuda">
            <a class="wa-botao" id="wa-testar" target="_blank" rel="noopener">Testar no WhatsApp</a>
          </div>
          <small id="wa-numero-ajuda" class="wa-ajuda"></small>
          <span class="wa-salvo" id="wa-salvo" role="status"></span>
        </div>
      </div>
    </details>

    <dialog class="wa-config" id="wa-config" aria-labelledby="wa-config-titulo">
      <form method="dialog" id="wa-form">
        <header class="wa-config-topo">
          <h2 id="wa-config-titulo">${engrenagem}Configurações da mensagem</h2>
          <button type="button" class="wa-fechar" id="wa-fechar" aria-label="Fechar sem salvar">×</button>
        </header>
        <div class="wa-config-corpo">
          <section>
            <h3>Mensagens desta página</h3>
            <p class="wa-dica">Cada contato recebe a mensagem do seu responsável. Quem não tiver mensagem própria, ou o contato sem responsável, usa a <b>Geral</b>.</p>
            <div class="wa-abas" id="wa-abas" role="tablist" aria-label="Mensagem de"></div>
            <textarea id="wa-texto" rows="7" spellcheck="true" aria-label="Texto da mensagem"></textarea>
            <div class="wa-aba-acoes" id="wa-aba-acoes"></div>
            <div class="wa-tokens" role="group" aria-label="Inserir campo personalizado">
              <span>Inserir:</span>
              ${todosCampos.map(c => `<button type="button" data-token="${esc(c.token)}" title="${esc(c.dica || "")}">${esc(c.rotulo)}</button>`).join("")}
            </div>
            <p class="wa-dica">Os campos entre chaves são trocados pelos dados de cada contato; use <code>*texto*</code> para negrito.</p>
            <div class="wa-tela wa-tela-mini"><div class="wa-bolha" id="wa-bolha-config"></div></div>
          </section>
          <section>
            <h3>Empresa</h3>
            <label class="wa-campo">Nome da empresa ou marca <small>campo {empresa}</small>
              <input id="wa-empresa" maxlength="120" placeholder="Ex.: Clínica Bem-Estar"></label>
          </section>
          <section>
            <h3>Equipe</h3>
            <label class="wa-campo">Quem pode ficar responsável pelos contatos <small>um nome por linha, vale nas duas páginas</small>
              <textarea id="wa-equipe" rows="4"></textarea></label>
          </section>
        </div>
        <footer class="wa-config-pe">
          <span class="wa-salvo" id="wa-config-status" role="status"></span>
          <button type="button" class="wa-secundario" id="wa-cancelar">Cancelar</button>
          <button type="submit" class="wa-botao" id="wa-salvar">Salvar</button>
        </footer>
      </form>
    </dialog>`;

  const $ = id => el.querySelector(`#${id}`);
  const details = $("wa-details"), dialogo = $("wa-config"), numero = $("wa-numero");
  numero.value = estado.numero;
  if (guardado.ler(`${chave}.aberto`, "1") === "0") details.open = false;
  details.addEventListener("toggle", () => guardado.gravar(`${chave}.aberto`, details.open ? "1" : "0"));

  const bolha = (alvo, mensagem) => { alvo.innerHTML = formatarWhatsApp(mensagem) || '<span class="wa-vazio">Sua mensagem aparece aqui.</span>'; };
  // Mensagem que `quem` mandaria para o contato de exemplo ("" = geral, sem responsável).
  const previa = (textos, quem, config = CONFIG) => {
    const ex = exemplo();
    const texto = textoPara(textos, quem);
    return ex ? completarCampos(montar(texto, ex.item), { responsavel: quem, config }) : texto;
  };

  // --- Painel: prévia, com botões para ver a mensagem de cada responsável.
  let vendo = "";
  function atualizar() {
    if (vendo && !CONFIG.equipe.includes(vendo)) vendo = "";
    $("wa-quem").innerHTML = ["", ...CONFIG.equipe].map(n =>
      `<button type="button" data-quem="${esc(n)}" aria-pressed="${n === vendo}">${n ? esc(n) : "Geral"}</button>`).join("");
    const ex = exemplo();
    const mensagem = previa(estado.textos, vendo);
    bolha($("wa-bolha"), mensagem);
    $("wa-exemplo").textContent = ex ? ex.nome : "";
    const proprias = CONFIG.equipe.filter(n => estado.textos.por_responsavel[n]?.trim());
    $("wa-resumo").innerHTML = [
      CONFIG.empresa && `Empresa: <b>${esc(CONFIG.empresa)}</b>`,
      `Mensagem própria: ${proprias.map(esc).join(", ") || "ninguém (todos usam a Geral)"}`,
    ].filter(Boolean).join("<br>");
    const botao = $("wa-testar"), ajuda = $("wa-numero-ajuda");
    const href = mensagem.trim() ? waHref(estado.numero, mensagem) : null;
    if (href) {
      botao.href = href; botao.removeAttribute("aria-disabled");
      ajuda.textContent = `Abre o WhatsApp com a mensagem ${vendo ? `de ${vendo}` : "geral"} para este número de teste.`;
    } else {
      botao.removeAttribute("href"); botao.setAttribute("aria-disabled", "true");
      ajuda.textContent = mensagem.trim() ? "Digite um celular com DDD, por exemplo (31) 99163-9519." : "Escreva a mensagem nas configurações para poder testar.";
    }
    ajuda.classList.toggle("erro-campo", !href);
  }
  $("wa-quem").addEventListener("click", e => {
    const b = e.target.closest("button[data-quem]");
    if (b) { vendo = b.dataset.quem; atualizar(); }
  });

  // --- Janela de configurações: edita uma cópia; só vale depois de Salvar.
  const form = { texto: $("wa-texto"), empresa: $("wa-empresa"), equipe: $("wa-equipe") };
  let rascunho, aba;
  const equipeDoForm = () => [...new Set(form.equipe.value.split("\n").map(n => n.trim()).filter(Boolean))];
  const configDoForm = () => ({ empresa: form.empresa.value.trim(), equipe: equipeDoForm() });

  function desenharAbas() {
    const equipe = equipeDoForm();
    if (aba && !equipe.includes(aba)) aba = "";
    $("wa-abas").innerHTML = ["", ...equipe].map(n => {
      const propria = n && rascunho.por_responsavel[n]?.trim();
      return `<button type="button" role="tab" data-aba="${esc(n)}" aria-selected="${n === aba}">${n ? esc(n) : "Geral"}${n ? `<small>${propria ? "própria" : "usa a Geral"}</small>` : ""}</button>`;
    }).join("");
    form.texto.value = aba ? (rascunho.por_responsavel[aba] || "") : rascunho.geral;
    form.texto.placeholder = aba ? `Vazio: ${aba} usa a mensagem Geral. Escreva aqui para ter uma mensagem própria.` : "";
    $("wa-aba-acoes").innerHTML = aba
      ? `<button type="button" class="limpar" data-acao="copiar">Começar a partir da Geral</button>${rascunho.por_responsavel[aba]?.trim() ? '<button type="button" class="limpar" data-acao="apagar">Voltar a usar a Geral</button>' : ""}`
      : '<button type="button" class="limpar" data-acao="restaurar">Restaurar texto padrão</button>';
    atualizarPrevia();
  }
  function atualizarPrevia() {
    bolha($("wa-bolha-config"), previa(rascunho, aba, configDoForm()));
  }
  function abrir() {
    rascunho = { geral: estado.textos.geral, por_responsavel: { ...estado.textos.por_responsavel } };
    aba = vendo;
    form.empresa.value = CONFIG.empresa; form.equipe.value = CONFIG.equipe.join("\n");
    $("wa-config-status").textContent = "";
    desenharAbas();
    dialogo.showModal();
    form.texto.focus();
  }
  const fechar = () => dialogo.close();

  form.texto.addEventListener("input", () => {
    if (aba) rascunho.por_responsavel[aba] = form.texto.value; else rascunho.geral = form.texto.value;
    const marca = el.querySelector(`#wa-abas [data-aba="${CSS.escape(aba)}"] small`);
    if (marca) marca.textContent = form.texto.value.trim() ? "própria" : "usa a Geral";
    atualizarPrevia();
  });
  form.empresa.addEventListener("input", atualizarPrevia);
  form.equipe.addEventListener("input", desenharAbas);
  $("wa-abas").addEventListener("click", e => {
    const b = e.target.closest("button[data-aba]");
    if (b) { aba = b.dataset.aba; desenharAbas(); form.texto.focus(); }
  });
  $("wa-aba-acoes").addEventListener("click", e => {
    const acao = e.target.closest("button[data-acao]")?.dataset.acao;
    if (acao === "copiar") rascunho.por_responsavel[aba] = rascunho.geral;
    if (acao === "apagar") delete rascunho.por_responsavel[aba];
    if (acao === "restaurar") rascunho.geral = textoPadrao;
    if (acao) { desenharAbas(); form.texto.focus(); }
  });

  async function salvar(e) {
    e.preventDefault();
    const config = configDoForm();
    const textos = {
      geral: rascunho.geral,
      por_responsavel: Object.fromEntries(Object.entries(rascunho.por_responsavel)
        .filter(([n, t]) => config.equipe.includes(n) && t.trim())),
    };
    const status = $("wa-config-status"), botao = $("wa-salvar");
    status.className = "wa-salvo"; status.textContent = "Salvando…"; botao.disabled = true;
    try {
      await Promise.all([
        chamarApi("PUT", `/mensagens/${lista}`, { texto: textos.geral, por_responsavel: textos.por_responsavel }),
        chamarApi("PUT", "/configuracoes", config),
      ]);
      estado.textos = textos; guardarTextos();
      guardarConfig(config);
      vendo = aba;
      fechar();
      mostrarSalvo("salvo");
      atualizar(); aoMudar();
    } catch (erro) {
      console.error(erro);
      status.className = "wa-salvo erro"; status.textContent = "Não foi possível salvar. Confira a conexão e tente de novo.";
    } finally {
      botao.disabled = false;
    }
  }

  const salvo = $("wa-salvo");
  function mostrarSalvo(tipo) {
    salvo.className = `wa-salvo ${tipo}`;
    salvo.innerHTML = tipo === "salvo"
      ? `${icone.ok}Mensagens e configurações salvas para todos os aparelhos`
      : 'Sem conexão: usando a última versão salva neste aparelho. <button type="button" class="limpar">Tentar de novo</button>';
    salvo.querySelector("button")?.addEventListener("click", carregarDaApi);
  }

  // Traz mensagens e configurações salvas (por exemplo, alteradas em outro aparelho).
  async function carregarDaApi() {
    if (dialogo.open) return; // não troca o que está sendo editado
    try {
      const [msg, config] = await Promise.all([chamarApi("GET", `/mensagens/${lista}`), chamarApi("GET", "/configuracoes")]);
      if (dialogo.open) return;
      let mudou = false;
      if (msg.texto !== null) {
        const remotos = { geral: msg.texto, por_responsavel: msg.por_responsavel || {} };
        if (JSON.stringify(remotos) !== JSON.stringify(estado.textos)) { estado.textos = remotos; guardarTextos(); mudou = true; }
      }
      if (config && JSON.stringify(soConfig(config)) !== JSON.stringify(soConfig(CONFIG))) { guardarConfig(config); mudou = true; }
      mostrarSalvo("salvo");
      if (mudou) { atualizar(); aoMudar(); }
    } catch (erro) {
      console.error(erro);
      mostrarSalvo("erro");
    }
  }

  $("wa-abrir").addEventListener("click", abrir);
  $("wa-fechar").addEventListener("click", fechar);
  $("wa-cancelar").addEventListener("click", fechar);
  $("wa-form").addEventListener("submit", salvar);
  dialogo.addEventListener("click", e => { if (e.target === dialogo) fechar(); }); // clique fora da janela
  el.querySelectorAll(".wa-tokens button").forEach(b => b.addEventListener("click", () => {
    form.texto.focus();
    form.texto.setRangeText(b.dataset.token, form.texto.selectionStart, form.texto.selectionEnd, "end");
    form.texto.dispatchEvent(new Event("input"));
  }));
  numero.addEventListener("input", () => { estado.numero = numero.value; guardado.gravar("wa.numero", estado.numero); atualizar(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) carregarDaApi(); });
  atualizar();
  carregarDaApi();

  // Mensagem do card: a do responsável pelo contato, ou a geral.
  return {
    mensagem: item => {
      const responsavel = responsavelDe(item) || "";
      return completarCampos(montar(textoPara(estado.textos, responsavel), item), { responsavel });
    },
    atualizar,
  };
}

const dataBR = iso => iso.split("-").reverse().slice(0, 2).join("/");
icone.ok = svg('<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>');
icone.marcar = svg('<circle cx="12" cy="12" r="10"/>');
icone.pessoa = svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>');

/**
 * Um valor por item (data do contato, nome do responsável...) salvo na API, para aparecer em
 * qualquer aparelho. Este navegador guarda uma cópia para abrir rápido; o que for alterado sem
 * conexão sobe na próxima sincronização.
 *  rota        ex. "/contatados/clinicas" (GET lista tudo; PUT/DELETE em rota/{id})
 *  parametro   nome do parâmetro do PUT que leva o valor (ex. "data", "nome")
 *  chaveLocal  chave da cópia no localStorage
 *  aviso       elemento que mostra um aviso só quando algo não pôde ser salvo
 *  aoMudar     chamado quando os valores mudam, para refazer os cards e contadores
 */
function criarValoresNaApi({ rota, parametro, chaveLocal, aviso, aoMudar }) {
  const mapa = (() => { try { return JSON.parse(guardado.ler(chaveLocal, "{}")) || {}; } catch { return {}; } })();
  const salvarLocal = () => guardado.gravar(chaveLocal, JSON.stringify(mapa));
  const enviar = (id, valor) => valor
    ? chamarApi("PUT", `${rota}/${encodeURIComponent(id)}?${parametro}=${encodeURIComponent(valor)}`)
    : chamarApi("DELETE", `${rota}/${encodeURIComponent(id)}`);
  let sincronizando = false;

  function avisar(mostrar) {
    aviso.innerHTML = mostrar
      ? `${svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16.5h.01"/>')}<span>Não foi possível salvar as alterações agora.</span><button type="button" class="limpar">Tentar de novo</button>`
      : "";
    aviso.querySelector("button")?.addEventListener("click", sincronizar);
  }

  // Traz os valores salvos; os que só existem neste aparelho são enviados junto.
  async function sincronizar() {
    if (sincronizando) return;
    sincronizando = true;
    try {
      const remotos = await chamarApi("GET", rota);
      const locais = Object.entries(mapa).filter(([id]) => !(id in remotos));
      await Promise.all(locais.map(([id, v]) => enviar(id, v)));
      for (const id of Object.keys(mapa)) delete mapa[id];
      Object.assign(mapa, remotos, Object.fromEntries(locais));
      salvarLocal();
      avisar(false);
    } catch (erro) {
      console.error(erro);
      avisar(true);
    } finally {
      sincronizando = false;
    }
    aoMudar();
  }

  // valor vazio apaga. Se a API falhar, desfaz na tela para não mostrar algo que não foi salvo.
  function definir(id, valor) {
    const antes = mapa[id];
    if (valor) mapa[id] = valor; else delete mapa[id];
    salvarLocal();
    aoMudar();
    enviar(id, valor)
      .then(() => avisar(false))
      .catch(erro => {
        console.error(erro);
        if (antes) mapa[id] = antes; else delete mapa[id];
        salvarLocal();
        avisar(true);
        aoMudar();
      });
  }

  document.addEventListener("visibilitychange", () => { if (!document.hidden) sincronizar(); }); // traz o que mudou em outro aparelho
  sincronizar();
  return { valor: id => mapa[id], definir };
}

// Marcação de "já contatado": guarda a data do contato.
function criarContatos({ lista, chaveLocal, aviso, aoMudar }) {
  const valores = criarValoresNaApi({ rota: `/contatados/${lista}`, parametro: "data", chaveLocal, aviso, aoMudar });

  // Botão do card. feminino: "contatada" (clínica) ou "contatado" (médico).
  function botao(id, feminino) {
    const quando = valores.valor(id), fim = feminino ? "a" : "o";
    return `<button type="button" class="contato-btn" data-contato-id="${esc(id)}" aria-pressed="${Boolean(quando)}" title="${quando ? "Toque para desmarcar" : "Marque depois de fazer o contato"}">`
      + (quando ? `${icone.ok}<span>Contatad${fim} em ${dataBR(quando)}</span>` : `${icone.marcar}<span>Marcar como contatad${fim}</span>`) + `</button>`;
  }

  // Um clique em qualquer botão de contato dentro de `el` marca (com a data de hoje) ou desmarca.
  function ligar(el) {
    el.addEventListener("click", e => {
      const b = e.target.closest(".contato-btn");
      if (!b) return;
      const id = b.dataset.contatoId;
      valores.definir(id, valores.valor(id) ? "" : new Date().toLocaleDateString("sv")); // AAAA-MM-DD no fuso local
    });
  }

  return { quando: valores.valor, botao, ligar };
}

// Quem da equipe (CONFIG.equipe, editável nas configurações) vai fazer o contato com cada item.
const SEM_RESPONSAVEL = "-"; // valor do filtro "Sem responsável"

function criarResponsaveis({ lista, chaveLocal, aviso, aoMudar }) {
  const valores = criarValoresNaApi({ rota: `/responsaveis/${lista}`, parametro: "nome", chaveLocal, aviso, aoMudar });

  function seletor(id) {
    const atual = valores.valor(id) || "";
    const nomes = CONFIG.equipe;
    const opcoes = ["", ...nomes, ...(atual && !nomes.includes(atual) ? [atual] : [])];
    return `<label class="responsavel${atual ? " definido" : ""}">${icone.pessoa}<span>Responsável</span>
      <select data-responsavel-id="${esc(id)}" aria-label="Responsável pelo contato">
        ${opcoes.map(n => `<option value="${esc(n)}"${n === atual ? " selected" : ""}>${n ? esc(n) : "Ninguém ainda"}</option>`).join("")}
      </select></label>`;
  }

  function ligar(el) {
    el.addEventListener("change", e => {
      const sel = e.target.closest("select[data-responsavel-id]");
      if (sel) valores.definir(sel.dataset.responsavelId, sel.value);
    });
  }

  // Opções do filtro da barra, com quantos itens cada pessoa tem.
  function preencherFiltro(sel, ids, atual) {
    const conta = {};
    for (const id of ids) { const r = valores.valor(id) || SEM_RESPONSAVEL; conta[r] = (conta[r] || 0) + 1; }
    const nomes = CONFIG.equipe;
    const todos = [...nomes, ...Object.keys(conta).filter(n => n !== SEM_RESPONSAVEL && !nomes.includes(n))];
    sel.innerHTML = '<option value="">Todos os responsáveis</option>'
      + todos.map(n => `<option value="${esc(n)}">${esc(n)} (${conta[n] || 0})</option>`).join("")
      + `<option value="${SEM_RESPONSAVEL}">Sem responsável (${conta[SEM_RESPONSAVEL] || 0})</option>`;
    sel.value = atual;
  }

  // O item passa no filtro escolhido na barra ("" = todos).
  const passa = (id, filtro) => !filtro || (valores.valor(id) || SEM_RESPONSAVEL) === filtro;

  return { de: valores.valor, seletor, ligar, preencherFiltro, passa };
}

// Regionais administrativas de BH (regioes.py preenche "regiao" nos JSON).
const REGIOES = ["Barreiro", "Centro-Sul", "Leste", "Nordeste", "Noroeste", "Norte", "Oeste", "Pampulha", "Venda Nova", "Fora de BH"];

/**
 * Preenche os <select> de região e bairro; o de bairro mostra só os bairros da região escolhida.
 *  itens         clínicas ou médicos
 *  locaisDe      item => [{ regiao, bairro }, ...] (uma clínica tem um local; um médico, vários)
 *  rotuloBairro  como mostrar o nome do bairro
 * Entre parênteses: quantos itens têm algum local ali.
 */
function preencherLocalidades(selRegiao, selBairro, itens, locaisDe, { regiao, bairro }, rotuloBairro = b => b) {
  const conta = teste => itens.filter(i => locaisDe(i).some(teste)).length;
  const opcao = (valor, texto, n) => `<option value="${esc(valor)}">${esc(texto)} (${n})</option>`;
  const regioes = REGIOES.filter(r => itens.some(i => locaisDe(i).some(l => l.regiao === r)));
  selRegiao.innerHTML = '<option value="">Todas as regiões</option>'
    + regioes.map(r => opcao(r, r, conta(l => l.regiao === r))).join("");
  selRegiao.value = regiao;
  const bairros = [...new Set(itens.flatMap(i => locaisDe(i)
    .filter(l => l.bairro && (!regiao || l.regiao === regiao)).map(l => l.bairro)))]
    .sort((a, b) => rotuloBairro(a).localeCompare(rotuloBairro(b), "pt-BR"));
  selBairro.innerHTML = `<option value="">${regiao ? `Todos os bairros (${esc(regiao)})` : "Todos os bairros"}</option>`
    + bairros.map(b => opcao(b, rotuloBairro(b), conta(l => l.bairro === b && (!regiao || l.regiao === regiao)))).join("");
  selBairro.value = bairro;
}
