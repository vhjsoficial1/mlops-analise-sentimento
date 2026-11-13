"use strict";

/* =========================================================
   Configuração
   ========================================================= */
const API_URL = window.API_URL || "http://localhost:8000";
const STORAGE_REVIEWS = "loja:comentarios";
const STORAGE_A11Y = "loja:acessibilidade";
const STORAGE_CART = "loja:carrinho";

/* =========================================================
   Dados de exemplo
   ========================================================= */
const CATEGORIAS = {
    eletronicos: "Eletrônicos",
    casa: "Casa",
    moda: "Moda",
    esporte: "Esporte",
};

const PRODUTOS = [
    {
        id: "fone-bluetooth", nome: "Fone de Ouvido Bluetooth Pro", categoria: "eletronicos",
        preco: 349.9, emoji: "🎧", cor: "#dfe7ff",
        descricao: "Cancelamento de ruído ativo, 30 horas de bateria e estojo de carregamento rápido via USB-C.",
        comentarios: [
            { autor: "Mariana S.", nota: 5, texto: "O produto ficou muito bom, o som é excelente e a bateria dura muito.", data: "2026-10-28" },
            { autor: "Carlos E.", nota: 2, texto: "Chegou com defeito no lado esquerdo, estou insatisfeito.", data: "2026-10-20" },
            { autor: "Júlia P.", nota: 4, texto: "Recomendo, a entrega ficou muito boa e o fone é confortável.", data: "2026-10-11" },
        ],
    },
    {
        id: "smartwatch", nome: "Smartwatch Fit 2", categoria: "eletronicos",
        preco: 599.0, emoji: "⌚", cor: "#e4f2ff",
        descricao: "Monitor cardíaco, GPS integrado, resistente à água e mais de 100 modos de exercício.",
        comentarios: [
            { autor: "Renato A.", nota: 5, texto: "Adorei o relógio, superou minhas expectativas!", data: "2026-11-02" },
            { autor: "Fernanda L.", nota: 1, texto: "Nunca mais compro nessa loja, o atendimento foi péssimo.", data: "2026-10-15" },
        ],
    },
    {
        id: "cafeteira", nome: "Cafeteira Expresso Compacta", categoria: "casa",
        preco: 799.9, emoji: "☕", cor: "#f6e9dc",
        descricao: "Pressão de 15 bar, vaporizador de leite e reservatório removível de 1,2 litro.",
        comentarios: [
            { autor: "Paulo R.", nota: 5, texto: "Café delicioso todos os dias, a entrega foi rápida e eficiente.", data: "2026-11-05" },
            { autor: "Beatriz M.", nota: 2, texto: "Não gostei do produto, faz muito barulho, não recomendo.", data: "2026-10-30" },
            { autor: "Lucas F.", nota: 4, texto: "Adorei a embalagem, foi muito boa e o produto funciona bem.", data: "2026-10-18" },
        ],
    },
    {
        id: "luminaria", nome: "Luminária de Mesa LED", categoria: "casa",
        preco: 129.9, emoji: "💡", cor: "#fff4cc",
        descricao: "Três temperaturas de cor, ajuste de brilho por toque e braço articulado.",
        comentarios: [
            { autor: "Camila T.", nota: 5, texto: "Ótima luminária, recomendo a todos.", data: "2026-10-25" },
        ],
    },
    {
        id: "tenis-corrida", nome: "Tênis de Corrida Leve", categoria: "esporte",
        preco: 429.0, emoji: "👟", cor: "#e2f5ea",
        descricao: "Entressola com amortecimento responsivo e cabedal respirável em malha.",
        comentarios: [
            { autor: "Gabriel N.", nota: 5, texto: "Muito confortável, a experiência de compra foi satisfatória.", data: "2026-11-01" },
            { autor: "Larissa O.", nota: 2, texto: "O produto chegou com defeito na sola, estou insatisfeita.", data: "2026-10-22" },
        ],
    },
    {
        id: "garrafa-termica", nome: "Garrafa Térmica 1L", categoria: "esporte",
        preco: 99.9, emoji: "🧴", cor: "#e0f4f4",
        descricao: "Aço inox de parede dupla, mantém a temperatura por até 24 horas.",
        comentarios: [
            { autor: "Rafael C.", nota: 3, texto: "O serviço foi ótimo, recomendo a todos.", data: "2026-10-19" },
        ],
    },
    {
        id: "jaqueta", nome: "Jaqueta Corta-Vento", categoria: "moda",
        preco: 259.9, emoji: "🧥", cor: "#ece4f7",
        descricao: "Tecido leve e repelente à água, com capuz ajustável e bolsos com zíper.",
        comentarios: [
            { autor: "Amanda G.", nota: 1, texto: "O atendimento ao cliente foi péssimo, não volto a comprar.", data: "2026-10-27" },
            { autor: "Thiago V.", nota: 5, texto: "Produto excelente, veio no tamanho certo.", data: "2026-10-09" },
        ],
    },
    {
        id: "mochila", nome: "Mochila Urbana 25L", categoria: "moda",
        preco: 219.0, emoji: "🎒", cor: "#f7e4e4",
        descricao: "Compartimento acolchoado para notebook de até 15,6\" e tecido impermeável.",
        comentarios: [],
    },
];

