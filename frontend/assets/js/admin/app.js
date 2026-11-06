/* Painel — roteador por hash e moldura. */
import { $, $$, api, esc, logout, toast } from "./core.js";
import { dashboard } from "./dashboard.js";
import { enrollments } from "./enrollments.js";
import { classes } from "./classes.js";
import { courses } from "./courses.js";
import { students } from "./students.js";
import { mentoring, leads } from "./mentoring.js";
import { finance } from "./finance.js";
import { posts, reviews, messages } from "./content.js";
import { settingsView } from "./settings.js";

const ROUTES = {
  "": [dashboard, "Visão geral"], inscricoes: [enrollments, "Inscrições"], mentorias: [mentoring, "Mentorias"],
  interessados: [leads, "Interessados"], mensagens: [messages, "Mensagens"], turmas: [classes, "Turmas"],
  cursos: [courses, "Cursos"], alunos: [students, "Alunos"], financeiro: [finance, "Financeiro e MEI"],
  dicas: [posts, "Dicas"], depoimentos: [reviews, "Depoimentos"], configuracoes: [settingsView, "Configurações"],
};
const view = $("#view");

export async function refreshBadges() {
  try {
    const d = await api("/api/admin/dashboard");
    const set = (k, n) => { const b = $(`[data-badge="${k}"]`); b.textContent = n; b.hidden = !n; };
    set("enroll", d.pending_count);
    set("mentoring", d.new_mentoring);
    set("leads", d.new_leads);
    set("messages", d.unread_messages);
    set("reviews", d.pending_testimonials);
  } catch { /* silencioso */ }
}

async function route() {
  const [name, ...params] = location.hash.replace(/^#\/?/, "").split("/");
  const [render, title] = ROUTES[name] || ROUTES[""];
  $$(".side nav a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#/${name}`));
  $("#side").classList.remove("open");
  $$("dialog").forEach((d) => { if (d.open) d.close(); d.remove(); });
  document.title = `${title} · Painel Naty`;
  view.innerHTML = `<p class="muted">Carregando…</p>`;
  try {
    await render(view, params);
  } catch (e) {
    view.innerHTML = `<div class="panel"><h2>Não foi possível carregar esta tela</h2><p>${esc(e.message)}</p>
      <button class="btn" onclick="location.reload()">Tentar de novo</button></div>`;
  }
  view.focus({ preventScroll: true });
}

window.addEventListener("hashchange", route);
window.addEventListener("nt:changed", refreshBadges);
$("[data-logout]").addEventListener("click", logout);
$("[data-menu]").addEventListener("click", () => $("#side").classList.toggle("open"));
try { $("[data-user]").innerHTML = `<strong>${esc(JSON.parse(localStorage.getItem("nt_user") || "{}").name || "")}</strong>`; } catch { /* */ }
api("/api/auth/me").then(() => { route(); refreshBadges(); }).catch((e) => toast(e.message, "err"));
