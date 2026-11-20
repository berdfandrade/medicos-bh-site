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
  ok: svg('<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>'),
  marcar: svg('<circle cx="12" cy="12" r="10"/>'),
  map: svg('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
};

// Preferências de quem usa a página, guardadas só neste navegador.
const guardado = {
  ler(chave, padrao) { try { return localStorage.getItem(chave) ?? padrao; } catch { return padrao; } },
  gravar(chave, valor) { try { localStorage.setItem(chave, valor); } catch { /* modo privado: segue sem guardar */ } },
};

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

/**
 * Painel "Mensagem padrão do WhatsApp".
 *  el          elemento <section class="wa-painel"> onde o painel é montado
 *  chave       prefixo no localStorage (texto e aberto/fechado por página; o número de teste é comum)
 *  textoPadrao mensagem inicial
 *  campos      [{ token: "{nome}", rotulo: "Nome da clínica" }, ...]
 *  montar      (texto, item) => mensagem com os campos trocados pelos dados do item
 *  exemplo     () => { item, nome } usado na prévia, ou null enquanto não há dados
 *  aoMudar     chamado (com atraso) quando o texto muda, para refazer os cards
 */
function criarPainelWhatsApp({ el, chave, textoPadrao, descricao, campos, montar, exemplo, aoMudar }) {
  const estado = {
    texto: guardado.ler(`${chave}.texto`, textoPadrao),
    numero: guardado.ler("wa.numero", NUMERO_TESTE_PADRAO),
  };
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
        <div class="wa-editor">
          <label class="wa-rotulo" for="wa-texto">1. Escreva a mensagem</label>
          <textarea id="wa-texto" rows="7" spellcheck="true"></textarea>
          <div class="wa-tokens" role="group" aria-label="Inserir campo personalizado">
            <span>Inserir no texto:</span>
            ${campos.map(c => `<button type="button" data-token="${esc(c.token)}">${esc(c.rotulo)}</button>`).join("")}
          </div>
          <p class="wa-dica">Os campos entre chaves são trocados pelos dados de cada contato. Use <code>*texto*</code> para negrito.</p>
          <button type="button" class="limpar" id="wa-restaurar">Restaurar texto padrão</button>
        </div>
        <div class="wa-previa">
          <div class="wa-rotulo">2. Confira a prévia <span class="wa-exemplo">exemplo com <b id="wa-exemplo"></b></span></div>
          <div class="wa-tela"><div class="wa-bolha" id="wa-bolha"></div></div>
          <label class="wa-rotulo" for="wa-numero">3. Teste no seu WhatsApp</label>
          <div class="wa-teste">
            <input type="tel" id="wa-numero" inputmode="tel" autocomplete="off" aria-describedby="wa-numero-ajuda">
            <a class="wa-botao" id="wa-testar" target="_blank" rel="noopener">Testar no WhatsApp</a>
          </div>
          <small id="wa-numero-ajuda" class="wa-ajuda"></small>
        </div>
      </div>
    </details>`;

  const $ = id => el.querySelector(`#${id}`);
  const texto = $("wa-texto"), numero = $("wa-numero"), details = $("wa-details");
  texto.value = estado.texto;
  numero.value = estado.numero;
  if (guardado.ler(`${chave}.aberto`, "1") === "0") details.open = false;
  details.addEventListener("toggle", () => guardado.gravar(`${chave}.aberto`, details.open ? "1" : "0"));

  function atualizar() {
    const ex = exemplo();
    const mensagem = ex ? montar(estado.texto, ex.item) : estado.texto;
    $("wa-bolha").innerHTML = formatarWhatsApp(mensagem) || '<span class="wa-vazio">Sua mensagem aparece aqui.</span>';
    $("wa-exemplo").textContent = ex ? ex.nome : "";
    const botao = $("wa-testar"), ajuda = $("wa-numero-ajuda");
    const href = estado.texto.trim() ? waHref(estado.numero, mensagem) : null;
    if (href) {
      botao.href = href; botao.removeAttribute("aria-disabled");
      ajuda.textContent = "Abre o WhatsApp com a prévia acima para este número de teste.";
    } else {
      botao.removeAttribute("href"); botao.setAttribute("aria-disabled", "true");
      ajuda.textContent = estado.texto.trim() ? "Digite um celular com DDD, por exemplo (31) 99163-9519." : "Escreva a mensagem para poder testar.";
    }
    ajuda.classList.toggle("erro-campo", !href);
  }

  let t;
  const mudouTexto = () => {
    estado.texto = texto.value;
    guardado.gravar(`${chave}.texto`, estado.texto);
    atualizar();
    clearTimeout(t);
    t = setTimeout(aoMudar, 250); // atualiza os links dos cards
  };
  texto.addEventListener("input", mudouTexto);
  numero.addEventListener("input", () => { estado.numero = numero.value; guardado.gravar("wa.numero", estado.numero); atualizar(); });
  el.querySelectorAll(".wa-tokens button").forEach(b => b.addEventListener("click", () => {
    texto.focus();
    texto.setRangeText(b.dataset.token, texto.selectionStart, texto.selectionEnd, "end");
    mudouTexto();
  }));
  $("wa-restaurar").addEventListener("click", () => { texto.value = textoPadrao; mudouTexto(); });
  atualizar();

  return { mensagem: item => montar(estado.texto, item), atualizar };
}