/* =========================================================
   Estado
   ========================================================= */
const state = {
    // comentários adicionados pelo usuário, por produto
    userReviews: loadJSON(STORAGE_REVIEWS, {}),
    // cache das classificações: texto -> {sentimento, confianca, versao_modelo} | "erro"
    classifications: new Map(),
    pending: new Map(),
    cart: loadJSON(STORAGE_CART, 0),
    filter: "todos",
    apiOnline: null,
};

function loadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
}
function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ }
}

function getReviews(produto) {
    const extras = state.userReviews[produto.id] || [];
    return [...extras, ...produto.comentarios];
}

/* =========================================================
   Utilitários
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(str) {
    return String(str)
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dataFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
const fmtData = (iso) => dataFmt.format(new Date(iso + "T12:00:00"));
const pct = (x) => `${Math.round(x * 100)}%`;

function announce(msg) {
    const el = $("#announcer");
    el.textContent = "";
    // pequeno atraso garante que leitores de tela percebam a mudança
    setTimeout(() => { el.textContent = msg; }, 50);
}

let toastTimer;
function toast(msg) {
    let el = $(".toast");
    if (!el) {
        el = document.createElement("div");
        el.className = "toast";
        el.setAttribute("aria-hidden", "true"); // o anúncio é feito pelo #announcer
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
}

function starsVisual(nota) {
    return "★".repeat(nota) + "☆".repeat(5 - nota);
}

/* =========================================================
   API de sentimento
   ========================================================= */
async function checkHealth() {
    const el = $("#api-status");
    const text = $(".api-status__text", el);
    try {
        const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        state.apiOnline = true;
        el.dataset.state = "online";
        text.textContent = `Modelo de sentimento online (versão ${data.versao_modelo})`;
    } catch {
        state.apiOnline = false;
        el.dataset.state = "offline";
        text.textContent = "Modelo de sentimento indisponível — comentários não serão classificados";
    }
}

function classify(texto) {
    if (state.classifications.has(texto)) return Promise.resolve(state.classifications.get(texto));
    if (state.pending.has(texto)) return state.pending.get(texto);

    const p = fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
        signal: AbortSignal.timeout(8000),
    })
        .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
        .then((data) => { state.classifications.set(texto, data); return data; })
        .catch(() => { state.classifications.set(texto, "erro"); return "erro"; })
        .finally(() => state.pending.delete(texto));

    state.pending.set(texto, p);
    return p;
}

async function classifyAll(produtos) {
    const textos = new Set(produtos.flatMap((p) => getReviews(p).map((r) => r.texto)));
    await Promise.all([...textos].map(classify));
}

