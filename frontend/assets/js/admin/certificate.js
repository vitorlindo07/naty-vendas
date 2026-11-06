/* Certificado de conclusão em página própria, pronto para imprimir ou salvar em PDF. */
import { esc } from "./core.js";

const longDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

export function printCertificates(list) {
  const w = window.open("", "_blank");
  const pages = list.map((e) => `
    <section class="cert">
      <div class="inner">
        <p class="top">Certificado de conclusão</p>
        <p>Certificamos que</p>
        <h1>${esc(e.student.name)}</h1>
        <p>concluiu o curso <strong>${esc(e.course.title)}</strong>${e.course_class ? `, ${esc(e.course_class.name)},` : ""}
           com carga horária de <strong>${e.course.workload_hours} horas</strong>, em ${longDate(e.completed_on)}.</p>
        <div class="sign"><span></span>Natalice Alves da Silva<br><small>Instrutora</small></div>
        <p class="code">Código de validação <b>${esc(e.certificate_code)}</b> · confira em ${esc(location.origin)}/certificado?c=${esc(e.certificate_code)}</p>
      </div>
    </section>`).join("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Certificado${list.length > 1 ? "s" : ""}</title>
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" rel="stylesheet">
    <style>
      @page { size: A4 landscape; margin: 0; }
      body { margin: 0; font-family: "Bricolage Grotesque", Arial, sans-serif; color: #2b1245; }
      .cert { width: 297mm; height: 210mm; box-sizing: border-box; padding: 14mm; page-break-after: always; background: #fff; }
      .inner { height: 100%; box-sizing: border-box; border: 3px solid #2b1245; border-radius: 10mm; padding: 18mm 24mm;
               display: flex; flex-direction: column; justify-content: center; text-align: center; position: relative;
               background: linear-gradient(135deg, #fff 0 70%, #fde3ec 70%); }
      .top { font-weight: 800; color: #e0306f; font-size: 15pt; letter-spacing: .02em; margin: 0 0 8mm; }
      h1 { font-size: 40pt; margin: 3mm 0 6mm; letter-spacing: -.02em; }
      p { font-size: 14pt; line-height: 1.5; margin: 0 auto; max-width: 200mm; }
      .sign { margin: 16mm auto 0; font-size: 12pt; }
      .sign span { display: block; width: 80mm; border-top: 1.5px solid #2b1245; margin: 0 auto 2mm; }
      .code { position: absolute; bottom: 9mm; left: 0; right: 0; font-size: 9.5pt; color: #66557a; }
      @media screen { body { background: #ddd; } .cert { margin: 10px auto; box-shadow: 0 4px 20px rgba(0,0,0,.15); } }
    </style></head><body>${pages}<script>document.fonts.ready.then(() => setTimeout(() => print(), 300));<\/script></body></html>`);
  w.document.close();
}
