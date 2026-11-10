"""Dados iniciais.

    python -m app.seed           -> administradora, cursos e dicas em rascunho (idempotente)
    python -m app.seed --demo    -> também cria turmas, alunos e lançamentos FICTÍCIOS para demonstração
                                    (não use --demo no site de produção)
"""
import sys
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from .config import settings
from .database import Base, SessionLocal, engine
from .models import (Course, CourseClass, DasPayment, Enrollment, FinanceEntry, Lead, MentoringRequest, Post,
                     Student, Testimonial, User)
from .security import hash_password
from .site_settings import slugify

COURSES = [
    dict(
        title="Vendas do Zero", format="online_ao_vivo", workload_hours=8, featured=True,
        tagline="Para quem nunca vendeu ou sente vergonha de abordar o cliente.",
        description=("Um curso prático para perder o medo da primeira conversa e entender o caminho de uma venda, "
                     "do primeiro “oi” até o “pode embrulhar”. Em quatro encontros ao vivo, com exercícios entre um "
                     "encontro e outro."),
        audience="Quem quer começar a vender por conta própria\nQuem acabou de entrar no comércio\nQuem trava na hora de oferecer",
        outcomes=("Abordar o cliente sem parecer insistente\nFazer perguntas que descobrem o que a pessoa precisa\n"
                  "Apresentar o produto pelo benefício, não pela característica\nPedir a venda com naturalidade"),
        syllabus=("Encontro 1: o que é vender e por que dá medo\nEncontro 2: abordagem e perguntas certas\n"
                  "Encontro 3: apresentação e as objeções mais comuns\nEncontro 4: fechamento e pós-venda"),
    ),
    dict(
        title="Vendas pelo WhatsApp e Instagram", format="online_ao_vivo", workload_hours=6, featured=True,
        tagline="Transforme conversa de direct e WhatsApp em pedido fechado.",
        description=("Para quem vende pelo celular e sente que as pessoas perguntam o preço e somem. Você sai com "
                     "roteiros de mensagem, organização de contatos e uma rotina simples de acompanhamento."),
        audience="Autônomas e revendedoras\nLojas que atendem pelo WhatsApp\nQuem vende pelo Instagram",
        outcomes=("Responder “quanto custa?” sem perder o cliente\nRoteiros prontos de mensagem\n"
                  "Organizar etiquetas e listas no WhatsApp Business\nRetomar quem sumiu sem ser insistente"),
        syllabus=("Módulo 1: perfil e primeira impressão\nMódulo 2: roteiros de atendimento\n"
                  "Módulo 3: preço, objeção e fechamento por mensagem"),
    ),
    dict(
        title="Atendimento que Vende", format="presencial", workload_hours=8,
        tagline="Treinamento para equipes de loja, supermercado e balcão.",
        description=("Treinamento presencial para a equipe inteira, feito na sua loja ou em sala. Simulações com "
                     "situações reais do seu ponto de venda e um combinado de atendimento para todos seguirem."),
        audience="Lojas de varejo\nSupermercados e farmácias\nEquipes de balcão e caixa",
        outcomes=("Padrão de atendimento para a equipe\nVenda adicional sem forçar\nComo lidar com cliente difícil\n"
                  "Organização do ponto de venda que ajuda a vender"),
        syllabus=("Parte 1: o cliente que entra na loja\nParte 2: simulações de abordagem e venda adicional\n"
                  "Parte 3: reclamações, trocas e cliente difícil\nParte 4: combinado de atendimento da equipe"),
    ),
    dict(
        title="Fechamento e Objeções", format="online_ao_vivo", workload_hours=4,
        tagline="Para quem já vende e quer parar de ouvir “vou pensar”.",
        description="Aula intensiva sobre os momentos em que a venda escapa, com roteiros para cada objeção comum.",
        audience="Vendedoras e vendedores com experiência\nRepresentantes comerciais",
        outcomes="Identificar a objeção verdadeira\nResponder preço, prazo e “vou pensar”\nTécnicas de fechamento",
        syllabus="Parte 1: por que o cliente adia\nParte 2: as seis objeções mais comuns\nParte 3: simulações de fechamento",
    ),
]

