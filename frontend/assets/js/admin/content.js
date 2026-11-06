/* Conteúdo do site: dicas (blog), depoimentos e mensagens. */
import { api, changed, confirmDialog, dateBR, dateTimeBR, emptyState, esc, formDialog, pickImage, toast, whatsUrl } from "./core.js";

/* ---------------------------------------------------------------- dicas */
export async function posts(view) {
  view.innerHTML = `<div class="view-head"><h1>Dicas (blog)</h1><div class="toolbar"><button class="btn" data-new>Nova dica</button></div></div>
    <p class="muted" style="margin-top:-.6rem">Textos curtos ajudam o site a aparecer no Google e dão motivo para compartilhar no Instagram.
      No texto, use <strong>## </strong> no começo da linha para um subtítulo e <strong>- </strong> para itens de lista.</p>
    <div class="table-wrap" data-table></div>`;
  const draw = async () => {
    const list = await api("/api/admin/posts");
    view.querySelector("[data-table]").innerHTML = list.length ? `<table>
      <thead><tr><th>Título</th><th>Publicada em</th><th>Situação</th><th></th></tr></thead>
      <tbody>${list.map((p) => `<tr class="clickable" data-id="${p.id}" tabindex="0"><td><strong>${esc(p.title)}</strong><br><span class="small muted">${esc(p.excerpt)}</span></td>
        <td>${p.published_on ? dateBR(p.published_on) : "—"}</td>
        <td>${p.published ? '<span class="pill s-aprovado">Publicada</span>' : '<span class="pill s-em_analise">Rascunho</span>'}</td>
        <td class="num"><button class="btn btn-ghost btn-sm" data-cover="${p.id}">${p.cover_path ? "Trocar imagem" : "Imagem"}</button></td></tr>`).join("")}</tbody></table>`
      : emptyState("Nenhuma dica ainda.", "Nova dica", () => edit(null));
    view.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.onclick = (e) => { if (!e.target.closest("[data-cover]")) edit(list.find((p) => p.id == tr.dataset.id)); };
      tr.onkeydown = (e) => e.key === "Enter" && edit(list.find((p) => p.id == tr.dataset.id));
    });
    view.querySelectorAll("[data-cover]").forEach((b) => b.onclick = async () => {
      try { if (await pickImage(`/api/admin/posts/${b.dataset.cover}/cover`)) { toast("Imagem atualizada."); draw(); } }
      catch (e) { toast(e.message, "err"); }
    });
  };
  const edit = (p) => formDialog({
    title: p ? "Editar dica" : "Nova dica", wide: true,
    fields: [
      { name: "title", label: "Título", required: true, full: true },
      { name: "excerpt", label: "Resumo (aparece na lista e no Google)", full: true },
      { name: "body", label: "Texto", type: "textarea", rows: 12 },
      { name: "published", label: "Publicar no site", type: "checkbox" },
      { name: "published_on", label: "Data de publicação", type: "date" },
    ],
    values: p || {},
    onSubmit: async (v) => {
      await api(p ? `/api/admin/posts/${p.id}` : "/api/admin/posts", { method: p ? "PUT" : "POST", body: v });
      toast(v.published ? "Dica publicada." : "Rascunho salvo."); draw();
    },
    onDelete: p ? async () => { await api(`/api/admin/posts/${p.id}`, { method: "DELETE" }); toast("Dica excluída."); draw(); } : null,
    extra: p?.published ? [{ label: "Ver no site", onClick: () => { window.open(`/dica?p=${p.slug}`, "_blank", "noopener"); return false; } }] : [],
  });
  view.querySelector("[data-new]").onclick = () => edit(null);
  await draw();
}

