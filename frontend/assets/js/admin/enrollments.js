import { api, changed, confirmDialog, coursesList, dateBR, emptyState, ENROLL_STATUS, esc, formDialog, infoDialog, isoToday,
         money, pill, studentsList, toast, whatsUrl } from "./core.js";
import { printCertificates } from "./certificate.js";

let filter = "";

export async function enrollments(view, [openId]) {
  const courses = await coursesList(true);
  view.innerHTML = `
    <div class="view-head"><h1>Inscrições</h1>
      <div class="toolbar">
        <input class="input search" type="search" placeholder="Buscar aluno" data-q aria-label="Buscar aluno">
        <select class="input" style="width:auto" data-course aria-label="Curso"><option value="">Todos os cursos</option>
          ${courses.map((c) => `<option value="${c.id}">${esc(c.title)}</option>`).join("")}</select>
        <button class="btn" data-new>Nova inscrição</button></div></div>
    <div class="tabs" role="group" aria-label="Situação">
      ${[["", "Todas"], ...Object.entries(ENROLL_STATUS)].map(([k, l]) => `<button class="tab" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join("")}</div>
    <div class="table-wrap" data-table></div>`;

  const draw = async () => {
    const params = new URLSearchParams({ status: filter, q: view.querySelector("[data-q]").value });
    const cid = view.querySelector("[data-course]").value;
    if (cid) params.set("course_id", cid);
    const list = await api(`/api/admin/enrollments?${params}`);
    view.querySelector("[data-table]").innerHTML = list.length ? `<table>
      <thead><tr><th>Data</th><th>Aluno</th><th>Curso / turma</th><th class="num">Valor</th><th>Pagamento</th><th>Situação</th></tr></thead>
      <tbody>${list.map((e) => `<tr class="clickable" data-id="${e.id}" tabindex="0">
        <td>${dateBR(e.created_at)}</td>
        <td><strong>${esc(e.student.name)}</strong><br><span class="small muted">${esc(e.student.phone)}</span></td>
        <td>${esc(e.course.title)}<br><span class="small muted">${esc(e.course_class?.name || "Sem turma")}</span></td>
        <td class="num">${money(e.amount)}</td>
        <td>${e.paid ? `<span class="pill s-pago">Pago ${dateBR(e.paid_on)}</span>` : '<span class="pill s-pendente">Em aberto</span>'}</td>
        <td>${pill(e.status, ENROLL_STATUS)}</td></tr>`).join("")}</tbody></table>`
      : emptyState(filter ? "Nenhuma inscrição nesta situação." : "As inscrições feitas pelo site aparecem aqui.");
    view.querySelectorAll("tr[data-id]").forEach((tr) => {
      const open = () => openEnrollment(tr.dataset.id, draw);
      tr.onclick = open;
      tr.onkeydown = (ev) => ev.key === "Enter" && open();
    });
  };
  view.querySelectorAll(".tab").forEach((t) => t.onclick = () => {
    filter = t.dataset.s;
    view.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-pressed", x === t));
    draw();
  });
  let timer;
  view.querySelector("[data-q]").oninput = () => { clearTimeout(timer); timer = setTimeout(draw, 250); };
  view.querySelector("[data-course]").onchange = draw;
  view.querySelector("[data-new]").onclick = () => newEnrollment(draw);
  await draw();
  if (openId) openEnrollment(openId, draw);
}

export async function openEnrollment(id, reload) {
  const e = await api(`/api/admin/enrollments/${id}`);
  const first = e.student.name.split(" ")[0];
  const msgs = {
    pagamento: `Oi, ${first}! Aqui é a Naty. Recebi sua inscrição no curso ${e.course.title}. O valor é ${money(e.amount)}; me manda o comprovante do Pix por aqui que eu confirmo sua vaga.`,
    confirmado: `Oi, ${first}! Pagamento confirmado, sua vaga no curso ${e.course.title} está garantida. ${e.course_class ? `Começamos em ${dateBR(e.course_class.start_date)} (${e.course_class.schedule}). ` : ""}Qualquer dúvida, me chama!`,
  };
  const dlg = infoDialog({
    title: `Inscrição nº ${e.id}`, wide: true,
    html: `<dl class="detail-list">
        <dt>Aluno</dt><dd><a href="#/alunos/${e.student_id}">${esc(e.student.name)}</a></dd>
        <dt>Contato</dt><dd>${esc(e.student.phone)} · <a href="mailto:${esc(e.student.email)}">${esc(e.student.email)}</a></dd>
        <dt>Curso</dt><dd>${esc(e.course.title)} (${e.course.workload_hours} h)</dd>
        <dt>Turma</dt><dd>${e.course_class ? `${esc(e.course_class.name)} · começa ${dateBR(e.course_class.start_date)}` : "—"}</dd>
        <dt>Inscrita em</dt><dd>${dateBR(e.created_at)}</dd>
        <dt>Pagamento</dt><dd>${e.paid ? `Pago em ${dateBR(e.paid_on)} via ${esc(e.payment_method)}` : "Em aberto"}</dd>
        ${e.certificate_code ? `<dt>Certificado</dt><dd>Código <strong>${esc(e.certificate_code)}</strong> · concluído em ${dateBR(e.completed_on)}</dd>` : ""}
      </dl>
      <form class="form-grid" data-edit>
        <div class="f"><label for="en-st">Situação</label><select class="input" id="en-st" name="status">
          ${Object.entries(ENROLL_STATUS).map(([k, l]) => `<option value="${k}" ${e.status === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="f"><label for="en-am">Valor (R$)</label><input class="input" type="number" step="0.01" min="0" id="en-am" name="amount" value="${e.amount}" ${e.paid ? "disabled" : ""}></div>
        <div class="f full"><label for="en-no">Anotações</label><textarea class="input" id="en-no" name="notes" rows="2">${esc(e.notes)}</textarea></div>
      </form>`,
    actions: [
      { label: "Salvar", cls: "", onClick: async () => {
        const f = dlg.querySelector("[data-edit]");
        const body = { status: f.status.value, notes: f.notes.value };
        if (!e.paid) body.amount = Number(f.amount.value || 0);
        await api(`/api/admin/enrollments/${e.id}`, { method: "PATCH", body });
        toast("Inscrição atualizada."); changed(); reload?.();
      } },
      ...(!e.paid ? [{ label: "Registrar pagamento", cls: "btn-tag", onClick: () => { payDialog(e, reload); } }] : []),
      { label: e.paid ? "WhatsApp: confirmar vaga" : "WhatsApp: cobrar Pix", href: whatsUrl(e.student.phone, e.paid ? msgs.confirmado : msgs.pagamento) },
      ...(e.certificate_code ? [{ label: "Imprimir certificado", onClick: () => { printCertificates([e]); return false; } }] : []),
      { label: "Excluir", cls: "btn-danger", onClick: async () => {
        if (!(await confirmDialog(`Excluir a inscrição de ${e.student.name}?`))) return false;
        await api(`/api/admin/enrollments/${e.id}`, { method: "DELETE" }); toast("Inscrição excluída."); changed(); reload?.();
      } },
    ],
  });
}