function sentimentStats(produto) {
    const reviews = getReviews(produto);
    let pos = 0, neg = 0;
    for (const r of reviews) {
        const c = state.classifications.get(r.texto);
        if (c && c !== "erro") c.sentimento === "positivo" ? pos++ : neg++;
    }
    const notas = reviews.map((r) => r.nota);
    const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
    return { total: reviews.length, pos, neg, classified: pos + neg, media };
}

/* =========================================================
   Componentes
   ========================================================= */
function badgeHTML(texto) {
    const c = state.classifications.get(texto);
    if (!c) {
        return `<span class="badge badge--pendente"><span class="spinner" aria-hidden="true"></span>Analisando sentimento…</span>`;
    }
    if (c === "erro") {
        return `<span class="badge badge--erro"><span aria-hidden="true">?</span>Sentimento não classificado</span>`;
    }
    const icon = c.sentimento === "positivo" ? "▲" : "▼";
    const label = c.sentimento === "positivo" ? "Positivo" : "Negativo";
    return `<span class="badge badge--${esc(c.sentimento)}" title="Classificado pelo modelo ${esc(c.versao_modelo)}">
        <span aria-hidden="true">${icon}</span>
        <span class="sr-only">Sentimento detectado: </span>${label}
        <span class="badge__conf"><span class="sr-only">, confiança de </span><span aria-hidden="true">· </span>${pct(c.confianca)}</span>
    </span>`;
}

function ratingHTML(media, total) {
    const arred = Math.round(media);
    const label = total
        ? `Nota média ${media.toFixed(1).replace(".", ",")} de 5, ${total} ${total === 1 ? "avaliação" : "avaliações"}`
        : "Sem avaliações";
    return `<span class="rating" role="img" aria-label="${label}">
        <span class="rating__stars" aria-hidden="true">${starsVisual(arred)}</span>
        <span aria-hidden="true">(${total})</span>
    </span>`;
}

function productCardHTML(p) {
    const s = sentimentStats(p);
    const meter = s.classified
        ? `${pct(s.pos / s.classified)} dos comentários são positivos`
        : s.total ? "Analisando comentários…" : "Ainda sem comentários";
    return `<li>
        <article class="product-card" aria-labelledby="card-${p.id}">
            <div class="product-media" style="--media-bg:${p.cor}" aria-hidden="true">${p.emoji}</div>
            <div class="product-card__body">
                <span class="review__meta">${CATEGORIAS[p.categoria]}</span>
                <h2 class="product-card__title" id="card-${p.id}"><a href="#/produto/${p.id}">${esc(p.nome)}</a></h2>
                ${ratingHTML(s.media, s.total)}
                <span class="sentiment-meter" data-meter="${p.id}">${meter}</span>
                <p class="product-card__price"><span class="sr-only">Preço: </span>${brl.format(p.preco)}</p>
            </div>
        </article>
    </li>`;
}

function reviewHTML(r, isNew = false) {
    const c = state.classifications.get(r.texto);
    const sent = c && c !== "erro" ? c.sentimento : "";
    return `<li class="review${isNew ? " review--new" : ""}" data-sentiment="${sent}" data-texto="${esc(r.texto)}">
        <article aria-label="Comentário de ${esc(r.autor)}">
            <div class="review__head">
                <div>
                    <h3 class="review__author">${esc(r.autor)}</h3>
                    <span class="review__meta">
                        <span class="rating__stars" role="img" aria-label="Nota ${r.nota} de 5">${starsVisual(r.nota)}</span>
                        · <time datetime="${r.data}">${fmtData(r.data)}</time>
                    </span>
                </div>
                <span class="review__badge">${badgeHTML(r.texto)}</span>
            </div>
            <p class="review__text">${esc(r.texto)}</p>
        </article>
    </li>`;
}

