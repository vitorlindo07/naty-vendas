/* Site público — moldura compartilhada, formulários e lógica de cada página. */
import { ATRIBUTOS_VALOR, CHECKLIST, DICAS, doDia, PALAVRAS, TRANSICOES } from "./conteudo.js";

const API = "/api/public";

const ICONS = {
  seed: '<path d="M12 21v-8"/><path d="M12 13C12 8 8 5 3 5c0 5 4 8 9 8z"/><path d="M12 13c0-4 3-7 8-7 0 4-3 7-8 7z"/>',
  store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M10 20v-5h4v5"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 6h4M11 18h2"/>',
  whats: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8z"/><path d="M9 9.5c.3 2 1.8 3.8 4 4.5l1.2-1.2 2 1-.5 1.5c-3.3.3-7.2-3.2-7.2-6.8L10 8l1 2z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function api(path, options = {}) {
  const res = await fetch(API + path, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data.detail;
    throw new Error(Array.isArray(d) ? d.map((x) => x.msg.replace(/^Value error, /, "")).join(" ") : d || "Não foi possível enviar. Verifique sua conexão e tente de novo.");
  }
  return data;
}

const money = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateLong = (iso) => iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" }) : "";
const dateFull = (iso) => iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "";
const FORMATS = { online_ao_vivo: "Online ao vivo", presencial: "Presencial", gravado: "Aulas gravadas", hibrido: "Online + presencial" };
const lines = (t) => String(t || "").split("\n").map((l) => l.trim()).filter(Boolean);
let SITE = {};
const whatsLink = (text = "Oi, Naty! Vim pelo site e quero saber mais sobre os cursos.") =>
  `https://wa.me/55${String(SITE.whatsapp || "").replace(/\D/g, "").replace(/^55/, "")}?text=${encodeURIComponent(text)}`;

/* texto simples → HTML seguro (## título, - lista, parágrafos) */
function richText(text) {
  return String(text || "").split(/\n{2,}/).map((block) => {
    const ls = block.split("\n");
    if (ls.every((l) => l.trim().startsWith("- "))) return `<ul>${ls.map((l) => `<li>${esc(l.trim().slice(2))}</li>`).join("")}</ul>`;
    if (block.startsWith("## ")) {
      const [h, ...rest] = ls;
      const tail = rest.length ? richText(rest.join("\n")) : "";
      return `<h2>${esc(h.slice(3))}</h2>${tail}`;
    }
    return `<p>${esc(block).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

/* ---------------------------------------------------------------- moldura */
const NAV = [["/", "Início"], ["/cursos", "Cursos"], ["/mentoria", "Mentoria"], ["/treino", "Treino"], ["/dicas", "Dicas"], ["/sobre", "Sobre"], ["/contato", "Contato"]];

function renderFrame() {
  const header = document.querySelector("[data-header]");
  const path = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/") || "/";
  const active = path.startsWith("/curso") ? "/cursos" : path.startsWith("/dica") ? "/dicas" : path;
  header.className = "site-header";
  header.innerHTML = `<div class="wrap">
      <a class="brand" href="/" aria-label="${esc(SITE.business_name)}, página inicial">
        <span class="brand-mark" aria-hidden="true">${esc((SITE.business_name || "N")[0])}</span>
        <span class="brand-name"><strong>${esc(SITE.business_name)}</strong><span>${esc(SITE.business_subtitle)}</span></span></a>
      <button class="menu-toggle" aria-expanded="false" aria-controls="nav" aria-label="Abrir menu">${icon("menu")}</button>
      <nav class="nav" id="nav" aria-label="Principal">
        ${NAV.map(([h, l]) => `<a href="${h}" ${active === h ? 'aria-current="page"' : ""}>${l}</a>`).join("")}
        <a class="btn btn-hot" href="/cursos">Quero me inscrever</a></nav></div>`;
  const toggle = header.querySelector(".menu-toggle");
  const nav = header.querySelector(".nav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
    toggle.innerHTML = icon(open ? "close" : "menu");
  });

  const footer = document.querySelector("[data-footer]");
  footer.className = "site-footer";
  const insta = (SITE.instagram || "").replace("@", "");
  footer.innerHTML = `<div class="wrap"><div class="footer-grid">
      <div><h2>${esc(SITE.business_name)} · ${esc(SITE.business_subtitle)}</h2>
        <p>Cursos e mentoria de vendas. Atendimento em ${esc(SITE.region)}.</p></div>
      <div><h2>Fale comigo</h2><ul>
        ${SITE.whatsapp ? `<li>WhatsApp: <a href="${whatsLink()}" target="_blank" rel="noopener">${esc(SITE.whatsapp)}</a></li>` : ""}
        ${insta ? `<li>Instagram: <a href="https://instagram.com/${esc(insta)}" target="_blank" rel="noopener">@${esc(insta)}</a></li>` : ""}
        ${SITE.email ? `<li>E-mail: <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></li>` : ""}
        <li><a href="/contato">Formulário de contato</a></li></ul></div>
      <div><h2>Navegação</h2><ul>
        <li><a href="/cursos">Cursos e turmas</a></li><li><a href="/mentoria">Mentoria</a></li><li><a href="/treino">Treino de vendas</a></li><li><a href="/dicas">Dicas de vendas</a></li>
        <li><a href="/depoimento">Deixar depoimento</a></li><li><a href="/certificado">Validar certificado</a></li><li><a href="/privacidade">Privacidade</a></li></ul></div>
    </div><div class="footer-legal"><span>${esc(SITE.legal_name)} · CNPJ ${esc(SITE.cnpj)}</span>
      <span>© ${new Date().getFullYear()} · <a href="/admin">Área restrita</a></span></div></div>`;
  if (SITE.whatsapp) {
    document.body.insertAdjacentHTML("beforeend",
      `<a class="whats-float" href="${whatsLink()}" target="_blank" rel="noopener" aria-label="Conversar no WhatsApp">${icon("whats")}</a>`);
  }
}

/* ---------------------------------------------------------------- formulários */
function formData(form) {
  const d = {};
  for (const [k, v] of new FormData(form)) d[k] = v;
  form.querySelectorAll('input[type="checkbox"]').forEach((c) => { d[c.name] = c.checked; });
  return d;
}

function notice(box, kind, text) {
  box.hidden = false;
  box.className = `notice ${kind}`;
  box.textContent = text;
  box.tabIndex = -1;
  box.focus();
}

function validate(root) {
  let first = null;
  root.querySelectorAll(".error").forEach((e) => e.remove());
  root.querySelectorAll(".invalid").forEach((e) => e.classList.remove("invalid"));
  root.querySelectorAll("[required]").forEach((input) => {
    if (input.closest("[hidden]")) return;
    const ok = input.type === "checkbox" ? input.checked
      : input.type === "radio" ? !!root.querySelector(`[name="${input.name}"]:checked`)
      : input.checkValidity() && input.value.trim();
    if (!ok) {
      const field = input.closest(".field") || input.closest(".check");
      if (!field?.querySelector(".error")) {
        field?.classList.add("invalid");
        field?.insertAdjacentHTML("beforeend", `<span class="error">${esc(input.dataset.msg || "Preencha este campo.")}</span>`);
      }
      first ||= input;
    }
  });
  first?.focus();
  return !first;
}

function maskPhone(input) {
  input?.addEventListener("input", () => {
    const d = input.value.replace(/\D/g, "").slice(0, 11);
    input.value = d.length <= 2 ? d : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}`
      : d.length <= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  });
}

function wireForm(form, endpoint, { transform = (d) => d, onDone } = {}) {
  const box = form.querySelector(".notice");
  form.querySelectorAll('input[type="tel"]').forEach(maskPhone);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate(form)) return;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      const res = await api(endpoint, { method: "POST", body: JSON.stringify(transform(formData(form))) });
      if (onDone) onDone(res);
      else { form.reset(); notice(box, "ok", res.message); }
    } catch (err) {
      notice(box, "err", err.message);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------------------------------------------------------------- componentes */
function priceText(course, klass) {
  const v = klass?.price ?? course.price;
  return v == null ? "Valor sob consulta" : v === 0 ? "Gratuito" : money(v);
}

/* Capa do curso: a foto enviada no painel ou, se não houver, a ilustração padrão do curso. */
const COVERS = ["vendas-do-zero", "vendas-pelo-whatsapp-e-instagram", "atendimento-que-vende", "fechamento-e-objecoes"];
export const coverFor = (c) => c.cover_path || `/assets/img/cursos/${COVERS.includes(c.slug) ? c.slug : "padrao"}.svg`;

function courseRow(c) {
  const next = c.classes[0];
  return `<li class="course-row">
    <a class="course-cover" href="/curso?c=${esc(c.slug)}" tabindex="-1" aria-hidden="true"><img src="${esc(coverFor(c))}" alt="" loading="lazy"></a>
    <div>
      <div class="course-meta"><span class="tag">${FORMATS[c.format]}</span><span class="tag">${c.workload_hours} h</span>
        ${next && next.seats_left <= 5 && next.seats_left > 0 ? `<span class="tag hot">Últimas ${next.seats_left} vagas</span>` : ""}</div>
      <h3><a href="/curso?c=${esc(c.slug)}">${esc(c.title)}</a></h3><p>${esc(c.tagline)}</p>
    </div>
    <div class="course-next">${next ? `<strong>Próxima turma: ${dateLong(next.start_date)}</strong><span class="muted">${esc(next.schedule)}</span>`
      : c.format === "gravado" ? "<strong>Comece quando quiser</strong>" : `<strong>Nova turma em breve</strong><span class="muted">Deixe seu contato para receber o aviso</span>`}</div>
    <div class="course-price"><span class="val">${priceText(c, next)}</span><span class="note">${esc(c.price_note) || "&nbsp;"}</span>
      <a class="btn" href="/curso?c=${esc(c.slug)}">Ver o curso</a></div>
  </li>`;
}

function reviewHtml(t) {
  return `<figure class="review"><blockquote>${esc(t.text)}</blockquote>
    <figcaption>${esc(t.author)}${t.role ? `<span>${esc(t.role)}</span>` : ""}</figcaption></figure>`;
}

function postItem(p) {
  return `<li class="post-item"><time datetime="${p.published_on}">${dateFull(p.published_on)}</time>
    <div><h3><a href="/dica?p=${esc(p.slug)}">${esc(p.title)}</a></h3><p>${esc(p.excerpt)}</p></div></li>`;
}

/* ---------------------------------------------------------------- palavra e dica do dia */
function wordCard(p, titulo = "Palavra do dia") {
  return `<p class="kicker">${esc(titulo)}</p>
    <p class="word">${esc(p.palavra)}</p>
    <div class="challenge"><strong>Desafio</strong><p>${esc(p.desafio)}</p></div>
    <div class="say"><strong>Use na conversa</strong><q>${esc(p.frase)}</q></div>`;
}

function renderDaily(box, { link = true } = {}) {
  if (!box) return;
  box.innerHTML = `
    <article class="word-card" aria-live="polite">${wordCard(doDia(PALAVRAS))}</article>
    <aside class="tip-card"><div><p class="kicker">Dica do dia</p><blockquote>${esc(doDia(DICAS))}</blockquote></div>
      ${link ? `<a class="btn btn-light" href="/treino">Treinar meu atendimento</a>` : ""}</aside>`;
}

/* ---------------------------------------------------------------- páginas */
const pages = {
  async home() {
    renderDaily(document.querySelector("[data-daily]"));
    document.querySelector("[data-headline]").textContent = SITE.headline;
    document.querySelector("[data-intro]").textContent = SITE.intro;
    if (SITE.whatsapp) { const w = document.querySelector("[data-whats]"); w.href = whatsLink(); w.hidden = false; }
    if (SITE.students_count >= 10) {
      document.querySelector("[data-proof]").innerHTML = `<span><strong>${SITE.students_count}</strong> alunos já passaram pelos cursos</span>`;
    }
    const [courses, posts, reviews] = await Promise.all([api("/courses"), api("/posts?limit=3"), api("/testimonials")]);
    const featured = courses.filter((c) => c.featured);
    document.querySelector("[data-courses]").innerHTML = (featured.length ? featured : courses).slice(0, 4).map(courseRow).join("");
    if (posts.length) { document.querySelector("[data-posts]").innerHTML = posts.map(postItem).join(""); document.querySelector("#dicas").hidden = false; }
    if (reviews.length) { document.querySelector("[data-reviews]").innerHTML = reviews.slice(0, 3).map(reviewHtml).join(""); document.querySelector("#depoimentos").hidden = false; }
    document.querySelector("[data-mentoring]").textContent = SITE.mentoring_text;
    const interest = document.querySelector("#lead-form [name=interest]");
    interest.innerHTML = `<option value="">Tenho interesse em…</option>${courses.map((c) => `<option>${esc(c.title)}</option>`).join("")}<option>Mentoria</option>`;
    wireForm(document.querySelector("#lead-form"), "/leads");
  },

  async cursos() {
    const courses = await api("/courses");
    document.querySelector("[data-courses]").innerHTML = courses.length ? courses.map(courseRow).join("")
      : `<p class="empty">Novos cursos em breve. <a href="/contato">Fale comigo</a> para saber das próximas turmas.</p>`;
  },

  async curso() {
    const slug = new URLSearchParams(location.search).get("c");
    let c;
    try { c = await api(`/courses/${encodeURIComponent(slug || "")}`); }
    catch { document.querySelector("main").innerHTML = `<section class="section"><div class="wrap"><h1>Curso não encontrado</h1><p><a class="btn" href="/cursos">Ver todos os cursos</a></p></div></section>`; return; }
    document.title = `${c.title} · ${SITE.business_name}`;
    document.querySelector('meta[name="description"]').content = c.tagline;
    document.querySelector("[data-title]").textContent = c.title;
    document.querySelector("[data-tagline]").textContent = c.tagline;
    const cover = document.querySelector("[data-cover]");
    cover.src = coverFor(c);
    cover.alt = `Capa do curso ${c.title}`;
    cover.hidden = false;
    const syllabus = lines(c.syllabus).map((l) => { const [h, ...rest] = l.split(":"); return rest.length ? [h, rest.join(":").trim()] : [l, ""]; });
    document.querySelector("[data-body]").innerHTML = `
      <h2>Sobre o curso</h2>${richText(c.description)}
      ${c.audience ? `<h2>Para quem é</h2><ul class="checklist">${lines(c.audience).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
      ${c.outcomes ? `<h2>O que você vai aprender</h2><ul class="checklist">${lines(c.outcomes).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
      ${syllabus.length ? `<h2>Conteúdo</h2><ol class="syllabus">${syllabus.map(([h, d]) => `<li><span><strong>${esc(h)}</strong>${d ? `<span class="muted">${esc(d[0].toUpperCase() + d.slice(1))}</span>` : ""}</span></li>`).join("")}</ol>` : ""}
      <h2>Dúvidas</h2><p>Chame no <a href="${whatsLink(`Oi, Naty! Tenho uma dúvida sobre o curso ${c.title}.`)}" target="_blank" rel="noopener">WhatsApp</a> antes de se inscrever, se precisar.</p>`;

    const card = document.querySelector("[data-enroll]");
    const classes = c.classes;
    const canEnroll = classes.length || c.format === "gravado";
    const firstOpen = classes.find((k) => k.seats_left > 0);
    card.innerHTML = `
      <div class="facts-inline"><span class="tag">${FORMATS[c.format]}</span><span class="tag">${c.workload_hours} horas</span><span class="tag">Certificado</span></div>
      <div class="price" data-price>${priceText(c, firstOpen)}</div><div class="price-note">${esc(c.price_note) || "Pagamento por Pix após a inscrição."}</div>
      ${canEnroll ? `<form class="form" id="enroll-form" novalidate>
        <div class="notice" hidden></div>
        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        ${classes.length ? `<fieldset class="field" style="border:0;padding:0;margin:0"><legend>Escolha a turma</legend>
          ${classes.map((k) => `<div class="class-option"><input type="radio" name="class_id" id="k${k.id}" value="${k.id}" ${k === firstOpen ? "checked" : ""} ${k.seats_left ? "" : "disabled"} required data-msg="Escolha uma turma.">
            <label for="k${k.id}"><strong>${esc(k.name)} · começa ${dateLong(k.start_date)}</strong><small>${esc(k.schedule)}</small><small>${esc(k.location)}</small>
              <small class="seats">${k.seats_left ? `${k.seats_left} vaga(s)` : "Esgotada"}</small></label></div>`).join("")}</fieldset>` : ""}
        <div class="field"><label for="e-name">Nome completo</label><input class="input" id="e-name" name="name" required autocomplete="name" data-msg="Informe seu nome."></div>
        <div class="field"><label for="e-email">E-mail</label><input class="input" type="email" id="e-email" name="email" required autocomplete="email" data-msg="Informe um e-mail válido."></div>
        <div class="field"><label for="e-phone">WhatsApp</label><input class="input" type="tel" id="e-phone" name="phone" required pattern=".{14,15}" autocomplete="tel" placeholder="(19) 90000-0000" data-msg="Informe o WhatsApp com DDD."></div>
        <div class="field"><label for="e-city">Cidade</label><input class="input" id="e-city" name="city" autocomplete="address-level2"></div>
        <label class="check"><input type="checkbox" name="consent" required data-msg="Marque para concluir a inscrição."><span>Li e aceito a <a href="/privacidade">política de privacidade</a>.</span></label>
        <button class="btn btn-hot" type="submit">Garantir minha vaga</button>
      </form>` : `<p>As inscrições para a próxima turma ainda não abriram.</p>
        <a class="btn btn-hot" href="${whatsLink(`Oi, Naty! Quero receber o aviso da próxima turma do curso ${c.title}.`)}" target="_blank" rel="noopener">Quero receber o aviso</a>`}`;
    const form = card.querySelector("#enroll-form");
    if (!form) return;
    form.addEventListener("change", (e) => {
      if (e.target.name === "class_id") card.querySelector("[data-price]").textContent = priceText(c, classes.find((k) => k.id == e.target.value));
    });
    wireForm(form, "/enroll", {
      transform: (d) => ({ ...d, course_id: c.id, class_id: d.class_id ? Number(d.class_id) : null }),
      onDone: (res) => {
        const msg = `Oi, Naty! Fiz minha inscrição nº ${res.id} no curso ${res.course}${res.class ? ` (${res.class})` : ""}. Segue o comprovante do Pix.`;
        card.innerHTML = `<h2 tabindex="-1" style="font-size:1.7rem">Inscrição recebida!</h2><p>${esc(res.message)}</p>
          ${res.amount > 0 ? `<div class="pix-box"><p style="margin:0 0 .4rem"><strong>Valor: ${money(res.amount)}</strong></p>
            ${res.pix_key ? `<p style="margin:0">Chave Pix:<br><code>${esc(res.pix_key)}</code><br><span class="muted">${esc(res.pix_name)}</span></p>`
              : `<p style="margin:0">Vou mandar os dados de pagamento pelo WhatsApp.</p>`}</div>` : ""}
          <a class="btn btn-whats" href="${whatsLink(msg)}" target="_blank" rel="noopener">${icon("whats")} Enviar comprovante no WhatsApp</a>
          <p class="muted" style="margin-top:1rem;font-size:.92rem">Número da inscrição: ${res.id}</p>`;
        card.querySelector("h2").focus();
      },
    });
  },

  async mentoria() {
    document.querySelector("[data-mentoring]").textContent = SITE.mentoring_text;
    const form = document.querySelector("#mentoring-form");
    const team = form.querySelector("[data-team]");
    form.addEventListener("change", () => { team.hidden = form.kind.value !== "equipe"; });
    wireForm(form, "/mentoring", { transform: (d) => ({ ...d, team_size: d.kind === "equipe" && d.team_size ? Number(d.team_size) : null }) });
  },

  async dicas() {
    const posts = await api("/posts");
    document.querySelector("[data-posts]").innerHTML = posts.length ? posts.map(postItem).join("")
      : `<p class="empty">As primeiras dicas chegam em breve. Enquanto isso, siga no Instagram ${esc(SITE.instagram)}.</p>`;
  },

  async dica() {
    const slug = new URLSearchParams(location.search).get("p");
    const box = document.querySelector("[data-article]");
    try {
      const p = await api(`/posts/${encodeURIComponent(slug || "")}`);
      document.title = `${p.title} · ${SITE.business_name}`;
      document.querySelector('meta[name="description"]').content = p.excerpt;
      box.innerHTML = `<p class="crumbs"><a href="/dicas">Dicas</a> · ${dateFull(p.published_on)}</p><h1 style="font-size:clamp(2.2rem,4.6vw,3.4rem)">${esc(p.title)}</h1>
        <p class="lead">${esc(p.excerpt)}</p>${p.cover_path ? `<img class="cover" src="${esc(p.cover_path)}" alt="">` : ""}${richText(p.body)}
        <hr style="border:0;border-top:1px solid var(--line);margin:2.5rem 0"><p><strong>Quer praticar isso com acompanhamento?</strong></p>
        <p><a class="btn btn-hot" href="/cursos">Ver cursos</a> <a class="btn btn-ghost" href="/mentoria">Conhecer a mentoria</a></p>`;
    } catch {
      box.innerHTML = `<h1>Dica não encontrada</h1><p><a class="btn" href="/dicas">Ver todas as dicas</a></p>`;
    }
  },

  async sobre() {
    document.querySelector("[data-about]").innerHTML = richText(SITE.about);
    document.querySelector("[data-facts]").innerHTML = `
      <div><dt>Nome</dt><dd>Natalice Alves da Silva</dd></div>
      <div><dt>Instagram</dt><dd><a href="https://instagram.com/${esc((SITE.instagram || "").replace("@", ""))}" target="_blank" rel="noopener">${esc(SITE.instagram)}</a></dd></div>
      <div><dt>WhatsApp</dt><dd><a href="${whatsLink()}" target="_blank" rel="noopener">${esc(SITE.whatsapp)}</a></dd></div>
      <div><dt>Atendimento</dt><dd>${esc(SITE.region)}</dd></div>
      <div><dt>CNPJ</dt><dd>${esc(SITE.cnpj)}</dd></div>`;
    const reviews = await api("/testimonials");
    if (reviews.length) { document.querySelector("[data-reviews]").innerHTML = reviews.map(reviewHtml).join(""); document.querySelector("#depoimentos").hidden = false; }
  },

  async contato() {
    document.querySelector("[data-channels]").innerHTML = [
      SITE.whatsapp && `<div><dt>WhatsApp</dt><dd><a href="${whatsLink()}" target="_blank" rel="noopener">${esc(SITE.whatsapp)}</a></dd></div>`,
      SITE.instagram && `<div><dt>Instagram</dt><dd><a href="https://instagram.com/${esc(SITE.instagram.replace("@", ""))}" target="_blank" rel="noopener">${esc(SITE.instagram)}</a></dd></div>`,
      SITE.email && `<div><dt>E-mail</dt><dd><a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></dd></div>`,
      `<div><dt>Atendimento</dt><dd>${esc(SITE.region)}</dd></div>`].filter(Boolean).join("");
    wireForm(document.querySelector("#contact-form"), "/contact");
  },

  async depoimento() {
    wireForm(document.querySelector("#review-form"), "/testimonials", { transform: (d) => ({ ...d, rating: Number(d.rating || 5) }) });
  },

  async treino() {
    renderDaily(document.querySelector("[data-daily]"), { link: false });
    const hoje = doDia(PALAVRAS);

    // 40 palavras: clique para ver o desafio de cada uma
    const grid = document.querySelector("[data-words]");
    const card = document.querySelector("[data-word-detail]");
    grid.innerHTML = PALAVRAS.map((p, i) => `<button type="button" data-i="${i}" aria-pressed="false"
      class="${p === hoje ? "today" : ""}" ${p === hoje ? 'title="Palavra de hoje"' : ""}>${esc(p.palavra)}</button>`).join("");
    grid.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      grid.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      card.innerHTML = wordCard(PALAVRAS[b.dataset.i], "Palavra escolhida");
      card.hidden = false;
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    // checklist interativo
    const form = document.querySelector("[data-checklist]");
    let n = 0;
    form.innerHTML = CHECKLIST.map((etapa, e) => `<fieldset class="cl-stage" style="border:0;padding:0;margin:0 0 1.6rem">
        <legend><h3><span>${e + 1}</span>${esc(etapa.etapa)}</h3></legend>
        ${etapa.itens.map((item) => `<label class="cl-item"><input type="checkbox" name="i${n++}"><span>${esc(item)}</span></label>`).join("")}
      </fieldset>`).join("");
    const total = n;
    const out = document.querySelector("[data-score]");
    const update = () => {
      const feitos = form.querySelectorAll("input:checked").length;
      const pct = Math.round((feitos / total) * 100);
      const [titulo, texto] = pct >= 85
        ? ["Atendimento de excelência", "Você já faz quase tudo. Agora é manter a consistência e treinar os detalhes que faltaram."]
        : pct >= 55
          ? ["Bom caminho", "A base está lá. Os pontos que ficaram sem marcar são exatamente onde estão as vendas que escapam."]
          : ["Hora de treinar", "Cada item desmarcado é uma oportunidade de vender mais. Dá para melhorar rápido com método e prática."];
      out.innerHTML = `<p class="kicker" style="font-weight:700;color:var(--hot-deep);margin:0">Sua nota</p>
        <div class="big">${feitos}<span style="font-size:1.4rem;color:var(--ink-soft)">/${total}</span></div>
        <div class="cl-bar"><span style="width:${pct}%"></span></div>
        <h3 style="margin-bottom:.3rem">${titulo}</h3><p style="margin:0;color:var(--ink-soft)">${texto}</p>
        <div class="actions no-print"><a class="btn btn-hot" href="/cursos">Ver cursos</a><a class="btn btn-ghost" href="/mentoria">Mentoria</a>
          <button class="btn btn-ghost" type="button" data-print>Imprimir</button></div>`;
      out.querySelector("[data-print]").onclick = () => window.print();
    };
    form.addEventListener("change", update);
    update();

    // da resposta à oportunidade
    document.querySelector("[data-says]").innerHTML = TRANSICOES.map((t) =>
      `<li><q>${esc(t.diz)}</q><span class="arrow" aria-hidden="true">→</span><span>${esc(t.oferta)}</span></li>`).join("");
    document.querySelector("[data-values]").innerHTML = ATRIBUTOS_VALOR.map((a) => `<li>${esc(a)}</li>`).join("");
  },

  async certificado() {
    const form = document.querySelector("#cert-form");
    const out = document.querySelector("[data-result]");
    const check = async (code) => {
      out.innerHTML = "";
      try {
        const c = await api(`/certificates/${encodeURIComponent(code.trim())}`);
        out.innerHTML = `<div class="cert-ok" tabindex="-1"><h2 style="font-size:1.6rem">Certificado válido</h2>
          <p style="margin:0"><strong>${esc(c.student)}</strong> concluiu o curso <strong>${esc(c.course)}</strong>${c.class ? ` (${esc(c.class)})` : ""},
          com carga horária de ${c.hours} horas, em ${dateFull(c.completed_on)}.</p></div>`;
      } catch (e) {
        out.innerHTML = `<div class="notice err" tabindex="-1">${esc(e.message)}</div>`;
      }
      out.firstElementChild.focus();
    };
    form.addEventListener("submit", (e) => { e.preventDefault(); if (form.code.value.trim()) check(form.code.value); });
    const preset = new URLSearchParams(location.search).get("c");
    if (preset) { form.code.value = preset; check(preset); }
  },
};

(async function init() {
  try { SITE = await api("/site"); } catch { SITE = { business_name: "Naty Alves", business_subtitle: "Mentora de vendas" }; }
  renderFrame();
  try { await pages[document.body.dataset.page]?.(); } catch (err) { console.error(err); }
})();
