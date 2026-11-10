import { api, studentsList, dateBR, emptyState, esc, formDialog, isoToday, money, MONTHS, pill, toast } from "./core.js";
import { meiMeter } from "./dashboard.js";

let year = new Date().getFullYear();
let month = "";
let kind = "";
const qs = () => new URLSearchParams(Object.entries({ year, month, kind }).filter(([, v]) => v !== "")).toString();

const CATEGORIES = {
  receita: ["Cursos", "Mentoria", "Treinamento de equipe", "Palestra", "Outras receitas"],
  despesa: ["Material", "Ferramentas", "Divulgação", "Transporte", "Aluguel de sala", "DAS / impostos", "Telefone e internet", "Outras despesas"],
};

function barChart(months) {
  const W = 720, H = 220, P = 34, bw = (W - P) / 12;
  const max = Math.max(1, ...months.flatMap((m) => [m.receita, m.despesa]));
  const y = (v) => H - 24 - (v / max) * (H - 44);
  const ticks = [0, max / 2, max];
  return `<div class="chart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Receitas e despesas por mês em ${year}">
      ${ticks.map((t) => `<line x1="${P}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="#dde1ea"/>
        <text x="${P - 6}" y="${y(t) + 4}" font-size="12" text-anchor="end" fill="#5a6287">${Math.round(t).toLocaleString("pt-BR")}</text>`).join("")}
      ${months.map((m, i) => {
        const x = P + i * bw + bw * 0.18;
        const w = bw * 0.3;
        return `<g><title>${MONTHS[i]}: receita ${money(m.receita)}, despesa ${money(m.despesa)}</title>
          <rect x="${x}" y="${y(m.receita)}" width="${w}" height="${H - 24 - y(m.receita)}" rx="2" fill="#1b2559"/>
          <rect x="${x + w + 2}" y="${y(m.despesa)}" width="${w}" height="${H - 24 - y(m.despesa)}" rx="2" fill="#f2b705"/>
          <text x="${x + w}" y="${H - 8}" font-size="13" text-anchor="middle" fill="#5a6287">${m.label}</text></g>`;
      }).join("")}
    </svg>
    <div class="legend"><span><i style="background:#1b2559"></i>Receitas</span><span><i style="background:#f2b705"></i>Despesas</span></div></div>`;
}

