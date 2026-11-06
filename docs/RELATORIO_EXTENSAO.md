# Relatório de Projeto de Extensão

> **Como usar este modelo:** os campos entre colchetes `[ ]` precisam ser preenchidos com os seus dados reais.
> A distribuição de horas abaixo é a planejada; ajuste cada linha às horas que você de fato registrar no diário
> de atividades, porque a coordenação pode pedir evidências (fotos, prints, atas, commits). Confira também o
> modelo oficial e as regras de horas do seu curso no AVA da UNIP.

## 1. Identificação

| | |
|---|---|
| Instituição | Universidade Paulista – UNIP |
| Curso | Análise e Desenvolvimento de Sistemas |
| Aluno | Erik [sobrenome] — RA [número] |
| Orientador(a) | [nome] |
| Título | Plataforma de cursos, inscrições e gestão para microempreendedora instrutora de vendas |
| Carga horária | 252 horas |
| Período | [data de início] a [data de término] |
| Beneficiária | Natalice Alves da Silva (Naty Alves) — MEI, CNPJ 59.794.471/0001-61 |
| Local | [cidade] – SP |

## 2. Contexto e problema

A beneficiária é microempreendedora individual, com experiência prática em vendas, e passou a oferecer
cursos e mentorias para pessoas que querem aprender a vender: iniciantes, vendedoras de loja e autônomas
que vendem pelo WhatsApp e pelo Instagram.

No diagnóstico inicial foram identificados os seguintes problemas:

1. **Sem vitrine própria.** A divulgação dependia do Instagram (@naty2naty) e de conversas no WhatsApp,
   sem um lugar com a lista de cursos, o conteúdo, as datas e os preços.
2. **Inscrições manuais.** Cada interessado precisava perguntar datas, vagas e forma de pagamento; o
   controle de quem pagou e de quantas vagas restavam era feito de memória ou em anotações.
3. **Sem certificado padronizado** nem forma de um empregador conferir se o certificado é verdadeiro.
4. **Contatos de interessados se perdiam** entre conversas, sem uma lista para avisar sobre novas turmas.
5. **Risco fiscal do MEI**: falta de acompanhamento do faturamento contra o limite anual e do DAS mensal.

## 3. Objetivos

**Geral:** desenvolver e implantar uma plataforma web completa — site, inscrições online e painel de
gestão — que aumente a captação de alunos e organize a rotina administrativa e fiscal da beneficiária.

**Específicos:**
- Publicar um site responsivo com cursos, turmas, mentoria, dicas e depoimentos;
- Permitir inscrição online com controle automático de vagas e instruções de pagamento por PIX;
- Centralizar alunos, inscrições, pagamentos, mentorias e interessados em um painel;
- Emitir certificados de conclusão com código de validação público;
- Controlar receitas, despesas, o limite de faturamento do MEI e o DAS;
- Capacitar a beneficiária para usar o sistema com autonomia, seguindo a LGPD.

## 4. Público beneficiado e relevância social

Beneficiária direta: a microempreendedora. Beneficiários indiretos: alunos e alunas dos cursos e as
equipes de lojas atendidas.

O projeto também alcança os alunos da beneficiária, que passam a ter acesso facilitado a cursos de
qualificação com certificado verificável.

O projeto contribui com os Objetivos de Desenvolvimento Sustentável da ONU, especialmente o **ODS 4**
(educação de qualidade), o **ODS 8**
(trabalho decente e crescimento econômico), ao fortalecer um pequeno negócio formalizado e ao ampliar
o acesso a qualificação profissional em vendas, e o **ODS 9** (indústria, inovação e infraestrutura), pela inclusão digital de uma
microempreendedora.

## 5. Metodologia

Desenvolvimento iterativo em ciclos curtos, com validação pela beneficiária ao fim de cada etapa:

1. Entrevistas e acompanhamento de uma ação real para entender o trabalho em campo;
2. Levantamento de requisitos em histórias de usuário e priorização;
3. Prototipação da interface e validação com a beneficiária;
4. Modelagem do banco de dados;
5. Implementação do back-end (API) e do front-end (site e painel);
6. Testes automatizados e testes de usabilidade com a beneficiária;
7. Implantação em servidor com HTTPS e backup;
8. Capacitação e entrega do manual de uso.

### Tecnologias
Python 3 e FastAPI (API REST), SQLAlchemy e SQLite (banco de dados relacional), HTML5, CSS3 e JavaScript
(front-end), JWT e bcrypt (autenticação), pytest (testes), Docker (implantação), Git (versionamento).