/* ---------------------------------------------------------------- avaliações */
export async function reviews(view) {
  view.innerHTML = `<div class="view-head"><h1>Depoimentos</h1>
      <div class="toolbar"><a class="btn btn-ghost" href="/depoimento" target="_blank" rel="noopener">Abrir página de depoimento</a></div></div>
    <p class="muted" style="margin-top:-.6rem">Envie o link <strong>${esc(location.origin)}/depoimento</strong> para quem fez curso ou mentoria. Só aparecem no site os depoimentos aprovados.</p>
    <div data-list></div>`;
  const draw = async () => {
    const list = await api("/api/admin/testimonials");
    view.querySelector("[data-list]").innerHTML = list.length ? list.map((t) => `
      <article class="panel"><div class="view-head" style="margin:0 0 .4rem"><h2 style="margin:0">${esc(t.author)}
        <span class="small muted">${esc(t.role)}</span></h2>
        <span>${"★".repeat(t.rating)}<span class="muted">${"☆".repeat(5 - t.rating)}</span></span></div>
        <p style="margin:.2rem 0 .8rem">${esc(t.text)}</p>
        <div class="toolbar"><span class="small muted">Enviada em ${dateBR(t.created_at)}</span>
          ${t.approved ? '<span class="pill s-aprovado">Publicada</span>' : '<span class="pill s-em_analise">Aguardando revisão</span>'}
          <span style="flex:1"></span>
          <button class="btn btn-sm ${t.approved ? "btn-ghost" : ""}" data-t="${t.id}" data-a="${!t.approved}">${t.approved ? "Ocultar" : "Publicar"}</button>
          <button class="btn btn-sm btn-danger" data-del="${t.id}">Excluir</button></div></article>`).join("")
      : emptyState("Nenhum depoimento recebido ainda.");
    view.querySelectorAll("[data-t]").forEach((b) => b.onclick = async () => {
      await api(`/api/admin/testimonials/${b.dataset.t}?approved=${b.dataset.a}`, { method: "PATCH" });
      toast(b.dataset.a === "true" ? "Depoimento publicado." : "Depoimento ocultado."); changed(); draw();
    });
    view.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!(await confirmDialog("Excluir este depoimento?"))) return;
      await api(`/api/admin/testimonials/${b.dataset.del}`, { method: "DELETE" }); toast("Depoimento excluído."); changed(); draw();
    });
  };
  await draw();
}

/* ---------------------------------------------------------------- mensagens */
export async function messages(view) {
  view.innerHTML = `<div class="view-head"><h1>Mensagens</h1></div><div data-list></div>`;
  const draw = async () => {
    const list = await api("/api/admin/messages");
    view.querySelector("[data-list]").innerHTML = list.length ? list.map((m) => `
      <article class="panel" style="${m.read ? "" : "border-left:4px solid var(--tag-deep)"}">
        <div class="view-head" style="margin:0 0 .4rem"><h2 style="margin:0">${esc(m.name)}</h2><span class="small muted">${dateTimeBR(m.created_at)}</span></div>
        <p class="small muted" style="margin:0 0 .5rem"><a href="mailto:${esc(m.email)}">${esc(m.email)}</a> ${m.phone ? `· ${esc(m.phone)}` : ""}</p>
        <p style="white-space:pre-wrap;margin:0 0 .8rem">${esc(m.message)}</p>
        <div class="toolbar">
          <a class="btn btn-sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent("Re: contato pelo site")}">Responder por e-mail</a>
          ${m.phone ? `<a class="btn btn-sm btn-ghost" href="${whatsUrl(m.phone)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
          <button class="btn btn-sm btn-ghost" data-r="${m.id}" data-v="${!m.read}">${m.read ? "Marcar como não lida" : "Marcar como lida"}</button>
          <button class="btn btn-sm btn-danger" data-del="${m.id}">Excluir</button></div></article>`).join("")
      : emptyState("Nenhuma mensagem. As mensagens do formulário de contato aparecem aqui.");
    view.querySelectorAll("[data-r]").forEach((b) => b.onclick = async () => {
      await api(`/api/admin/messages/${b.dataset.r}?read=${b.dataset.v}`, { method: "PATCH" }); changed(); draw();
    });
    view.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!(await confirmDialog("Excluir esta mensagem?"))) return;
      await api(`/api/admin/messages/${b.dataset.del}`, { method: "DELETE" }); toast("Mensagem excluída."); changed(); draw();
    });
  };
  await draw();
}
