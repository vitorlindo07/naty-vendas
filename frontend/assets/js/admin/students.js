import { api, dateBR, emptyState, ENROLL_STATUS, esc, formDialog, infoDialog, money, pill, toast, whatsUrl } from "./core.js";
import { openEnrollment } from "./enrollments.js";

const FIELDS = [
  { name: "name", label: "Nome", required: true },
  { name: "email", label: "E-mail", type: "email", required: true },
  { name: "phone", label: "WhatsApp", type: "tel" },
  { name: "city", label: "Cidade" },
  { name: "company", label: "Onde trabalha / o que vende", full: true },
  { name: "notes", label: "Observações", type: "textarea", rows: 3 },
];

export async function students(view, [openId]) {
  view.innerHTML = `<div class="view-head"><h1>Alunos</h1>
      <div class="toolbar"><input class="input search" type="search" placeholder="Buscar por nome, e-mail ou telefone" data-q aria-label="Buscar aluno">
        <button class="btn" data-new>Novo aluno</button></div></div>
    <div class="table-wrap" data-table></div>`;
  const draw = async () => {
    const q = view.querySelector("[data-q]").value;
    const list = await api(`/api/admin/students?q=${encodeURIComponent(q)}`);
    view.querySelector("[data-table]").innerHTML = list.length ? `<table>
      <thead><tr><th>Nome</th><th>Contato</th><th>Cidade</th><th>O que vende</th><th>Desde</th></tr></thead>
      <tbody>${list.map((s) => `<tr class="clickable" data-id="${s.id}" tabindex="0"><td><strong>${esc(s.name)}</strong></td>
        <td>${esc(s.phone)}<br><span class="small muted">${esc(s.email)}</span></td><td>${esc(s.city)}</td><td>${esc(s.company)}</td>
        <td>${dateBR(s.created_at)}</td></tr>`).join("")}</tbody></table>`
      : emptyState(q ? "Ninguém encontrado." : "Os alunos aparecem aqui quando se inscrevem pelo site.");
    view.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.onclick = () => detail(tr.dataset.id, draw);
      tr.onkeydown = (e) => e.key === "Enter" && tr.onclick();
    });
  };
  let t;
  view.querySelector("[data-q]").oninput = () => { clearTimeout(t); t = setTimeout(draw, 250); };
  view.querySelector("[data-new]").onclick = () => edit(null, draw);
  await draw();
  if (openId) detail(openId, draw);
}

function edit(s, reload) {
  formDialog({
    title: s ? "Editar aluno" : "Novo aluno", fields: FIELDS, values: s || {},
    onSubmit: async (v) => {
      await api(s ? `/api/admin/students/${s.id}` : "/api/admin/students", { method: s ? "PUT" : "POST", body: v });
      toast("Aluno salvo."); reload?.();
    },
    onDelete: s ? async () => { await api(`/api/admin/students/${s.id}`, { method: "DELETE" }); toast("Aluno e inscrições excluídos."); reload?.(); } : null,
  });
}

async function detail(id, reload) {
  const { student: s, enrollments, total_paid } = await api(`/api/admin/students/${id}`);
  const dlg = infoDialog({
    title: s.name, wide: true,
    html: `<dl class="detail-list"><dt>E-mail</dt><dd>${esc(s.email)}</dd><dt>WhatsApp</dt><dd>${esc(s.phone) || "—"}</dd>
        <dt>Cidade</dt><dd>${esc(s.city) || "—"}</dd><dt>O que vende</dt><dd>${esc(s.company) || "—"}</dd>
        <dt>Observações</dt><dd>${esc(s.notes) || "—"}</dd><dt>Total pago</dt><dd><strong>${money(total_paid)}</strong></dd></dl>
      <h3>Cursos</h3>${enrollments.length ? `<ul class="list">${enrollments.map((e) => `<li data-e="${e.id}" style="cursor:pointer">
        <span>${esc(e.course.title)}<br><span class="small muted">${esc(e.course_class?.name || "")} · ${dateBR(e.created_at)}</span></span>
        <span>${money(e.amount)} ${pill(e.status, ENROLL_STATUS)}</span></li>`).join("")}</ul>` : '<p class="muted">Nenhuma inscrição.</p>'}`,
    actions: [
      { label: "Editar", cls: "", onClick: () => { edit(s, reload); } },
      ...(s.phone ? [{ label: "WhatsApp", href: whatsUrl(s.phone, `Oi, ${s.name.split(" ")[0]}! Aqui é a Naty.`) }] : []),
    ],
  });
  dlg.querySelectorAll("[data-e]").forEach((li) => li.onclick = () => { dlg.close(); openEnrollment(li.dataset.e, reload); });
}
