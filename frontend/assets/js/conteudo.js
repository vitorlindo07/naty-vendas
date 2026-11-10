/* Conteúdo de treino: palavra do dia, dica do dia, checklist de atendimento e transições.
   Para editar, basta mudar os textos abaixo e salvar. A palavra e a dica do dia mudam sozinhas a cada dia. */

/* 40 palavras para ampliar o repertório de venda.
   desafio: o que fazer hoje no atendimento · frase: como usar a palavra na conversa */
export const PALAVRAS = [
  { palavra: "Conforto", desafio: "Descubra o que deixa o cliente desconfortável no produto que ele usa hoje antes de apresentar o seu.", frase: "O que eu mais gosto nessa peça é o conforto, porque…" },
  { palavra: "Durabilidade", desafio: "Mostre para um cliente quanto tempo o produto dura e transforme isso em economia.", frase: "Pensando na durabilidade, ele vai te acompanhar por…" },
  { palavra: "Liberdade", desafio: "Encontre um cliente que reclame de se sentir preso ou limitado e apresente uma solução.", frase: "Com ele você tem liberdade para…" },
  { palavra: "Confiança", desafio: "Conte para um cliente a experiência real de alguém que já comprou o mesmo produto.", frase: "Pode comprar com confiança, porque…" },
  { palavra: "Protagonismo", desafio: "Deixe o cliente decidir entre duas boas opções em vez de escolher por ele.", frase: "Você que manda: qual das duas tem mais a sua cara?" },
  { palavra: "Autocuidado", desafio: "Mostre que a compra é um cuidado que o cliente está tendo consigo mesmo.", frase: "Isso aqui é um autocuidado que faz diferença no seu dia…" },
  { palavra: "Tecnologia", desafio: "Explique um detalhe técnico do produto em uma frase simples, sem palavras difíceis.", frase: "A tecnologia dele faz com que…" },
  { palavra: "Modelagem", desafio: "Peça para o cliente experimentar dois modelos diferentes e comparar como cada um veste.", frase: "Repara como essa modelagem valoriza…" },
  { palavra: "Versatilidade", desafio: "Mostre que o mesmo produto serve em mais de uma situação da rotina do cliente.", frase: "Essa peça é muito versátil, porque…" },
  { palavra: "Praticidade", desafio: "Descubra qual tarefa do dia a dia mais toma tempo do cliente e mostre como o produto ajuda.", frase: "É muito prático: você só precisa…" },
  { palavra: "Leveza", desafio: "Coloque o produto na mão do cliente antes de falar qualquer coisa sobre ele.", frase: "Sente só a leveza…" },
  { palavra: "Sustentação", desafio: "Pergunte o que o cliente espera de firmeza e suporte antes de indicar um modelo.", frase: "Ele tem uma sustentação que…" },
  { palavra: "Movimento", desafio: "Convide o cliente a se movimentar com o produto: andar, sentar, levantar os braços.", frase: "Faz um movimento para você sentir como ele acompanha…" },
  { palavra: "Bem-estar", desafio: "Pergunte como o cliente quer se sentir usando o produto e use as palavras dele.", frase: "O que você vai sentir é bem-estar o dia inteiro…" },
  { palavra: "Segurança", desafio: "Identifique o medo que impede a compra e responda a ele com fatos.", frase: "Pode comprar sem medo, porque…" },
  { palavra: "Invisível", desafio: "Apresente um produto que resolve um problema sem que ninguém perceba que ele está ali.", frase: "Ninguém vai perceber, ele fica invisível…" },
  { palavra: "Essencial", desafio: "Ajude o cliente a montar o básico que não pode faltar no dia a dia dele.", frase: "Esse é essencial para quem…" },
  { palavra: "Investimento", desafio: "Divida o valor do produto pelo número de vezes que o cliente vai usá-lo.", frase: "Pensando como investimento, sai a…" },
  { palavra: "Valor", desafio: "Responda uma objeção de preço falando primeiro do que o produto entrega.", frase: "Mais do que o preço, olha o valor que ele tem…" },
  { palavra: "Experiência", desafio: "Faça um atendimento em que o cliente saia contando para alguém como foi atendido.", frase: "Quero que a sua experiência aqui seja…" },
  { palavra: "Qualidade", desafio: "Mostre um detalhe de acabamento que comprove a qualidade, em vez de só dizer que é bom.", frase: "Olha a qualidade desse acabamento…" },
  { palavra: "Diferencial", desafio: "Explique em uma frase o que esse produto tem que os outros não têm.", frase: "O grande diferencial dele é…" },
  { palavra: "Cuidado", desafio: "Ensine o cliente a cuidar do produto para que ele dure mais.", frase: "Com um cuidado simples, ele dura muito mais…" },
  { palavra: "Estilo", desafio: "Elogie algo que o cliente já está usando e sugira uma peça que combine com o estilo dele.", frase: "Combina muito com o seu estilo, porque…" },
  { palavra: "Rotina", desafio: "Pergunte como é um dia normal do cliente e encaixe o produto nesse dia.", frase: "Na sua rotina, ele entra bem na hora de…" },
  { palavra: "Ocasião", desafio: "Descubra para qual ocasião o cliente está comprando e monte uma combinação completa.", frase: "Para essa ocasião, eu combinaria com…" },
  { palavra: "Solução", desafio: "Transforme uma reclamação do cliente em motivo para apresentar um produto.", frase: "Para isso que você comentou, a solução é…" },
  { palavra: "Complemento", desafio: "Ofereça um item complementar em todos os atendimentos de hoje.", frase: "Para completar, esse aqui fica perfeito com…" },
  { palavra: "Transição", desafio: "Use o que o cliente falou para apresentar um produto de outra categoria.", frase: "Já que você comentou que…, deixa eu te mostrar…" },
  { palavra: "Curiosidade", desafio: "Faça três perguntas abertas antes de apresentar qualquer produto.", frase: "Uma curiosidade: o que você mais usa no dia a dia?" },
  { palavra: "Descoberta", desafio: "Apresente algo que o cliente não conhecia e que tem tudo a ver com o que ele contou.", frase: "Você já conhece esse aqui? Acho que vai gostar…" },
  { palavra: "Personalização", desafio: "Monte uma sugestão usando o nome do cliente e o que ele contou.", frase: "Separei pensando em você, porque você falou que…" },
  { palavra: "Conexão", desafio: "Encontre algo em comum com o cliente antes de falar de produto.", frase: "Que legal, eu também…" },
  { palavra: "Prova", desafio: "Convide todos os clientes de hoje a experimentar ou testar o produto.", frase: "Vamos provar? Só experimentando você vai sentir…" },
  { palavra: "Novidade", desafio: "Mostre o lançamento mais recente para cada cliente atendido hoje.", frase: "Acabou de chegar, você é das primeiras pessoas a ver…" },
  { palavra: "Exclusividade", desafio: "Faça o cliente se sentir atendido de um jeito especial, do começo ao fim.", frase: "Separei esse especialmente para você…" },
  { palavra: "Ambição", desafio: "Defina uma meta pessoal para hoje, um pouco acima da sua média.", frase: "Hoje eu vou além do que fiz ontem." },
  { palavra: "Coragem", desafio: "Ofereça um produto de valor mais alto do que você costuma oferecer.", frase: "Deixa eu te mostrar uma opção que eu acho que vale a pena…" },
  { palavra: "Escolha", desafio: "Termine o atendimento oferecendo duas opções em vez de perguntar se o cliente vai levar.", frase: "Você prefere esse ou aquele?" },
  { palavra: "Oportunidade", desafio: "Volte a falar com um cliente que não comprou da última vez.", frase: "Lembrei de você quando chegou esse…" },
];