POSTS = [
    ("Três perguntas para fazer antes de falar o preço",
     "Quem pergunta antes de oferecer vende mais e dá menos desconto.",
     "Quando o cliente pergunta o preço logo de cara, a vontade é responder na hora. Só que, sem contexto, "
     "o preço sozinho parece caro.\n\n## Antes do preço, pergunte\n- Para quem é? (para você, para presente, para a família)\n"
     "- Para quando você precisa?\n- O que é mais importante: durar mais, ser prático ou caber no orçamento?\n\n"
     "Com essas respostas, você apresenta a opção certa e fala o preço junto com o motivo de valer a pena."),
    ("Como retomar o cliente que sumiu no WhatsApp",
     "Uma mensagem curta, com motivo, funciona melhor do que “e aí, vai querer?”.",
     "O cliente pediu orçamento e não respondeu mais. Normal: ele se distraiu, não decidiu ou ficou com uma dúvida.\n\n"
     "## Mande uma mensagem com motivo\nEm vez de cobrar a resposta, traga uma informação nova: chegou a cor que ele queria, "
     "a condição muda na sexta ou uma dúvida comum que você pode esclarecer.\n\n## Combine o próximo passo\n"
     "Termine com uma pergunta simples de responder, como “prefere que eu separe para você ou te mando as fotos primeiro?”."),
    ("“Vou pensar”: o que o cliente quer dizer",
     "Na maioria das vezes, “vou pensar” é uma dúvida que ele não falou.",
     "“Vou pensar” raramente é só tempo. Costuma ser preço, insegurança ou uma pessoa que precisa aprovar.\n\n"
     "## Pergunte com respeito\n“Claro! Para eu te ajudar a pensar: ficou alguma dúvida sobre o produto ou é mais sobre o valor?”\n\n"
     "A resposta mostra o que falta para a decisão, e você pode resolver ali mesmo."),
]

# Dicas inspiradas no treinamento de atendimento do varejo. Entram publicadas e são criadas
# automaticamente quando o servidor liga, mesmo em um banco que já existe (procura pelo endereço da dica).
NEW_POSTS = [
    ("Preço é o que está na etiqueta. Valor é o que o cliente leva para casa",
     "Quando o cliente diz que achou caro, ele está olhando só para o número. Mostre o resto.",
     "O preço é só um número. Sozinho, ele não diz se a compra vale a pena. Quem decide isso é o valor: "
     "o que o produto representa na vida do cliente.\n\n"
     "## Atributos de valor para usar na conversa\n- Durabilidade: quanto tempo ele vai durar\n"
     "- Frequência de uso: quantas vezes por semana ele vai usar\n- Conforto e modelagem: como ele se sente usando\n"
     "- Versatilidade: em quantas situações ele serve\n- Tecnologia: o que tem de diferente por dentro\n\n"
     "## Faça a conta com o cliente\nUm produto de R$ 200 usado três vezes por semana durante um ano sai por cerca "
     "de R$ 1,30 a cada uso. Dito assim, o preço deixa de ser o assunto principal.\n\n"
     "## Cuidado com o bloqueio do preço alto\nMuitas vezes quem acha caro é o vendedor, não o cliente. "
     "Não decida pelo cliente o que ele pode ou não pode pagar: apresente a melhor opção para a necessidade dele."),
    ("Não é “ou”, é “e”: como oferecer mais sem medo de perder a venda",
     "O cliente não precisa escolher entre um produto e outro. Ele pode levar os dois.",
     "Um dos maiores medos de quem vende é arriscar a venda pequena tentando a grande. "
     "“Prefiro garantir o básico do que oferecer algo mais caro e perder tudo.”\n\n"
     "## A venda não diminui\nQuando você oferece um segundo produto, o cliente não troca um pelo outro. "
     "Ele soma. O primeiro item já está garantido; o segundo é uma oportunidade a mais.\n\n"
     "## Como oferecer sem parecer insistente\n- Ligue a oferta a algo que o cliente contou\n"
     "- Mostre, não só fale: coloque o produto na mão dele\n- Aceite o “não” com naturalidade e siga o atendimento\n\n"
     "Oferta sem contexto é empurrar produto. Oferta ligada à necessidade é atendimento."),
    ("Frases de transição: da resposta do cliente à próxima oferta",
     "Transição não é trocar de assunto. É aprofundar a necessidade que o cliente já contou.",
     "Uma boa frase de transição faz a ponte entre o produto que o cliente veio buscar e outro que ele ainda não pensou "
     "em levar. Ela precisa soar natural, partir da necessidade e levar o cliente a experimentar.\n\n"
     "## O que o cliente diz revela o que ele precisa\n- “Comecei a treinar” → roupas e acessórios para treino\n"
     "- “Vou viajar para a praia” → moda praia e itens práticos para a mala\n- “É para presente” → embalagem e um item complementar\n"
     "- “Não gosto de nada que aperta” → modelos mais leves e linhas de conforto\n\n"
     "## Exemplos de frases\n- “Já que você comentou que vai viajar, deixa eu te mostrar uma peça que cabe em qualquer mala.”\n"
     "- “Como você vai usar todo dia, vale levar uma segunda opção para revezar.”\n"
     "- “Para combinar com isso que você escolheu, olha este aqui.”\n\n"
     "Treine uma frase por dia. Em pouco tempo, ela sai sem esforço."),
    ("Seis motivos que travam o vendedor na hora de oferecer mais",
     "Antes de cobrar resultado, entenda o que impede a equipe de oferecer.",
     "Quando as vendas adicionais não acontecem, quase nunca é falta de vontade. Normalmente é uma destas travas.\n\n"
     "## 1. Medo de perder o que já vendeu\nO vendedor prefere garantir o item barato a arriscar o caro.\n\n"
     "## 2. Rotatividade\nEquipe que muda muito recomeça o aprendizado. Alguém precisa ser a memória do padrão de atendimento.\n\n"
     "## 3. Bloqueio do preço alto\nO vendedor acha caro e projeta isso no cliente.\n\n"
     "## 4. Pouco repertório\n“Lindo, maravilhoso, adoro essa cor” não convence. É preciso ampliar o vocabulário de venda.\n\n"
     "## 5. Falta de ambição\nNem todo mundo enxerga que pode ir além da meta mínima.\n\n"
     "## 6. Zona de conforto\nO hábito de vender só o que sempre vendeu é cultural, e cultura se muda com treino diário.\n\n"
     "Não existe resultado novo com comportamento repetido. Escolha uma trava e trabalhe nela esta semana."),
    ("Checklist: 18 pontos de um atendimento que vende",
     "Do sorriso na entrada à despedida na porta: confira o que não pode faltar.",
     "Um bom atendimento não depende de sorte. Ele segue um caminho, e cada etapa tem detalhes que fazem diferença no resultado.\n\n"
     "## As cinco etapas\n- Antes de atender: aparência, meta do dia e conhecimento dos produtos\n"
     "- Acolher: sorriso, apresentação pelo nome e uma pergunta leve para quebrar o gelo\n"
     "- Entender: perguntas abertas para descobrir para que, para quem e para quando\n"
     "- Apresentar e experimentar: benefícios, convite para provar e pelo menos seis opções\n"
     "- Fechar e fidelizar: contornar objeções, oferecer complemento, deixar o cliente decidir e acompanhá-lo até a porta\n\n"
     "## Faça a sua avaliação\nO checklist completo e interativo está na página Treino de vendas, aqui no site. "
     "Marque o que você fez no último atendimento e veja onde estão as vendas que escapam."),
]


