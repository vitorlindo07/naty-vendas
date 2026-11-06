import { api, CLASS_STATUS, confirmDialog, coursesList, dateBR, download, emptyState, ENROLL_STATUS, esc, formDialog, infoDialog,
         money, pill, toast } from "./core.js";
import { openEnrollment } from "./enrollments.js";
import { printCertificates } from "./certificate.js";

let filter = "aberta";

export async function classes(view, [param]) {
  view.innerHTML = `
    <div class="view-head"><h1>Turmas</h1><div class="toolbar"><button class="btn" data-new>Abrir turma</button></div></div>
    <div class="tabs" role="group" aria-label="Situação">
      ${[["", "Todas"], ...Object.entries(CLASS_STATUS)].map(([k, l]) => `<button class="tab" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join("")}</div>
    <div class="table-wrap" data-table></div>`;
  const draw = async () => {
    const list = await api(`/api/admin/classes?status=${filter}`);
    view.querySelector("[data-table]").innerHTML = list.length ? `<table>
      <thead><tr><th>Início</th><th>Curso / turma</th><th>Horário e local</th><th>Ocupação</th><th>Situação</th></tr></thead>
      <tbody>${list.map((k) => `<tr class="clickable" data-id="${k.id}" tabindex="0">
        <td>${dateBR(k.start_date)}${k.end_date ? `<br><span class="small muted">até ${dateBR(k.end_date)}</span>` : ""}</td>
        <td><strong>${esc(k.course.title)}</strong><br><span class="small muted">${esc(k.name)}</span></td>
        <td>${esc(k.schedule)}<br><span class="small muted">${esc(k.location)}</span></td>
        <td>${k.enrolled}/${k.seats}<div class="occupancy"><span style="width:${Math.min(k.enrolled / k.seats * 100, 100)}%"></span></div></td>
        <td>${pill(k.status, CLASS_STATUS)}</td></tr>`).join("")}</tbody></table>`
      : emptyState("Nenhuma turma aqui.", "Abrir turma", () => editClass(null, draw));
    view.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.onclick = () => openClass(tr.dataset.id, draw);
      tr.onkeydown = (e) => e.key === "Enter" && tr.onclick();
    });
  };
  view.querySelectorAll(".tab").forEach((t) => t.onclick = () => {
    filter = t.dataset.s;
    view.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-pressed", x === t));
    draw();
  });
  view.querySelector("[data-new]").onclick = () => editClass(null, draw);
  await draw();
  if (param === "nova") editClass(null, draw);
  else if (param) openClass(param, draw);
}

async function openClass(id, reload) {
  const [k, roster] = await Promise.all([api(`/api/admin/classes/${id}`), api(`/api/admin/classes/${id}/roster`)]);
  const active = roster.filter((e) => e.status !== "cancelada");
  const paid = active.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0);
  const phones = active.map((e) => e.student.phone).filter(Boolean).join(", ");
  const html = `
    <dl class="detail-list">
      <dt>Curso</dt><dd>${esc(k.course.title)} · ${k.course.workload_hours} h</dd>
      <dt>Datas</dt><dd>${dateBR(k.start_date)}${k.end_date ? ` a ${dateBR(k.end_date)}` : ""} · ${esc(k.schedule)}</dd>
      <dt>Local</dt><dd>${esc(k.location) || "—"}</dd>
      ${k.online_link ? `<dt>Link da aula</dt><dd><a href="${esc(k.online_link)}" target="_blank" rel="noopener">${esc(k.online_link)}</a></dd>` : ""}
      <dt>Vagas</dt><dd>${k.enrolled} de ${k.seats} ocupadas</dd>
      <dt>Recebido</dt><dd>${money(paid)}</dd>
    </dl>
    <h3>Lista de alunos</h3>
    ${roster.length ? `<div class="table-wrap"><table><thead><tr><th>Aluno</th><th>Telefone</th><th>Pagamento</th><th>Situação</th></tr></thead>
      <tbody>${roster.map((e) => `<tr class="clickable" data-e="${e.id}"><td>${esc(e.student.name)}</td><td>${esc(e.student.phone)}</td>
        <td>${e.paid ? '<span class="pill s-pago">Pago</span>' : '<span class="pill s-pendente">Em aberto</span>'}</td>
        <td>${pill(e.status, ENROLL_STATUS)}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="muted">Ninguém inscrito ainda. Divulgue o link do curso: <strong>${esc(location.origin)}/curso?c=${esc(k.course.slug)}</strong></p>`}`;
  const concluded = roster.filter((e) => e.status === "concluida");
  const dlg = infoDialog({
    title: `${k.course.title} · ${k.name}`, wide: true, html,
    actions: [
      { label: "Editar turma", cls: "", onClick: () => { editClass(k, reload); } },
      ...(roster.length ? [{ label: "Baixar lista (CSV)", onClick: async () => { await download(`/api/admin/classes/${k.id}/roster.csv`, `lista-${k.id}.csv`); return false; } }] : []),
      ...(phones ? [{ label: "Copiar telefones", onClick: async () => { await navigator.clipboard.writeText(phones); toast("Telefones copiados. Cole numa lista de transmissão do WhatsApp."); return false; } }] : []),
      ...(k.status === "aberta" && active.length ? [{ label: "Encerrar e gerar certificados", cls: "btn-tag", onClick: async () => {
        if (!(await confirmDialog("Encerrar a turma? As inscrições confirmadas viram concluídas e ganham código de certificado. Pendentes não são alteradas.", "Encerrar turma"))) return false;
        const r = await api(`/api/admin/classes/${k.id}/complete`, { method: "POST" });
        toast(`Turma encerrada. ${r.completed} certificado(s) gerado(s).`); reload?.(); openClass(k.id, reload);
      } }] : []),
      ...(concluded.length ? [{ label: `Imprimir ${concluded.length} certificado(s)`, onClick: () => { printCertificates(concluded.map((e) => ({ ...e, course: k.course, course_class: k }))); return false; } }] : []),
    ],
  });
  dlg.querySelectorAll("tr[data-e]").forEach((tr) => tr.onclick = () => { dlg.close(); openEnrollment(tr.dataset.e, reload); });
}

