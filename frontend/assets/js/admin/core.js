/* Utilitários do painel: chamadas à API, formatação, avisos e formulários em diálogo. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function logout() {
  localStorage.removeItem("nt_token");
  localStorage.removeItem("nt_user");
  location.replace("/admin/login");
}

export async function api(path, { method = "GET", body, raw = false } = {}) {
  const headers = { Authorization: `Bearer ${localStorage.getItem("nt_token")}` };
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(path, { method, headers, body: payload });
  if (res.status === 401) { logout(); throw new Error("Sessão expirada."); }
  if (raw) return res;
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data.detail;
    throw new Error(Array.isArray(d) ? d.map((x) => `${x.loc?.at(-1)}: ${x.msg.replace(/^Value error, /, "")}`).join(" · ")
      : d || `Erro ${res.status}`);
  }
  return data;
}

/* ---------------------------------------------------------------- formatação */
export const money = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// datas do banco vêm em UTC sem fuso; datas puras (AAAA-MM-DD) são tratadas como meio-dia local
const toDate = (iso) => new Date(iso.length === 10 ? iso + "T12:00:00" : /[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + "Z");
export const dateBR = (iso) => iso ? toDate(iso).toLocaleDateString("pt-BR") : "—";
export const dateTimeBR = (iso) => iso ? toDate(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
export const hhmm = (t) => t ? t.slice(0, 5) : "";
export const isoToday = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
export const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const ENROLL_STATUS = { pendente: "Aguardando pagamento", confirmada: "Confirmada", concluida: "Concluída", cancelada: "Cancelada" };
export const CLASS_STATUS = { aberta: "Inscrições abertas", encerrada: "Encerrada", cancelada: "Cancelada" };
export const MENTORING_STATUS = { novo: "Novo pedido", agendado: "Agendado", realizado: "Realizado", cancelado: "Cancelado" };
export const FORMATS = { online_ao_vivo: "Online ao vivo", presencial: "Presencial", gravado: "Aulas gravadas", hibrido: "Online + presencial" };
export const pill = (status, labels) => `<span class="pill s-${esc(status)}">${esc(labels?.[status] || status)}</span>`;
export const whatsUrl = (phone, text = "") =>
  `https://wa.me/55${String(phone).replace(/\D/g, "").replace(/^55/, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/* ---------------------------------------------------------------- avisos */
export function toast(msg, kind = "ok") {
  const box = $(".toast-box");
  const el = document.createElement("div");
  el.className = `toast ${kind === "err" ? "err" : ""}`;
  el.textContent = msg;
  box.append(el);
  setTimeout(() => el.remove(), kind === "err" ? 6000 : 3000);
}

export function confirmDialog(message, okLabel = "Excluir") {
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.className = "modal";
    dlg.innerHTML = `<form method="dialog">
      <div class="modal-body"><p style="font-size:1.05rem;margin:0">${esc(message)}</p></div>
      <div class="modal-foot"><div class="right">
        <button class="btn btn-ghost" value="no">Cancelar</button>
        <button class="btn ${okLabel === "Excluir" ? "btn-danger" : ""}" value="yes">${esc(okLabel)}</button></div></div></form>`;
    document.body.append(dlg);
    dlg.addEventListener("close", () => { resolve(dlg.returnValue === "yes"); dlg.remove(); });
    dlg.showModal();
  });
}

/* ---------------------------------------------------------------- formulário genérico
   fields: [{ name, label, type, options, required, full, hint, section, step, min }]
   tipos: text, email, tel, number, money, date, time, textarea, select, checkbox, file   */
function fieldHtml(f, value) {
  if (f.section) return `<div class="form-section">${esc(f.section)}</div>`;
  const id = `f-${f.name}`;
  const req = f.required ? "required" : "";
  const v = value ?? f.default ?? "";
  let control;
  switch (f.type) {
    case "textarea":
      control = `<textarea class="input" id="${id}" name="${f.name}" ${req} rows="${f.rows || 4}">${esc(v)}</textarea>`; break;
    case "select":
      control = `<select class="input" id="${id}" name="${f.name}" ${req}>${f.options.map(([val, lab]) =>
        `<option value="${esc(val)}" ${String(val) === String(v ?? "") ? "selected" : ""}>${esc(lab)}</option>`).join("")}</select>`; break;
    case "checkbox":
      return `<div class="f check ${f.full ? "full" : ""}"><input type="checkbox" id="${id}" name="${f.name}" ${v ? "checked" : ""}>
        <label for="${id}">${esc(f.label)}</label></div>`;
    case "file":
      control = `<input class="input" type="file" id="${id}" name="${f.name}" accept="${f.accept || "image/*"}">`; break;
    case "money":
      control = `<input class="input" type="number" step="0.01" min="0" id="${id}" name="${f.name}" value="${esc(v)}" ${req}>`; break;
    default:
      control = `<input class="input" type="${f.type || "text"}" id="${id}" name="${f.name}" value="${esc(v)}" ${req}
        ${f.min != null ? `min="${f.min}"` : ""} ${f.step ? `step="${f.step}"` : ""}>`;
  }
  return `<div class="f ${f.full || f.type === "textarea" ? "full" : ""}"><label for="${id}">${esc(f.label)}${f.required ? " *" : ""}</label>
    ${control}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ""}</div>`;
}

function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    if (f.section) continue;
    const el = form.elements[f.name];
    if (!el) continue;
    if (f.type === "checkbox") out[f.name] = el.checked;
    else if (f.type === "file") out[f.name] = el.files[0] || null;
    else if (["number", "money"].includes(f.type)) out[f.name] = el.value === "" ? null : Number(el.value);
    else if (f.nullable && el.value === "") out[f.name] = null;
    else if (["date", "time"].includes(f.type)) out[f.name] = el.value || null;
    else out[f.name] = el.value;
  }
  return out;
}

/**
 * Abre um formulário em diálogo. `onSubmit(values)` deve salvar; se lançar erro, a mensagem aparece no rodapé.
 * `extra` permite botões adicionais no rodapé à esquerda: [{ label, cls, onClick }]
 */
export function formDialog({ title, fields, values = {}, submitLabel = "Salvar", onSubmit, onDelete, extra = [], wide = false, intro = "" }) {
  const dlg = document.createElement("dialog");
  dlg.className = `modal ${wide ? "wide" : ""}`;
  dlg.innerHTML = `<form novalidate>
    <div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="x" aria-label="Fechar" data-close>×</button></div>
    <div class="modal-body">${intro}<div class="form-grid">${fields.map((f) => fieldHtml(f, values[f.name])).join("")}</div></div>
    <div class="modal-foot">
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        ${onDelete ? `<button type="button" class="btn btn-danger" data-delete>Excluir</button>` : ""}
        ${extra.map((x, i) => `<button type="button" class="btn ${x.cls || "btn-ghost"}" data-extra="${i}">${esc(x.label)}</button>`).join("")}
      </div>
      <div class="right"><span class="form-error" data-err></span>
        <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
        <button type="submit" class="btn">${esc(submitLabel)}</button></div>
    </div></form>`;
  document.body.append(dlg);
  const form = dlg.querySelector("form");
  const err = dlg.querySelector("[data-err]");
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  $$("[data-close]", dlg).forEach((b) => b.addEventListener("click", close));
  dlg.querySelector("[data-delete]")?.addEventListener("click", async () => {
    if (!(await confirmDialog("Excluir este registro? Essa ação não pode ser desfeita."))) return;
    try { await onDelete(); close(); } catch (e) { err.textContent = e.message; }
  });
  extra.forEach((x, i) => dlg.querySelector(`[data-extra="${i}"]`).addEventListener("click", async () => {
    try { if ((await x.onClick(readForm(form, fields))) !== false) close(); } catch (e) { err.textContent = e.message; }
  }));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    const missing = fields.find((f) => f.required && !f.section && !form.elements[f.name]?.value);
    if (missing) { err.textContent = `Preencha: ${missing.label}`; form.elements[missing.name].focus(); return; }
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try { await onSubmit(readForm(form, fields)); close(); } catch (e2) { err.textContent = e2.message; }
    finally { btn.disabled = false; }
  });
  dlg.showModal();
  form.querySelector("input:not([type=checkbox]),textarea,select")?.focus();
  return dlg;
}