/* =========================================================
   Páginas
   ========================================================= */
function renderCatalog({ categoria = "", busca = "" } = {}) {
    let lista = PRODUTOS;
    if (categoria) lista = lista.filter((p) => p.categoria === categoria);
    if (busca) {
        const q = busca.toLocaleLowerCase("pt-BR");
        lista = lista.filter((p) => (p.nome + " " + p.descricao).toLocaleLowerCase("pt-BR").includes(q));
    }

    const titulo = busca ? `Resultados para “${busca}”` : categoria ? CATEGORIAS[categoria] : "Destaques da loja";
    document.title = `${busca ? "Busca" : titulo} — Loja Sentimento`;

    $("#view").innerHTML = `
        <h1 class="page-title" tabindex="-1">${esc(titulo)}</h1>
        <p class="page-subtitle">${lista.length} ${lista.length === 1 ? "produto encontrado" : "produtos encontrados"}. Os comentários de cada produto são analisados automaticamente por um modelo de sentimento.</p>
        ${lista.length
            ? `<ul class="product-grid">${lista.map(productCardHTML).join("")}</ul>`
            : `<div class="empty-state"><p>Nenhum produto encontrado.</p><a class="btn btn--outline" href="#/">Ver todos os produtos</a></div>`}
    `;

    classifyAll(lista).then(() => {
        for (const p of lista) {
            const card = $(`[data-meter="${p.id}"]`);
            if (!card) continue;
            const s = sentimentStats(p);
            card.textContent = s.classified
                ? `${pct(s.pos / s.classified)} dos comentários são positivos`
                : s.total ? "Sentimento indisponível" : "Ainda sem comentários";
        }
    });
    return lista.length;
}

