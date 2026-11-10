import { api, emptyState, esc, formDialog, FORMATS, invalidate, money, pickImage, toast } from "./core.js";

const FIELDS = [
  { name: "title", label: "Nome do curso", required: true },
  { name: "format", label: "Formato", type: "select", options: Object.entries(FORMATS) },
  { name: "tagline", label: "Frase de chamada (uma linha)", required: true, full: true },
  { name: "description", label: "Descrição", type: "textarea", rows: 4 },
  { name: "audience", label: "Para quem é (um item por linha)", type: "textarea", rows: 3 },
  { name: "outcomes", label: "O que vai aprender (um item por linha)", type: "textarea", rows: 4 },
  { name: "syllabus", label: "Conteúdo (um módulo por linha, no formato “Módulo 1: tema”)", type: "textarea", rows: 4 },
  { name: "workload_hours", label: "Carga horária (horas)", type: "number", min: 1, required: true },
  { name: "price", label: "Preço (R$)", type: "money", hint: "Deixe vazio para mostrar “Valor sob consulta”." },
  { name: "price_note", label: "Observação do preço", hint: "Ex.: ou 3x de R$ 99 no cartão" },
  { name: "position", label: "Ordem no site", type: "number", min: 0 },
  { name: "featured", label: "Destacar na página inicial", type: "checkbox" },
  { name: "active", label: "Mostrar no site", type: "checkbox" },
];

const COVERS = ["vendas-do-zero", "vendas-pelo-whatsapp-e-instagram", "atendimento-que-vende", "fechamento-e-objecoes"];
const coverFor = (c) => c.cover_path || `/assets/img/cursos/${COVERS.includes(c.slug) ? c.slug : "padrao"}.svg`;

export async function courses(view) {
  view.innerHTML = `<div class="view-head"><h1>Cursos</h1><div class="toolbar"><button class="btn" data-new>Novo curso</button></div></div>
    <p class="muted" style="margin-top:-.6rem">Cada curso pode ter várias turmas; as datas e vagas ficam em <a href="#/turmas">Turmas</a>. Sem foto enviada, o curso usa a ilustração padrão.</p>
    <div data-grid></div>`;
  const draw = async () => {
    invalidate();
    const list = await api("/api/admin/courses");
    view.querySelector("[data-grid]").innerHTML = list.length ? `<div class="cards">${list.map((c) => `
      <article class="card"><div class="ph"><img src="${esc(coverFor(c))}" alt=""></div>
        <div class="bd"><strong>${esc(c.title)}</strong><br><span class="small muted">${FORMATS[c.format]} · ${c.workload_hours} h ·
          ${c.price == null ? "sob consulta" : money(c.price)}</span><p class="small" style="margin:.5rem 0 0">${esc(c.tagline)}</p></div>
        <div class="ft">${c.active ? '<span class="pill s-aprovado">No site</span>' : '<span class="pill">Oculto</span>'}
          ${c.featured ? '<span class="pill s-em_analise">Destaque</span>' : ""}<span style="flex:1"></span>
          <button class="btn btn-ghost btn-sm" data-cover="${c.id}">Trocar capa</button>
          <a class="btn btn-ghost btn-sm" href="/curso?c=${esc(c.slug)}" target="_blank" rel="noopener">Ver</a>
          <button class="btn btn-sm" data-edit="${c.id}">Editar</button></div></article>`).join("")}</div>`
      : emptyState("Nenhum curso cadastrado.", "Novo curso", () => edit(null));
    view.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => edit(list.find((c) => c.id == b.dataset.edit)));
    view.querySelectorAll("[data-cover]").forEach((b) => b.onclick = async () => {
      try { if (await pickImage(`/api/admin/courses/${b.dataset.cover}/cover`)) { toast("Capa atualizada."); draw(); } }
      catch (e) { toast(e.message, "err"); }
    });
  };
  const edit = (c) => formDialog({
    title: c ? "Editar curso" : "Novo curso", wide: true, fields: FIELDS,
    values: c || { format: "online_ao_vivo", workload_hours: 8, active: true, position: 0 },
    onSubmit: async (v) => {
      await api(c ? `/api/admin/courses/${c.id}` : "/api/admin/courses", { method: c ? "PUT" : "POST",
        body: { ...v, workload_hours: v.workload_hours || 1, position: v.position || 0 } });
      toast("Curso salvo."); draw();
    },
    onDelete: c ? async () => { await api(`/api/admin/courses/${c.id}`, { method: "DELETE" }); toast("Curso excluído."); draw(); } : null,
  });
  view.querySelector("[data-new]").onclick = () => edit(null);
  await draw();
}