/* janela só de leitura com ações */
export function infoDialog({ title, html, actions = [], wide = false }) {
  const dlg = document.createElement("dialog");
  dlg.className = `modal ${wide ? "wide" : ""}`;
  dlg.innerHTML = `<form method="dialog">
    <div class="modal-head"><h2>${esc(title)}</h2><button class="x" aria-label="Fechar" value="x">×</button></div>
    <div class="modal-body">${html}</div>
    <div class="modal-foot"><div style="display:flex;gap:.5rem;flex-wrap:wrap">${actions.map((a, i) =>
      a.href ? `<a class="btn ${a.cls || "btn-ghost"}" href="${esc(a.href)}" target="_blank" rel="noopener">${esc(a.label)}</a>`
      : `<button type="button" class="btn ${a.cls || "btn-ghost"}" data-a="${i}">${esc(a.label)}</button>`).join("")}</div>
      <div class="right"><button class="btn btn-ghost" value="x">Fechar</button></div></div></form>`;
  document.body.append(dlg);
  dlg.addEventListener("close", () => dlg.remove());
  actions.forEach((a, i) => dlg.querySelector(`[data-a="${i}"]`)?.addEventListener("click", async () => {
    try { if ((await a.onClick()) !== false) dlg.close(); } catch (e) { toast(e.message, "err"); }
  }));
  dlg.showModal();
  return dlg;
}

/* caches leves para selects */
let _courses, _students;
export async function coursesList(force = false) {
  if (!_courses || force) _courses = await api("/api/admin/courses");
  return _courses;
}
export async function studentsList(force = false) {
  if (!_students || force) _students = await api("/api/admin/students");
  return _students;
}
export const invalidate = () => { _courses = null; _students = null; };

export const changed = () => window.dispatchEvent(new Event("nt:changed"));

/* baixa um arquivo de rota autenticada */
export async function download(path, filename) {
  const res = await api(path, { raw: true });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(await res.blob()), download: filename });
  a.click();
  URL.revokeObjectURL(a.href);
}

/* envia uma imagem para uma rota de upload */
export function pickImage(path) {
  return new Promise((resolve, reject) => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/jpeg,image/png,image/webp" });
    input.onchange = async () => {
      if (!input.files[0]) return resolve(null);
      const fd = new FormData();
      fd.append("image", input.files[0]);
      try { resolve(await api(path, { method: "POST", body: fd })); } catch (e) { reject(e); }
    };
    input.click();
  });
}

export function emptyState(text, buttonLabel, onClick) {
  const id = `e${Math.random().toString(36).slice(2, 7)}`;
  setTimeout(() => document.getElementById(id)?.addEventListener("click", onClick));
  return `<div class="empty"><p>${esc(text)}</p>${buttonLabel ? `<button class="btn" id="${id}">${esc(buttonLabel)}</button>` : ""}</div>`;
}

/* data e hora escolhidas pela usuária (sem fuso: hora local) */
export const localDateTimeBR = (iso) => iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
