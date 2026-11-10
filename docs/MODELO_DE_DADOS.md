# Modelo de dados

15 tabelas, definidas em `backend/app/models.py` e criadas automaticamente na primeira execução.

```mermaid
erDiagram
    courses ||--o{ course_classes : "tem turmas"
    courses ||--o{ enrollments : "recebe"
    course_classes ||--o{ enrollments : "ocupa vaga"
    students ||--o{ enrollments : "faz"
    students ||--o{ finance_entries : "paga"
    students ||--o{ mentoring_requests : "vira aluna"
    enrollments ||--o| finance_entries : "gera receita"
    mentoring_requests ||--o| finance_entries : "gera receita"
    users ||--o{ audit_logs : "registra"

    courses {
        int id PK
        string title
        string slug UK
        string tagline
        text description
        text audience
        text outcomes
        text syllabus
        string format
        int workload_hours
        float price "nulo = sob consulta"
        bool featured
        bool active
    }
    course_classes {
        int id PK
        int course_id FK
        string name
        date start_date
        date end_date
        string schedule
        string location
        string online_link "só no painel"
        int seats
        float price "sobrescreve o do curso"
        string status
    }
    students {
        int id PK
        string name
        string email
        string phone
        string city
        string company
    }
    enrollments {
        int id PK
        int student_id FK
        int course_id FK
        int class_id FK
        string status
        float amount
        bool paid
        date paid_on
        string certificate_code UK
        date completed_on
    }
    mentoring_requests {
        int id PK
        string name
        string kind "individual | equipe"
        int team_size
        text goal
        string status
        datetime scheduled_at
        float price
        int student_id FK
    }
    leads {
        int id PK
        string name
        string phone
        string interest
        bool contacted
    }
    posts {
        int id PK
        string title
        string slug UK
        text body
        bool published
        date published_on
    }
    finance_entries {
        int id PK
        string kind
        string category
        float amount
        date date
        int enrollment_id FK
        int mentoring_id FK
        int student_id FK
    }
    das_payments {
        int year
        int month
        float amount
        bool paid
    }
    users {
        int id PK
        string email UK
        string password_hash
    }
    audit_logs {
        int id PK
        int user_id FK
        string action
        string entity
    }
```

Também existem `settings` (configurações em JSON), `testimonials` e `contact_messages`.

## Regras de negócio

| Regra | Onde |
|---|---|
| Vagas = `seats` − inscrições não canceladas da turma; turma lotada recusa inscrição (409) | `public.enroll`, `courses.update_class` |
| Curso com turmas abertas exige escolher a turma; turma encerrada não aceita inscrição | `public.enroll` |
| Mesmo e-mail não se inscreve duas vezes na mesma turma | `public.enroll` |
| Aluno é identificado pelo e-mail; inscrições novas reaproveitam o cadastro | `public.enroll` |
| Preço da inscrição = preço da turma, se houver; senão, o do curso | `public.enroll` |
| Registrar pagamento confirma a inscrição e cria **uma** receita vinculada | `academy.register_payment` |
| Encerrar turma conclui as inscrições confirmadas e gera códigos únicos de certificado | `academy.complete_class` |
| Certificado só valida para inscrição concluída | `public.verify_certificate` |
| Mentoria agendada vira aluna automaticamente; cada mentoria gera no máximo uma receita | `academy.update_mentoring`, `bill_mentoring` |
| Curso/turma com inscrições não pode ser excluído (desative ou cancele) | `courses` |
| Limite do MEI proporcional no ano de abertura; alertas em 80% e 100% | `finance.mei_status` |
| Chave Pix nunca sai na rota pública de configurações; só aparece após a inscrição | `site_settings.get_public` |