function renderProduct(id) {
    const p = PRODUTOS.find((x) => x.id === id);
    if (!p) {
        document.title = "Produto não encontrado — Loja Sentimento";
        $("#view").innerHTML = `<div class="empty-state"><h1 tabindex="-1">Produto não encontrado</h1><a class="btn btn--outline" href="#/">Voltar à loja</a></div>`;
        return;
    }
    document.title = `${p.nome} — Loja Sentimento`;
    state.filter = "todos";
    const s = sentimentStats(p);

    $("#view").innerHTML = `
        <nav class="breadcrumb" aria-label="Você está em">
            <ol>
                <li><a href="#/">Início</a></li>
                <li><a href="#/categoria/${p.categoria}">${CATEGORIAS[p.categoria]}</a></li>
                <li><span aria-current="page">${esc(p.nome)}</span></li>
            </ol>
        </nav>

        <div class="product-detail">
            <div class="product-media product-media--lg" style="--media-bg:${p.cor}" role="img" aria-label="Ilustração do produto ${esc(p.nome)}">${p.emoji}</div>
            <div class="product-detail__info">
                <h1 class="page-title" tabindex="-1">${esc(p.nome)}</h1>
                <a href="#avaliacoes" class="js-to-reviews">${ratingHTML(s.media, s.total)} <span class="sr-only">— ir para os comentários</span></a>
                <p class="product-detail__price"><span class="sr-only">Preço: </span>${brl.format(p.preco)}</p>
                <p class="product-detail__installments">ou 10x de ${brl.format(p.preco / 10)} sem juros</p>
                <p>${esc(p.descricao)}</p>
                <div class="product-detail__actions">
                    <div class="qty">
                        <label for="qty">Quantidade</label>
                        <select id="qty">${[1, 2, 3, 4, 5].map((n) => `<option>${n}</option>`).join("")}</select>
                    </div>
                    <button type="button" class="btn btn--primary" id="add-to-cart">Adicionar ao carrinho</button>
                </div>
            </div>
        </div>

        <section class="reviews" id="avaliacoes" aria-labelledby="reviews-title" tabindex="-1">
            <h2 id="reviews-title">Comentários dos clientes</h2>
            <div class="reviews__layout">
                <div>
                    <div class="panel" id="summary" aria-live="polite"></div>
                    <form class="panel review-form" id="review-form" novalidate aria-labelledby="form-title">
                        <h3 id="form-title">Deixe seu comentário</h3>
                        <p class="field__hint">Campos marcados com <span class="req" aria-hidden="true">*</span><span class="sr-only">asterisco</span> são obrigatórios.</p>
                        <div class="field__error" id="form-errors" role="alert" hidden></div>

                        <div class="field">
                            <label for="f-nome">Nome <span class="req" aria-hidden="true">*</span></label>
                            <input id="f-nome" name="nome" autocomplete="name" required aria-required="true" maxlength="60" aria-describedby="f-nome-err">
                            <span class="field__error" id="f-nome-err" hidden></span>
                        </div>

                        <fieldset class="field star-input" aria-describedby="f-nota-err">
                            <legend>Nota <span class="req" aria-hidden="true">*</span></legend>
                            <div class="star-input__options">
                                ${[1, 2, 3, 4, 5].map((n) => `
                                    <input type="radio" name="nota" id="nota-${n}" value="${n}" required>
                                    <label for="nota-${n}"><span aria-hidden="true">★</span><span class="sr-only">${n} ${n === 1 ? "estrela" : "estrelas"}</span></label>
                                `).join("")}
                            </div>
                            <span class="field__error" id="f-nota-err" hidden></span>
                        </fieldset>

                        <div class="field">
                            <label for="f-texto">Comentário <span class="req" aria-hidden="true">*</span></label>
                            <textarea id="f-texto" name="texto" required aria-required="true" minlength="3" maxlength="1000"
                                aria-describedby="f-texto-hint f-texto-count f-texto-err"></textarea>
                            <span class="field__hint" id="f-texto-hint">Entre 3 e 1000 caracteres. O sentimento do seu comentário será identificado automaticamente.</span>
                            <span class="field__hint" id="f-texto-count">0 de 1000 caracteres</span>
                            <span class="field__error" id="f-texto-err" hidden></span>
                        </div>

                        <button type="submit" class="btn btn--primary">Publicar comentário</button>
                    </form>
                </div>

                <div>
                    <div class="reviews__toolbar">
                        <div class="filter-group" role="group" aria-label="Filtrar comentários por sentimento">
                            <button type="button" class="chip" data-filter="todos" aria-pressed="true">Todos</button>
                            <button type="button" class="chip" data-filter="positivo" aria-pressed="false">▲ Positivos</button>
                            <button type="button" class="chip" data-filter="negativo" aria-pressed="false">▼ Negativos</button>
                        </div>
                        <p class="review__meta" id="review-count" role="status"></p>
                    </div>
                    <ul class="review-list" id="review-list" aria-labelledby="reviews-title"></ul>
                </div>
            </div>
        </section>
    `;

    renderReviewList(p);
    renderSummary(p);
    bindProductPage(p);

    // classifica comentários ainda não analisados e atualiza cada item quando a resposta chega
    for (const r of getReviews(p)) {
        if (state.classifications.has(r.texto)) continue;
        classify(r.texto).then(() => updateReviewItem(p, r.texto));
    }
}

function renderReviewList(p, newTexto = null) {
    const list = $("#review-list");
    const reviews = getReviews(p).filter((r) => {
        if (state.filter === "todos") return true;
        const c = state.classifications.get(r.texto);
        return c && c !== "erro" && c.sentimento === state.filter;
    });
    list.innerHTML = reviews.length
        ? reviews.map((r) => reviewHTML(r, r.texto === newTexto)).join("")
        : `<li class="empty-state">${state.filter === "todos" ? "Seja o primeiro a comentar este produto." : "Nenhum comentário com esse sentimento."}</li>`;

    const nome = { todos: "", positivo: " positivos", negativo: " negativos" }[state.filter];
    $("#review-count").textContent = `Mostrando ${reviews.length} ${reviews.length === 1 ? "comentário" : "comentários"}${nome}`;
}

