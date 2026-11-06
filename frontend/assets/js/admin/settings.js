import { api, dateTimeBR, esc, toast } from "./core.js";

const GROUPS = [
  ["Textos do site", [
    ["business_name", "Nome exibido"], ["business_subtitle", "Subtítulo"],
    ["headline", "Frase principal da página inicial", "textarea"], ["intro", "Texto de apresentação", "textarea"],
    ["mentoring_text", "Texto da mentoria", "textarea"],
    ["about", "Texto da página Sobre (separe parágrafos com uma linha em branco)", "textarea"]]],
  ["Pagamento", [
    ["pix_key", "Chave PIX (aparece para o aluno depois da inscrição)"], ["pix_name", "Nome do recebedor do PIX"]]],
  ["Contato", [
    ["whatsapp", "WhatsApp (com DDD)"], ["phone", "Telefone"], ["email", "E-mail"], ["instagram", "Instagram (@usuario)"],
    ["region", "Região atendida"]]],
  ["Dados da empresa (MEI)", [
    ["legal_name", "Razão social"], ["cnpj", "CNPJ"], ["cnae", "Atividade (CNAE)"],
    ["opened_on", "Data de abertura do MEI", "date"], ["das_default", "Valor padrão do DAS (R$)", "number"]]],
];

export async function settingsView(view) {
  const [s, log] = await Promise.all([api("/api/admin/settings"), api("/api/admin/audit?limit=30")]);
  const limits = s.mei_limits || {};
  view.innerHTML = `
    <div class="view-head"><h1>Configurações</h1></div>
    <form class="panel" data-settings>
      ${GROUPS.map(([title, fields]) => `<h2 style="margin-top:.4rem">${title}</h2><div class="form-grid" style="margin-bottom:1.2rem">
        ${fields.map(([k, label, type]) => `<div class="f ${type === "textarea" ? "full" : ""}"><label for="s-${k}">${label}</label>
          ${type === "textarea" ? `<textarea class="input" id="s-${k}" name="${k}" rows="${k === "about" ? 6 : 2}">${esc(s[k])}</textarea>`
            : `<input class="input" id="s-${k}" name="${k}" type="${type || "text"}" ${type === "number" ? 'step="0.01"' : ""} value="${esc(s[k])}">`}</div>`).join("")}
      </div>`).join("")}
      <h2>Limite anual do MEI</h2>
      <p class="small muted">Use os valores vigentes de cada ano. Em 2026 o limite é R$ 81.000; a LC 238/2026 prevê R$ 110.000 em 2027, condicionado ao orçamento. Confira antes de usar.</p>
      <div class="form-grid" data-limits style="margin-bottom:1.2rem">
        ${Object.entries(limits).sort().map(([y, v]) => `<div class="f"><label for="l-${y}">${y}</label>
          <input class="input" type="number" id="l-${y}" data-year="${y}" value="${v}" step="0.01"></div>`).join("")}
        <div class="f"><label for="l-new">Adicionar ano</label><input class="input" type="number" id="l-new" placeholder="${new Date().getFullYear() + 2}"></div>
      </div>
      <button class="btn" type="submit">Salvar configurações</button>
    </form>

    <div class="grid grid-2" style="margin-top:1rem">
      <form class="panel" data-pass>
        <h2>Trocar senha</h2>
        <div class="f"><label for="p-cur">Senha atual</label><input class="input" type="password" id="p-cur" name="current_password" autocomplete="current-password" required></div>
        <div class="f" style="margin-top:.7rem"><label for="p-new">Nova senha</label><input class="input" type="password" id="p-new" name="new_password" minlength="8" autocomplete="new-password" required>
          <span class="hint">Pelo menos 8 caracteres.</span></div>
        <button class="btn" type="submit" style="margin-top:1rem">Trocar senha</button>
      </form>
      <section class="panel"><h2>Histórico de atividades</h2>
        <ul class="list small">${log.map((l) => `<li><span><strong>${esc(l.user)}</strong> ${esc(l.action)} ${esc(l.entity)}${l.entity_id ? ` #${l.entity_id}` : ""}
          <br><span class="muted">${esc(l.summary)}</span></span><span class="muted">${dateTimeBR(l.when)}</span></li>`).join("")
          || '<li class="muted">Sem atividades.</li>'}</ul></section>
    </div>`;

  view.querySelector("[data-settings]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = {};
    GROUPS.flatMap(([, fs]) => fs).forEach(([k, , type]) => { body[k] = type === "number" ? Number(f.elements[k].value) : f.elements[k].value; });
    const mei = {};
    f.querySelectorAll("[data-year]").forEach((i) => { if (i.value) mei[i.dataset.year] = Number(i.value); });
    const ny = f.querySelector("#l-new").value;
    if (ny) mei[ny] = Number(mei[ny] || 81000);
    body.mei_limits = mei;
    try { await api("/api/admin/settings", { method: "PUT", body }); toast("Configurações salvas."); if (ny) settingsView(view); }
    catch (err) { toast(err.message, "err"); }
  });
  view.querySelector("[data-pass]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await api("/api/auth/password", { method: "POST", body: { current_password: f.current_password.value, new_password: f.new_password.value } });
      f.reset(); toast("Senha alterada.");
    } catch (err) { toast(err.message, "err"); }
  });
}