### Principais requisitos
| Código | Requisito |
|---|---|
| RF01 | Exibir cursos, turmas abertas com vagas restantes, dicas e depoimentos aprovados |
| RF02 | Receber inscrições em turmas, bloqueando turma lotada e inscrição duplicada |
| RF03 | Mostrar instruções de pagamento PIX após a inscrição |
| RF04 | Receber pedidos de mentoria individual e para equipes |
| RF05 | Captar contatos de interessados com consentimento |
| RF06 | Autenticar a administradora |
| RF07 | Gerenciar cursos, turmas, alunos e inscrições; registrar pagamentos |
| RF08 | Encerrar turma e emitir certificados com código de validação |
| RF09 | Validar certificado publicamente pelo código |
| RF10 | Lançar receitas e despesas, exportar e acompanhar limite do MEI e DAS |
| RF11 | Gerenciar dicas (blog), depoimentos, mensagens e textos do site |
| RNF01 | Responsivo (celular e computador) e acessível (teclado, contraste, rótulos) |
| RNF02 | Senhas com hash, sessões com validade, limite de tentativas, validação de uploads |
| RNF03 | LGPD: consentimento nos formulários, política de privacidade, exclusão a pedido |
| RNF04 | Registro de auditoria das alterações |

## 6. Cronograma e distribuição das 252 horas

| # | Etapa | Atividades | Horas |
|---|---|---|---:|
| 1 | Diagnóstico | Entrevistas com a beneficiária, análise do público e dos cursos, das obrigações do MEI e de plataformas de referência | 20 |
| 2 | Requisitos e planejamento | Histórias de usuário, escopo, priorização, cronograma | 16 |
| 3 | Design e experiência | Identidade visual, wireframes, protótipo, validação com a beneficiária | 24 |
| 4 | Banco de dados | Modelo entidade-relacionamento, regras de integridade, dados iniciais | 12 |
| 5 | Back-end | API REST, autenticação, vagas e inscrições, pagamentos, certificados, regras do MEI, uploads, segurança | 60 |
| 6 | Front-end do site | 12 páginas, inscrição em turma, mentoria, blog, validação de certificado, responsividade | 40 |
| 7 | Painel administrativo | 12 telas: visão geral, inscrições, turmas, cursos, alunos, mentorias, interessados, financeiro, conteúdo | 44 |
| 8 | Testes | Testes automatizados da API e testes de usabilidade com a beneficiária, correções | 14 |
| 9 | Implantação | Servidor, domínio, HTTPS, rotina de backup | 8 |
| 10 | Capacitação | Treinamento da beneficiária e manual do painel | 8 |
| 11 | Documentação | Documentação técnica e este relatório | 6 |
| | **Total** | | **252** |

Sugestão de distribuição: 14 semanas de aproximadamente 18 horas.

| Semanas | Etapas |
|---|---|
| 1–2 | 1, 2 |
| 3–4 | 3, 4 |
| 5–8 | 5 |
| 9–10 | 6 |
| 11–12 | 7 |
| 13 | 8, 9 |
| 14 | 10, 11 |

## 7. Resultados

- Site publicado em [endereço], com 12 páginas, inscrição online e validação de certificados;
- [n] turmas abertas e [n] inscrições recebidas pelo site no período de [datas];
- [n] certificados emitidos;
- [n] contatos de interessados captados;
- Controle do limite do MEI e do DAS disponível em tempo real;
- 15 testes automatizados da API;
- Manual entregue e capacitação realizada em [data], com duração de [n] horas.

[Inclua prints (pasta `docs/telas`), fotos da capacitação e o depoimento da beneficiária.]

## 8. Avaliação da beneficiária

[Transcreva ou anexe a avaliação da beneficiária sobre o projeto, com data e assinatura.]

## 9. Considerações finais

[Descreva o que aprendeu, as dificuldades encontradas (por exemplo: adequar a linguagem do painel a uma
usuária não técnica, controlar vagas sem conflito, tornar o certificado verificável) e os próximos passos possíveis:
pagamento PIX com confirmação automática, envio de e-mail, área do aluno com materiais, aplicativo instalável (PWA).]

## 10. Referências

- BRASIL. Lei Complementar nº 123, de 14 de dezembro de 2006 (Estatuto da Microempresa e Empresa de Pequeno Porte).
- BRASIL. Lei nº 13.709, de 14 de agosto de 2018 (Lei Geral de Proteção de Dados Pessoais).
- IBGE. Classificação Nacional de Atividades Econômicas – CNAE 2.3: subclasse 8599-6/04.
- BRASIL. Resolução CGSN nº 140/2018, Anexo XI (ocupações permitidas ao MEI).
- Portal do Empreendedor (gov.br/mei).
- FASTAPI. Documentação oficial. https://fastapi.tiangolo.com
- SQLALCHEMY. Documentação oficial. https://docs.sqlalchemy.org
- W3C. Web Content Accessibility Guidelines (WCAG) 2.2.

---

Assinaturas

_______________________________ Aluno &nbsp;&nbsp;&nbsp;&nbsp; _______________________________ Beneficiária &nbsp;&nbsp;&nbsp;&nbsp; _______________________________ Orientador(a)