function updateReviewItem(p, texto) {
    const li = $$("#review-list .review").find((el) => el.dataset.texto === texto);
    if (li) {
        const c = state.classifications.get(texto);
        li.dataset.sentiment = c && c !== "erro" ? c.sentimento : "";
        $(".review__badge", li).innerHTML = badgeHTML(texto);
    }
    renderSummary(p);
}

function renderSummary(p) {
    const el = $("#summary");
    if (!el || !p) return;
    const s = sentimentStats(p);
    if (!s.total) {
        el.innerHTML = `<h3>Resumo de sentimento</h3><p>Este produto ainda não tem comentários.</p>`;
        return;
    }
    if (!s.classified) {
        el.innerHTML = `<h3>Resumo de sentimento</h3><p>${state.apiOnline === false
            ? "O modelo de sentimento está indisponível no momento."
            : "Analisando os comentários…"}</p>`;
        return;
    }
    const posPct = s.pos / s.classified;
    el.innerHTML = `
        <h3>Resumo de sentimento</h3>
        <p class="summary__big">${pct(posPct)}</p>
        <p class="review__meta">dos comentários analisados são positivos</p>
        <div class="summary__bar" role="img" aria-label="${s.pos} positivos e ${s.neg} negativos de ${s.classified} comentários analisados">
            <span class="pos" style="width:${posPct * 100}%"></span>
            <span class="neg" style="width:${(1 - posPct) * 100}%"></span>
        </div>
        <ul class="summary__legend" aria-hidden="true">
            <li><span style="color:var(--positive)">▲</span> ${s.pos} positivos</li>
            <li><span style="color:var(--negative)">▼</span> ${s.neg} negativos</li>
        </ul>
        <p class="review__meta" style="margin:.75em 0 0">Análise feita por um modelo de aprendizado de máquina; pode conter erros.</p>
    `;
}

