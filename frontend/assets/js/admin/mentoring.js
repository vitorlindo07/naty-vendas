import { api, changed, confirmDialog, dateBR, download, emptyState, esc, formDialog, isoToday, localDateTimeBR,
         MENTORING_STATUS, money, pill, toast, whatsUrl } from "./core.js";

let filter = "";

export async function mentoring(view, [openId]) {
  view.innerHTML = `<div class="view-head"><h1>Mentorias</h1></div>
    <div class="tabs" role="group" aria-label="Situação">
      ${[["", "Todas"], ...Object.entries(MENTORING_STATUS)].map(([k, l]) => `<button class="tab" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join("")}</div>
    <div class="table-wrap" data-table></div>`;
  let list = [];
  const draw = async () => {
    list = await api(`/api/admin/mentoring?status=${filter}`);
    view.querySelector("[data-table]").innerHTML = list.length ? `<table>
      <thead><tr><th>Pedido</th><th>Quem</th><th>Tipo</th><th>Agendado para</th><th class="num">Valor</th><th>Situação</th></tr></thead>
      <tbody>${list.map((m) => `<tr class="clickable" data-id="${m.id}" tabindex="0"><td>${dateBR(m.created_at)}</td>
        <td><strong>${esc(m.name)}</strong><br><span class="small muted">${esc(m.phone)}</span></td>
        <td>${m.kind === "equipe" ? `Equipe (${m.team_size || "?"})` : "Individual"}</td>
        <td>${m.scheduled_at ? localDateTimeBR(m.scheduled_at) : "—"}</td><td class="num">${m.price ? money(m.price) : "—"}</td>
        <td>${pill(m.status, MENTORING_STATUS)}</td></tr>`).join("")}</tbody></table>`
      : emptyState("Os pedidos de mentoria feitos pelo site aparecem aqui.");
    view.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.onclick = () => open(list.find((m) => m.id == tr.dataset.id));
      tr.onkeydown = (e) => e.key === "Enter" && tr.onclick();
    });
  };
  const open = (m) => {
    const first = m.name.split(" ")[0];
    formDialog({
      title: `Mentoria — ${m.name}`, wide: true,
      intro: `<dl class="detail-list"><dt>Contato</dt><dd>${esc(m.phone)} · ${esc(m.email)}</dd>
        <dt>Tipo</dt><dd>${m.kind === "equipe" ? `Equipe de ${m.team_size || "?"} pessoas` : "Individual"}</dd>
        <dt>Objetivo</dt><dd>${esc(m.goal) || "—"}</dd><dt>Horários</dt><dd>${esc(m.preferred_times) || "—"}</dd></dl>`,
      fields: [
        { name: "status", label: "Situação", type: "select", options: Object.entries(MENTORING_STATUS) },
        { name: "scheduled_at", label: "Data e hora do encontro", type: "datetime-local" },
        { name: "price", label: "Valor (R$)", type: "money" },
        { name: "notes", label: "Anotações (o que foi combinado, próximos passos)", type: "textarea", rows: 3 },
      ],
      values: { ...m, scheduled_at: m.scheduled_at ? m.scheduled_at.slice(0, 16) : "" },
      onSubmit: async (v) => {
        await api(`/api/admin/mentoring/${m.id}`, { method: "PATCH", body: { ...v, scheduled_at: v.scheduled_at || null } });
        toast("Mentoria atualizada."); changed(); draw();
      },
      onDelete: async () => { await api(`/api/admin/mentoring/${m.id}`, { method: "DELETE" }); toast("Pedido excluído."); changed(); draw(); },
      extra: [
        { label: "WhatsApp", onClick: () => { window.open(whatsUrl(m.phone, `Oi, ${first}! Aqui é a Naty. Recebi seu pedido de mentoria pelo site. Podemos conversar?`), "_blank", "noopener"); return false; } },
        { label: "Lançar pagamento", onClick: async (v) => {
          await api(`/api/admin/mentoring/${m.id}`, { method: "PATCH", body: { ...v, scheduled_at: v.scheduled_at || null } });
          await api(`/api/admin/mentoring/${m.id}/bill`, { method: "POST", body: { payment_method: "Pix", paid_on: isoToday() } });
          toast("Pagamento lançado no financeiro."); draw();
        } },
      ],
    });
  };
  view.querySelectorAll(".tab").forEach((t) => t.onclick = () => {
    filter = t.dataset.s;
    view.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-pressed", x === t));
    draw();
  });
  await draw();
  if (openId) { const m = list.find((x) => x.id == openId); if (m) open(m); }
}

export async function leads(view) {
  view.innerHTML = `<div class="view-head"><h1>Interessados</h1>
      <div class="toolbar"><button class="btn btn-ghost" data-copy>Copiar números ainda não chamados</button><button class="btn btn-ghost" data-csv>Baixar planilha</button></div></div>
    <p class="muted" style="margin-top:-.6rem">Pessoas que pediram dicas e aviso de novas turmas. Use uma lista de transmissão no WhatsApp para avisar todas de uma vez.</p>
    <div class="table-wrap" data-table></div>`;
  let list = [];
  const draw = async () => {
    list = await api("/api/admin/leads");
    view.querySelector("[data-table]").innerHTML = list.length ? `<table>
      <thead><tr><th>Data</th><th>Nome</th><th>WhatsApp</th><th>Interesse</th><th></th></tr></thead>
      <tbody>${list.map((l) => `<tr><td>${dateBR(l.created_at)}</td><td><strong>${esc(l.name)}</strong></td>
        <td><a href="${whatsUrl(l.phone, `Oi, ${l.name.split(" ")[0]}! Aqui é a Naty. Você pediu para receber o aviso das novas turmas.`)}" target="_blank" rel="noopener">${esc(l.phone)}</a></td>
        <td>${esc(l.interest) || "—"}</td>
        <td class="num"><button class="btn btn-sm ${l.contacted ? "btn-ghost" : ""}" data-c="${l.id}" data-v="${!l.contacted}">${l.contacted ? "Já chamei ✓" : "Marcar como chamado"}</button>
          <button class="btn btn-sm btn-danger" data-del="${l.id}" aria-label="Excluir ${esc(l.name)}">Excluir</button></td></tr>`).join("")}</tbody></table>`
      : emptyState("Ninguém ainda. O formulário de dicas fica na página inicial do site.");
    view.querySelectorAll("[data-c]").forEach((b) => b.onclick = async () => {
      await api(`/api/admin/leads/${b.dataset.c}?contacted=${b.dataset.v}`, { method: "PATCH" }); changed(); draw();
    });
    view.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!(await confirmDialog("Excluir este contato? Faça isso quando a pessoa pedir para sair."))) return;
      await api(`/api/admin/leads/${b.dataset.del}`, { method: "DELETE" }); changed(); draw();
    });
  };
  view.querySelector("[data-csv]").onclick = () => download("/api/admin/leads.csv", "interessados.csv");
  view.querySelector("[data-copy]").onclick = async () => {
    const nums = list.filter((l) => !l.contacted).map((l) => l.phone).join(", ");
    if (!nums) return toast("Todos já foram chamados.");
    await navigator.clipboard.writeText(nums);
    toast("Números copiados.");
  };
  await draw();
}