export async function finance(view) {
  const years = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() + 1 - i);
  view.innerHTML = `
    <div class="view-head"><h1>Financeiro e MEI</h1>
      <div class="toolbar">
        <label class="sr-only" for="fy">Ano</label>
        <select class="input" id="fy" style="width:auto" data-year>${years.map((y) => `<option ${y === year ? "selected" : ""}>${y}</option>`).join("")}</select>
        <button class="btn btn-ghost" data-new="despesa">Nova despesa</button>
        <button class="btn" data-new="receita">Nova receita</button></div></div>
    <div data-top></div>
    <section class="panel" style="margin-top:1rem">
      <div class="view-head" style="margin-bottom:.8rem"><h2 style="margin:0">Lançamentos</h2>
        <div class="toolbar">
          <select class="input" style="width:auto" data-month aria-label="Mês"><option value="">Ano todo</option>
            ${MONTHS.map((m, i) => `<option value="${i + 1}" ${month == i + 1 ? "selected" : ""}>${m}</option>`).join("")}</select>
          <select class="input" style="width:auto" data-kind aria-label="Tipo"><option value="">Receitas e despesas</option>
            <option value="receita" ${kind === "receita" ? "selected" : ""}>Só receitas</option>
            <option value="despesa" ${kind === "despesa" ? "selected" : ""}>Só despesas</option></select>
          <button class="btn btn-ghost" data-csv>Exportar planilha (CSV)</button></div></div>
      <div class="table-wrap" style="border:0" data-entries></div>
    </section>`;

  const drawTop = async () => {
    const [s, mei, das] = await Promise.all([
      api(`/api/admin/finance/summary?year=${year}`), api(`/api/admin/finance/mei?year=${year}`), api(`/api/admin/finance/das?year=${year}`)]);
    const now = new Date();
    view.querySelector("[data-top]").innerHTML = `
      <div class="kpis">
        <div class="kpi"><div class="v">${money(s.receita)}</div><div class="l">receitas em ${year}</div></div>
        <div class="kpi"><div class="v">${money(s.despesa)}</div><div class="l">despesas em ${year}</div></div>
        <div class="kpi"><div class="v">${money(s.saldo)}</div><div class="l">resultado</div></div>
        <div class="kpi"><div class="v">${money(s.a_receber)}</div><div class="l">a receber (pendente)</div></div>
      </div>
      <div class="grid grid-2">
        <section class="panel"><h2>Receitas e despesas por mês</h2>${barChart(s.months)}</section>
        <section class="panel"><h2>Limite do MEI em ${year}</h2>${meiMeter(mei)}
          <p class="small muted">Até 20% acima do limite (${money(mei.tolerance_limit)}) o MEI paga DAS complementar sobre o excesso; acima disso precisa migrar para microempresa. Confirme sempre com uma contadora.</p></section>
      </div>
      <section class="panel" style="margin-top:1rem">
        <h2>DAS mensal ${year}</h2>
        <p class="small muted" style="margin-top:-.3rem">Vence todo dia 20. Clique no mês para marcar como pago ou em aberto.</p>
        ${das.length ? `<div class="das-grid">${das.map((d) => {
          const late = !d.paid && (d.year < now.getFullYear() || (d.year === now.getFullYear() && (d.month < now.getMonth() + 1 || (d.month === now.getMonth() + 1 && now.getDate() > 20))));
          return `<button class="das ${d.paid ? "paid" : late ? "late" : ""}" data-m="${d.month}" data-amount="${d.amount}" data-paid="${d.paid}">
            <strong>${MONTHS[d.month - 1].slice(0, 3)}</strong><span class="small">${money(d.amount)}</span><br>
            <span class="small">${d.paid ? `pago ${d.paid_on ? dateBR(d.paid_on) : ""}` : late ? "atrasado" : "em aberto"}</span></button>`;
        }).join("")}</div>` : `<p class="muted">A empresa ainda não estava aberta neste ano.</p>`}
      </section>`;
    view.querySelectorAll(".das").forEach((b) => b.onclick = () => formDialog({
      title: `DAS de ${MONTHS[b.dataset.m - 1]} de ${year}`,
      fields: [{ name: "amount", label: "Valor (R$)", type: "money", required: true },
               { name: "paid", label: "Pago", type: "checkbox" },
               { name: "paid_on", label: "Data do pagamento", type: "date" }],
      values: { amount: b.dataset.amount, paid: b.dataset.paid === "true", paid_on: isoToday() },
      onSubmit: async (v) => { await api(`/api/admin/finance/das/${year}/${b.dataset.m}`, { method: "PUT", body: v }); toast("DAS atualizado."); drawTop(); },
    }));
  };

  const drawEntries = async () => {
    const list = await api(`/api/admin/finance/entries?${qs()}`);
    const box = view.querySelector("[data-entries]");
    box.innerHTML = list.length ? `<table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Aluno</th><th>Situação</th><th class="num">Valor</th></tr></thead>
      <tbody>${list.map((e) => `<tr class="clickable" data-id="${e.id}" tabindex="0">
        <td>${dateBR(e.date)}</td><td><strong>${esc(e.description)}</strong>${e.invoice_number ? `<br><span class="small muted">NF ${esc(e.invoice_number)}</span>` : ""}</td>
        <td>${esc(e.category)}</td><td>${esc(e.student ? e.student.name : "")}</td><td>${pill(e.status)}</td>
        <td class="num" style="color:${e.kind === "despesa" ? "var(--red)" : "inherit"}">${e.kind === "despesa" ? "−" : ""}${money(e.amount)}</td></tr>`).join("")}</tbody></table>`
      : emptyState("Nenhum lançamento neste período.");
    box.querySelectorAll("tr[data-id]").forEach((tr) => {
      const open = () => entryForm(list.find((e) => e.id == tr.dataset.id));
      tr.onclick = open;
      tr.onkeydown = (ev) => ev.key === "Enter" && open();
    });
  };

  const reload = () => Promise.all([drawTop(), drawEntries()]);

  async function entryForm(e, newKind) {
    const k = e?.kind || newKind;
    const students = await studentsList(true);
    formDialog({
      title: e ? `Editar ${k}` : `Nova ${k}`,
      fields: [
        { name: "description", label: "Descrição", required: true, full: true },
        { name: "amount", label: "Valor (R$)", type: "money", required: true },
        { name: "date", label: "Data", type: "date", required: true },
        { name: "category", label: "Categoria", type: "select", options: CATEGORIES[k].map((c) => [c, c]) },
        { name: "status", label: "Situação", type: "select", options: [["pago", k === "receita" ? "Recebido" : "Pago"], ["pendente", "Pendente"]] },
        { name: "payment_method", label: "Forma de pagamento", type: "select",
          options: [["", "—"], ["Pix", "Pix"], ["Transferência", "Transferência"], ["Dinheiro", "Dinheiro"], ["Boleto", "Boleto"], ["Cartão", "Cartão"]] },
        ...(k === "receita" ? [
          { name: "invoice_number", label: "Número da nota fiscal" },
          { name: "student_id", label: "Aluno / cliente", type: "select", nullable: true, full: true,
            options: [["", "—"], ...students.map((s) => [s.id, s.name])] }] : []),
      ],
      values: e || { date: isoToday(), status: "pago", category: CATEGORIES[k][0] },
      onSubmit: async (v) => {
        const body = { ...v, kind: k, student_id: v.student_id ? Number(v.student_id) : null, enrollment_id: e?.enrollment_id ?? null, mentoring_id: e?.mentoring_id ?? null };
        await api(e ? `/api/admin/finance/entries/${e.id}` : "/api/admin/finance/entries", { method: e ? "PUT" : "POST", body });
        toast("Lançamento salvo.");
        reload();
      },
      onDelete: e ? async () => { await api(`/api/admin/finance/entries/${e.id}`, { method: "DELETE" }); toast("Lançamento excluído."); reload(); } : null,
    });
  }

  view.querySelector("[data-year]").onchange = (ev) => { year = Number(ev.target.value); reload(); };
  view.querySelector("[data-month]").onchange = (ev) => { month = ev.target.value; drawEntries(); };
  view.querySelector("[data-kind]").onchange = (ev) => { kind = ev.target.value; drawEntries(); };
  view.querySelectorAll("[data-new]").forEach((b) => b.onclick = () => entryForm(null, b.dataset.new));
  view.querySelector("[data-csv]").onclick = async () => {
    const res = await api(`/api/admin/finance/export.csv?${qs()}`, { raw: true });
    const blob = await res.blob();
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `financeiro-${year}${month ? "-" + month : ""}.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  };
  await reload();
}