function bindProductPage(p) {
    $("#add-to-cart").addEventListener("click", () => {
        const qtd = Number($("#qty").value);
        state.cart += qtd;
        saveJSON(STORAGE_CART, state.cart);
        updateCart();
        const msg = `${qtd} × ${p.nome} adicionado ao carrinho. Total: ${state.cart} ${state.cart === 1 ? "item" : "itens"}.`;
        announce(msg);
        toast(msg);
    });

    $(".js-to-reviews").addEventListener("click", (e) => {
        e.preventDefault();
        const sec = $("#avaliacoes");
        sec.scrollIntoView();
        sec.focus({ preventScroll: true });
    });

    $$(".chip").forEach((chip) => chip.addEventListener("click", () => {
        state.filter = chip.dataset.filter;
        $$(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        renderReviewList(p);
    }));

    // estrelas: destaca visualmente até a nota escolhida
    const starLabels = $$(".star-input label");
    $$(".star-input input").forEach((input) => input.addEventListener("change", () => {
        const n = Number(input.value);
        starLabels.forEach((lb, i) => { lb.style.color = i < n ? "var(--star)" : ""; });
        clearError("f-nota-err");
    }));

    const textarea = $("#f-texto");
    const count = $("#f-texto-count");
    textarea.addEventListener("input", () => {
        const n = textarea.value.length;
        count.textContent = `${n} de 1000 caracteres`;
        if (n === 950) announce("Restam 50 caracteres.");
        if (textarea.value.trim().length >= 3) clearError("f-texto-err", textarea);
    });
    $("#f-nome").addEventListener("input", (e) => { if (e.target.value.trim()) clearError("f-nome-err", e.target); });

    $("#review-form").addEventListener("submit", (e) => onSubmitReview(e, p));
}

function setError(id, msg, field) {
    const el = $("#" + id);
    el.textContent = msg;
    el.hidden = false;
    if (field) field.setAttribute("aria-invalid", "true");
}
function clearError(id, field) {
    const el = $("#" + id);
    el.textContent = "";
    el.hidden = true;
    if (field) field.removeAttribute("aria-invalid");
}

async function onSubmitReview(e, p) {
    e.preventDefault();
    const form = e.target;
    const nome = $("#f-nome");
    const texto = $("#f-texto");
    const nota = $('input[name="nota"]:checked', form);
    const erros = [];

    if (!nome.value.trim()) { setError("f-nome-err", "Informe seu nome.", nome); erros.push(nome); }
    else clearError("f-nome-err", nome);

    if (!nota) { setError("f-nota-err", "Escolha uma nota de 1 a 5 estrelas."); erros.push($("#nota-1")); }
    else clearError("f-nota-err");

    const t = texto.value.trim();
    if (t.length < 3) { setError("f-texto-err", "O comentário precisa ter pelo menos 3 caracteres.", texto); erros.push(texto); }
    else clearError("f-texto-err", texto);

    const resumo = $("#form-errors");
    if (erros.length) {
        resumo.hidden = false;
        resumo.textContent = `O formulário tem ${erros.length} ${erros.length === 1 ? "erro" : "erros"}. Corrija e envie novamente.`;
        erros[0].focus();
        return;
    }
    resumo.hidden = true;

    const review = {
        autor: nome.value.trim(),
        nota: Number(nota.value),
        texto: t,
        data: new Date().toISOString().slice(0, 10),
    };

    // evita duplicar exatamente o mesmo comentário no mesmo produto
    if (getReviews(p).some((r) => r.texto === t)) {
        setError("f-texto-err", "Este comentário já foi publicado.", texto);
        texto.focus();
        return;
    }

    (state.userReviews[p.id] ||= []).unshift(review);
    saveJSON(STORAGE_REVIEWS, state.userReviews);

    // volta para "Todos" para garantir que o novo comentário apareça
    state.filter = "todos";
    $$(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === "todos")));
    renderReviewList(p, t);
    renderSummary(p);

    form.reset();
    $$(".star-input label").forEach((lb) => { lb.style.color = ""; });
    $("#f-texto-count").textContent = "0 de 1000 caracteres";

    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    btn.textContent = "Analisando sentimento…";
    announce("Comentário publicado. Analisando sentimento.");

    const c = await classify(t);
    updateReviewItem(p, t);
    btn.disabled = false;
    btn.textContent = "Publicar comentário";

    announce(c === "erro"
        ? "Não foi possível analisar o sentimento do comentário, mas ele foi publicado."
        : `Seu comentário foi classificado como ${c.sentimento}, com ${pct(c.confianca)} de confiança.`);
}

/* =========================================================
   Carrinho
   ========================================================= */
function updateCart() {
    $("#cart-count").textContent = state.cart;
    $("#cart-btn").setAttribute("aria-label", `Carrinho: ${state.cart} ${state.cart === 1 ? "item" : "itens"}`);
}

/* =========================================================
   Roteamento por hash: #/, #/categoria/x, #/busca/termo, #/produto/id
   ========================================================= */
function router() {
    const hash = location.hash || "#/";
    if (!hash.startsWith("#/")) return; // âncoras internas não trocam de página

    const [, rota, param = ""] = hash.slice(1).split("/");
    const valor = decodeURIComponent(param);

    $$(".main-nav a").forEach((a) => a.removeAttribute("aria-current"));
    let anuncio;

    if (rota === "produto") {
        renderProduct(valor);
        anuncio = `Página do produto ${PRODUTOS.find((p) => p.id === valor)?.nome ?? "não encontrado"}`;
    } else if (rota === "busca") {
        $("#search-input").value = valor;
        const n = renderCatalog({ busca: valor });
        anuncio = `${n} ${n === 1 ? "produto encontrado" : "produtos encontrados"} para ${valor}`;
    } else {
        const categoria = rota === "categoria" && CATEGORIAS[valor] ? valor : "";
        $(`.main-nav a[data-category="${categoria}"]`)?.setAttribute("aria-current", "page");
        renderCatalog({ categoria });
        anuncio = categoria ? `Categoria ${CATEGORIAS[categoria]}` : "Página inicial";
    }

    window.scrollTo(0, 0);
    // move o foco para o título da nova página (essencial em SPAs para leitores de tela)
    $("#view h1")?.focus({ preventScroll: true });
    announce(anuncio);
}