function payDialog(e, reload) {
  formDialog({
    title: "Registrar pagamento",
    intro: `<p class="muted">${esc(e.student.name)} · ${esc(e.course.title)} · <strong>${money(e.amount)}</strong>. A inscrição fica confirmada e a receita entra no financeiro.</p>`,
    fields: [
      { name: "payment_method", label: "Forma de pagamento", type: "select", options: [["Pix", "Pix"], ["Cartão", "Cartão"], ["Dinheiro", "Dinheiro"], ["Transferência", "Transferência"]] },
      { name: "paid_on", label: "Data do pagamento", type: "date", required: true },
      { name: "invoice_number", label: "Número da nota fiscal (se emitida)", full: true },
    ],
    values: { paid_on: isoToday() }, submitLabel: "Confirmar pagamento",
    onSubmit: async (v) => {
      await api(`/api/admin/enrollments/${e.id}/pay`, { method: "POST", body: v });
      toast("Pagamento registrado. Vaga confirmada."); changed(); reload?.();
    },
  });
}

async function newEnrollment(reload) {
  const [students, courses] = await Promise.all([studentsList(true), coursesList()]);
  const classes = await api("/api/admin/classes?status=aberta");
  formDialog({
    title: "Nova inscrição",
    intro: students.length ? "" : `<p class="alert warn">Cadastre o aluno primeiro em <a href="#/alunos">Alunos</a>.</p>`,
    fields: [
      { name: "student_id", label: "Aluno", type: "select", required: true, full: true, options: [["", "Escolha…"], ...students.map((s) => [s.id, `${s.name} (${s.email})`])] },
      { name: "class_id", label: "Turma", type: "select", full: true, options: [["", "Sem turma (curso gravado ou avulso)"],
        ...classes.map((k) => [k.id, `${k.course.title} · ${k.name} · ${dateBR(k.start_date)} (${k.seats_left} vagas)`])] },
      { name: "course_id", label: "Curso (se não escolheu turma)", type: "select", full: true, options: [["", "—"], ...courses.map((c) => [c.id, c.title])] },
      { name: "amount", label: "Valor (R$)", type: "money" },
      { name: "status", label: "Situação", type: "select", options: Object.entries(ENROLL_STATUS).slice(0, 2) },
    ],
    onSubmit: async (v) => {
      const klass = classes.find((k) => k.id == v.class_id);
      const courseId = klass ? klass.course_id : Number(v.course_id);
      if (!courseId) throw new Error("Escolha uma turma ou um curso.");
      const course = courses.find((c) => c.id === courseId);
      await api("/api/admin/enrollments", { method: "POST", body: {
        student_id: Number(v.student_id), course_id: courseId, class_id: klass ? klass.id : null, status: v.status,
        amount: v.amount ?? klass?.price ?? course?.price ?? 0 } });
      toast("Inscrição criada."); changed(); reload?.();
    },
  });
}
