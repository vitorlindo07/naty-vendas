import { api, dateBR, esc, localDateTimeBR, money, MONTHS } from "./core.js";

export function meiMeter(m) {
  const width = Math.min(m.percent / 1.2, 100); // a barra vai até 120% (faixa de tolerância)
  return `
    <div class="meter ${m.level}" role="meter" aria-valuemin="0" aria-valuemax="${m.limit}" aria-valuenow="${m.revenue}" aria-label="Faturamento do MEI em ${m.year}">
      <div class="fill" style="width:${width}%"></div>
      <span class="mark" style="left:${80 / 1.2}%"><span>80%</span></span>
      <span class="mark" style="left:${100 / 1.2}%"><span>limite</span></span>
    </div>
    <div class="meter-legend"><span><strong>${money(m.revenue)}</strong> de ${money(m.limit)} (${m.percent}%)</span>
      <span class="muted">${m.remaining >= 0 ? `Faltam ${money(m.remaining)}` : `Passou ${money(-m.remaining)}`}</span></div>
    <p class="small muted" style="margin:.6rem 0 0">${esc(m.message)}
      ${m.proportional ? ` Limite proporcional: ${m.active_months} meses de atividade em ${m.year}.` : ""}
      ${m.monthly_room ? ` Média disponível por mês até dezembro: ${money(m.monthly_room)}.` : ""}</p>`;
}

export async function dashboard(view) {
  const d = await api("/api/admin/dashboard");
  const now = new Date();
  const alerts = [
    !d.das_due.paid && now.getDate() >= 10 &&
      `<div class="alert warn"><span>O DAS de ${MONTHS[d.das_due.month - 1]} vence dia 20 e ainda não foi marcado como pago.</span><a class="btn btn-sm" href="#/financeiro">Ver DAS</a></div>`,
    now.getMonth() <= 4 &&
      `<div class="alert info"><span>A declaração anual do MEI (DASN-SIMEI) de ${now.getFullYear() - 1} vai até 31 de maio.</span><a class="btn btn-sm btn-ghost" href="#/financeiro">Ver faturamento</a></div>`,
    (d.unread_messages || d.pending_testimonials) &&
      `<div class="alert info"><span>${[d.unread_messages && `<a href="#/mensagens">${d.unread_messages} mensagem(ns) não lida(s)</a>`,
        d.pending_testimonials && `<a href="#/depoimentos">${d.pending_testimonials} depoimento(s) para revisar</a>`].filter(Boolean).join(" · ")}</span></div>`,
  ].filter(Boolean).join("");

  view.innerHTML = `
    <div class="view-head"><h1>Visão geral</h1>
      <div class="toolbar"><a class="btn btn-ghost" href="#/turmas/nova">Abrir turma</a><a class="btn" href="#/inscricoes">Ver inscrições</a></div></div>
    ${alerts}
    <div class="kpis">
      <div class="kpi"><div class="v">${d.pending_count}</div><div class="l">inscrições aguardando pagamento</div></div>
      <div class="kpi"><div class="v">${money(d.month_revenue)}</div><div class="l">recebido em ${MONTHS[now.getMonth()]}</div></div>
      <div class="kpi"><div class="v">${d.students_year}</div><div class="l">alunos em ${now.getFullYear()}</div></div>
      <div class="kpi"><div class="v">${d.new_leads}</div><div class="l">interessados para chamar</div></div>
    </div>
    <div class="grid grid-2">
      <section class="panel"><h2>Próximas turmas</h2>
        ${d.upcoming_classes.length ? `<ul class="list">${d.upcoming_classes.map((k) => `
          <li><span><a href="#/turmas/${k.id}"><strong>${esc(k.course)}</strong></a> · ${esc(k.name)}<br>
            <span class="small muted">Começa ${dateBR(k.start_date)} · ${esc(k.schedule)}</span></span>
            <span class="small" style="text-align:right">${k.enrolled}/${k.seats} vagas<div class="occupancy"><span style="width:${Math.min(k.enrolled / k.seats * 100, 100)}%"></span></div></span></li>`).join("")}</ul>`
          : `<p class="muted">Nenhuma turma aberta. Abra uma turma para receber inscrições pelo site.</p><a class="btn btn-sm" href="#/turmas/nova">Abrir turma</a>`}
      </section>
      <section class="panel"><h2>Aguardando pagamento</h2>
        ${d.pending_enrollments.length ? `<ul class="list">${d.pending_enrollments.map((e) => `
          <li><span><a href="#/inscricoes/${e.id}"><strong>${esc(e.student.name)}</strong></a><br>
            <span class="small muted">${esc(e.course.title)} · inscrita em ${dateBR(e.created_at)}</span></span><strong>${money(e.amount)}</strong></li>`).join("")}</ul>`
          : `<p class="muted">Nenhuma inscrição pendente.</p>`}
      </section>
    </div>
    <div class="grid grid-2" style="margin-top:1rem">
      <section class="panel"><h2>Mentorias</h2>
        ${d.mentoring.length ? `<ul class="list">${d.mentoring.map((m) => `
          <li><span><a href="#/mentorias/${m.id}"><strong>${esc(m.name)}</strong></a><br>
            <span class="small muted">${m.kind === "equipe" ? `Equipe de ${m.team_size || "?"} pessoas` : "Individual"}</span></span>
            <span class="small">${m.scheduled_at ? localDateTimeBR(m.scheduled_at) : '<span class="pill s-novo">Novo pedido</span>'}</span></li>`).join("")}</ul>`
          : `<p class="muted">Nenhum pedido em aberto.</p>`}
      </section>
      <section class="panel"><h2>Limite do MEI em ${d.mei.year}</h2>${meiMeter(d.mei)}</section>
    </div>`;
}