def ensure_posts(db: Session) -> None:
    """Cria as dicas novas que ainda não existem no banco (seguro para rodar sempre)."""
    today = date.today()
    existing = {slug for (slug,) in db.query(Post.slug).all()}
    for i, (title, excerpt, body) in enumerate(NEW_POSTS):
        slug = slugify(title)
        if slug not in existing:
            db.add(Post(title=title, slug=slug, excerpt=excerpt, body=body, published=True,
                        published_on=today - timedelta(days=len(NEW_POSTS) - i)))


def seed_base(db: Session) -> None:
    if not db.query(User).first():
        db.add(User(name=settings.ADMIN_NAME, email=settings.ADMIN_EMAIL.lower(),
                    password_hash=hash_password(settings.ADMIN_PASSWORD)))
    if not db.query(Course).first():
        for i, c in enumerate(COURSES):
            db.add(Course(**c, slug=slugify(c["title"]), position=i, price=None))
    if not db.query(Post).first():
        for title, excerpt, body in POSTS:
            db.add(Post(title=title, slug=slugify(title), excerpt=excerpt, body=body, published=False))
    ensure_posts(db)
    db.commit()


def seed_demo(db: Session) -> None:
    """Dados fictícios para demonstrar o sistema. Nomes de pessoas são inventados."""
    if db.query(Student).first():
        print("Já existem alunos; demo ignorada.")
        return
    today = date.today()
    courses = {c.slug: c for c in db.query(Course).all()}
    prices = {"vendas-do-zero": 297, "vendas-pelo-whatsapp-e-instagram": 197, "atendimento-que-vende": None,
              "fechamento-e-objecoes": 147}
    for slug, price in prices.items():
        courses[slug].price = price
    courses["vendas-do-zero"].price_note = "ou 3x de R$ 99 no cartão"
    for p in db.query(Post).filter(Post.published.is_(False)):
        p.published, p.published_on = True, today - timedelta(days=p.id * 9)

    k1 = CourseClass(course_id=courses["vendas-do-zero"].id, name="Turma de sábado",
                     start_date=today + timedelta(days=12), end_date=today + timedelta(days=33),
                     schedule="Sábados, das 9h às 11h", location="Online, ao vivo pelo Google Meet", seats=12)
    k2 = CourseClass(course_id=courses["vendas-pelo-whatsapp-e-instagram"].id, name="Turma da noite",
                     start_date=today + timedelta(days=5), schedule="Terça e quinta, das 19h30 às 21h30",
                     location="Online, ao vivo", seats=15)
    k0 = CourseClass(course_id=courses["fechamento-e-objecoes"].id, name="Turma intensiva",
                     start_date=today - timedelta(days=20), schedule="Quarta, das 19h às 23h",
                     location="Online, ao vivo", seats=10, status="encerrada")
    db.add_all([k0, k1, k2])
    db.flush()

    people = [("Juliana Prado", "Valinhos", "Revendedora"), ("Marcos Lima", "Campinas", "Loja de calçados"),
              ("Renata Souza", "Vinhedo", ""), ("Carla Mendes", "Campinas", "Autônoma"),
              ("Bruno Alves", "Sumaré", "Representante")]
    students = []
    for i, (name, city, company) in enumerate(people):
        s = Student(name=f"{name} (exemplo)", email=f"aluno{i}@exemplo.com", phone=f"(19) 90000-00{i:02d}",
                    city=city, company=company)
        db.add(s)
        students.append(s)
    db.flush()

    def enroll(s, k, status, paid):
        c = db.get(Course, k.course_id)
        e = Enrollment(student_id=s.id, course_id=c.id, class_id=k.id, status=status, amount=c.price or 0,
                       consent=True, paid=paid, paid_on=today - timedelta(days=3) if paid else None,
                       payment_method="Pix" if paid else "")
        if status == "concluida":
            e.completed_on, e.certificate_code = k.start_date, f"DEMO{s.id:04d}"
        db.add(e)
        db.flush()
        if paid:
            db.add(FinanceEntry(kind="receita", description=f"{c.title} – {s.name}", category="Cursos",
                                amount=e.amount, date=e.paid_on, payment_method="Pix", enrollment_id=e.id,
                                student_id=s.id))

    enroll(students[0], k0, "concluida", True)
    enroll(students[1], k0, "concluida", True)
    enroll(students[0], k1, "confirmada", True)
    enroll(students[2], k1, "pendente", False)
    enroll(students[3], k2, "confirmada", True)
    enroll(students[4], k2, "pendente", False)

    db.add_all([
        MentoringRequest(name="Patrícia Gomes (exemplo)", email="patricia@exemplo.com", phone="(19) 90000-0100",
                         kind="individual", goal="Vendo semijoias e quero fechar mais pelo Instagram.",
                         preferred_times="Noites de semana", consent=True),
        MentoringRequest(name="Loja Bela Casa (exemplo)", email="contato@exemplo.com", phone="(19) 90000-0101",
                         kind="equipe", team_size=6, goal="Treinar equipe para o fim de ano.",
                         status="agendado", scheduled_at=datetime.combine(today + timedelta(days=4), datetime.min.time()).replace(hour=14),
                         price=900, consent=True),
        Lead(name="Sandra (exemplo)", phone="(19) 90000-0200", interest="Vendas pelo WhatsApp", consent=True),
        Lead(name="Rafael (exemplo)", phone="(19) 90000-0201", interest="Vendas do Zero", consent=True),
        FinanceEntry(kind="despesa", description="Assinatura de videoconferência", category="Ferramentas",
                     amount=49.9, date=today - timedelta(days=8)),
        FinanceEntry(kind="despesa", description="Impressão de apostilas", category="Material",
                     amount=86.0, date=today - timedelta(days=22)),
        Testimonial(author="Juliana (exemplo)", role="Aluna do Vendas do Zero", rating=5, approved=False,
                    text="Exemplo de depoimento para testar a moderação no painel."),
    ])
    for m in range(1, today.month):
        db.add(DasPayment(year=today.year, month=m, amount=86.05, paid=True, paid_on=date(today.year, m, 18)))
    db.commit()
    print("Dados de demonstração criados.")


def main() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_base(db)
        if "--demo" in sys.argv:
            seed_demo(db)
    print(f"Pronto. Login do painel: {settings.ADMIN_EMAIL}")


if __name__ == "__main__":
    main()