/* =========================================================
   Acessibilidade: preferências, atalhos e saltos
   ========================================================= */
const A11Y_DEFAULT = { font: 100, contrast: false, readable: false, links: false, motion: false, spacing: false };
let a11y = { ...A11Y_DEFAULT, ...loadJSON(STORAGE_A11Y, {}) };

function applyA11y() {
    const root = document.documentElement;
    root.style.setProperty("--font-size-base", a11y.font + "%");
    root.toggleAttribute("data-contrast", a11y.contrast);
    if (a11y.contrast) root.dataset.contrast = "high";
    root.dataset.readable = a11y.readable;
    root.dataset.links = a11y.links;
    root.dataset.spacing = a11y.spacing;
    root.dataset.motion = a11y.motion ? "reduced" : "";

    for (const key of ["contrast", "readable", "links", "motion", "spacing"]) {
        $(`[data-a11y="${key}"]`).setAttribute("aria-pressed", String(a11y[key]));
    }
    saveJSON(STORAGE_A11Y, a11y);
}

const A11Y_NOMES = {
    contrast: "Alto contraste", readable: "Fonte legível", links: "Destaque de links",
    motion: "Redução de animações", spacing: "Espaçamento ampliado",
};

$(".a11y-bar").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-a11y]");
    if (!btn) return;
    const acao = btn.dataset.a11y;

    if (acao === "font-inc") a11y.font = Math.min(160, a11y.font + 10);
    else if (acao === "font-dec") a11y.font = Math.max(80, a11y.font - 10);
    else if (acao === "font-reset") a11y.font = 100;
    else if (acao === "reset") a11y = { ...A11Y_DEFAULT };
    else a11y[acao] = !a11y[acao];

    applyA11y();

    if (acao.startsWith("font")) announce(`Tamanho da fonte: ${a11y.font}%`);
    else if (acao === "reset") announce("Preferências de acessibilidade redefinidas");
    else announce(`${A11Y_NOMES[acao]} ${a11y[acao] ? "ativado" : "desativado"}`);
});

function jumpTo(id) {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    const foco = id === "busca" ? $("#search-input") : alvo;
    alvo.scrollIntoView();
    foco.focus({ preventScroll: true });
}

// links de salto não alteram o hash (que é usado pelas rotas)
$$(".skip-links a").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    jumpTo(a.getAttribute("href").slice(1));
}));

// atalhos Alt+1..4 (padrão e-MAG do governo brasileiro)
document.addEventListener("keydown", (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const mapa = { "1": "conteudo", "2": "menu", "3": "busca", "4": "rodape" };
    const id = mapa[e.key];
    if (id) { e.preventDefault(); jumpTo(id); }
});

/* =========================================================
   Inicialização
   ========================================================= */
$("#busca").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#search-input").value.trim();
    location.hash = q ? `#/busca/${encodeURIComponent(q)}` : "#/";
});

$("#cart-btn").addEventListener("click", () => {
    const msg = state.cart
        ? `Você tem ${state.cart} ${state.cart === 1 ? "item" : "itens"} no carrinho.`
        : "Seu carrinho está vazio.";
    announce(msg);
    toast(msg);
});

applyA11y();
updateCart();
window.addEventListener("hashchange", router);
checkHealth().then(() => { if (location.hash.startsWith("#/produto/")) renderSummary(PRODUTOS.find((p) => location.hash.endsWith(p.id))); });
router();