/* Frases curtas para a "dica do dia". */
export const DICAS = [
  "Toda boa venda começa com uma conversa.",
  "Não é só vender mais. É vender melhor.",
  "Preço é o número na etiqueta. Valor é o que o produto representa na vida do cliente.",
  "Não é “ou”, é “e”: o cliente não precisa escolher entre um produto e outro. Ele pode levar os dois.",
  "Oferta sem contexto é empurrar produto. Oferta ligada à necessidade é atendimento.",
  "Transição não é trocar de assunto. É aprofundar a necessidade.",
  "Não existe resultado novo com comportamento repetido.",
  "Excelência não é ser perfeito o tempo todo. É ser consistente no que importa.",
  "Excelência é perceber o que o cliente precisa e agir sobre isso.",
  "O que o cliente fala revela o que ele precisa. Pergunte mais.",
  "O que você leva para o provador mostra o quanto você ouviu o cliente.",
  "Não decida pelo cliente que algo é caro demais para ele.",
  "Quem pergunta antes de oferecer vende mais e dá menos desconto.",
  "Atendimento bom é o que faz o cliente querer voltar.",
  "Uma palavra nova, uma conversa nova, uma nova oportunidade.",
  "Deixe o cliente fechar a venda. Seu papel é conduzir até lá.",
  "Chamar o cliente pelo nome transforma um atendimento em uma conversa.",
  "Pós-venda é o começo da próxima venda.",
];