async function editClass(k, reload) {
  const courses = await coursesList(true);
  formDialog({
    title: k ? "Editar turma" : "Abrir turma", wide: true,
    fields: [
      { name: "course_id", label: "Curso", type: "select", required: true, full: true, options: [["", "Escolha…"], ...courses.map((c) => [c.id, c.title])] },
      { name: "name", label: "Nome da turma", required: true, hint: "Ex.: Turma de sábado, Turma de março" },
      { name: "status", label: "Situação", type: "select", options: Object.entries(CLASS_STATUS) },
      { name: "start_date", label: "Início", type: "date", required: true },
      { name: "end_date", label: "Término", type: "date" },
      { name: "schedule", label: "Dias e horário", hint: "Ex.: Sábados, das 9h às 11h" },
      { name: "seats", label: "Vagas", type: "number", min: 1, required: true },
      { name: "location", label: "Local (aparece no site)", full: true, hint: "Endereço ou “Online, ao vivo pelo Google Meet”" },
      { name: "online_link", label: "Link da aula online (só no painel)", full: true },
      { name: "price", label: "Preço especial desta turma (R$)", type: "money", hint: "Deixe vazio para usar o preço do curso." },
    ],
    values: k ? { ...k } : { seats: 20, status: "aberta", name: "Turma " },
    onSubmit: async (v) => {
      const body = { ...v, course_id: Number(v.course_id), seats: v.seats || 1 };
      await api(k ? `/api/admin/classes/${k.id}` : "/api/admin/classes", { method: k ? "PUT" : "POST", body });
      toast(k ? "Turma atualizada." : "Turma aberta. Ela já aparece na página do curso."); reload?.();
    },
    onDelete: k ? async () => { await api(`/api/admin/classes/${k.id}`, { method: "DELETE" }); toast("Turma excluída."); reload?.(); } : null,
  });
}