/* Checklist do atendimento, dividido nas etapas da venda. */
export const CHECKLIST = [
  { etapa: "Antes de atender", itens: [
    "Estou com a aparência alinhada e o material de trabalho à mão.",
    "Sei a minha meta do dia e quanto falta para chegar nela.",
    "Conheço os produtos, os preços e as novidades da semana.",
  ] },
  { etapa: "Acolher", itens: [
    "Recebi o cliente com sorriso, boa postura e sem demora.",
    "Eu me apresentei pelo nome e perguntei o nome do cliente.",
    "Quebrei o gelo com um elogio sincero ou uma pergunta leve.",
  ] },
  { etapa: "Entender", itens: [
    "Fiz perguntas abertas para entender o que o cliente procura.",
    "Descobri para que, para quem e para quando é a compra.",
    "Percebi necessidades que abrem espaço para outras categorias.",
  ] },
  { etapa: "Apresentar e experimentar", itens: [
    "Apresentei os produtos pelo benefício, não só pela característica.",
    "Convidei o cliente a experimentar ou testar.",
    "Ofereci pelo menos seis opções, incluindo outra categoria.",
    "Chamei o cliente pelo nome durante o atendimento.",
  ] },
  { etapa: "Fechar e fidelizar", itens: [
    "Identifiquei e contornei as objeções com calma.",
    "Ofereci um complemento ou acessório.",
    "Deixei o cliente decidir, sem apressar o fechamento.",
    "Fiz o cadastro e expliquei os benefícios de voltar.",
    "Acompanhei o cliente até a porta e agradeci.",
  ] },
];

/* O que o cliente diz → o que oferecer em seguida. */
export const TRANSICOES = [
  { diz: "Comecei a treinar três vezes por semana.", oferta: "Roupas e acessórios para treino, peças para o pós-treino e itens de conforto." },
  { diz: "Vou viajar para a praia no fim do ano.", oferta: "Moda praia, saída de praia, peças leves e itens práticos para a mala." },
  { diz: "É para presente.", oferta: "Embalagem especial, um item complementar e a troca facilitada." },
  { diz: "Não gosto de nada que aperta.", oferta: "Modelos mais leves, tecidos com elasticidade e linhas de conforto." },
  { diz: "Uso isso todo dia.", oferta: "Uma segunda unidade, outras cores e o kit para revezar." },
  { diz: "Achei um pouco caro.", oferta: "Os atributos de valor: durabilidade, frequência de uso e o custo por uso." },
];

/* Atributos de valor para responder à objeção de preço. */
export const ATRIBUTOS_VALOR = ["Durabilidade", "Conforto", "Versatilidade", "Benefício", "Frequência de uso", "Modelagem", "Tecnologia", "Experiência"];

/* Escolhe um item do dia (o mesmo para todo mundo no mesmo dia). */
export function doDia(lista, data = new Date()) {
  const inicio = new Date(data.getFullYear(), 0, 0);
  const diaDoAno = Math.floor((data - inicio) / 86400000);
  return lista[(diaDoAno + data.getFullYear()) % lista.length];
}
