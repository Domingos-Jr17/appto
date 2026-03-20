import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed da base de dados...\n");

  // ============================================
  // 1. CRIAR UTILIZADOR DE TESTE
  // ============================================
  console.log("👤 Criando utilizador de teste...");
  
  const hashedPassword = await bcrypt.hash("teste123", 12);
  
  const testUser = await prisma.user.upsert({
    where: { email: "teste@aptto.mz" },
    update: {},
    create: {
      email: "teste@aptto.mz",
      name: "Estudante Teste",
      password: hashedPassword,
      role: "STUDENT",
      emailVerified: new Date(),
    },
  });

  console.log(`   ✅ Utilizador criado: ${testUser.email}\n`);

  // ============================================
  // 2. CRIAR CRÉDITOS
  // ============================================
  console.log("💰 Criando créditos...");
  
  const credits = await prisma.credit.upsert({
    where: { userId: testUser.id },
    update: { balance: 5000, used: 0 },
    create: {
      userId: testUser.id,
      balance: 5000,
      used: 0,
    },
  });

  console.log(`   ✅ Créditos: ${credits.balance} disponíveis\n`);

  // ============================================
  // 3. CRIAR TRANSAÇÕES DE EXEMPLO
  // ============================================
  console.log("📊 Criando transações de exemplo...");

  const transactions = [
    {
      userId: testUser.id,
      amount: 5000,
      type: "BONUS" as const,
      description: "Bónus de boas-vindas",
    },
    {
      userId: testUser.id,
      amount: -50,
      type: "USAGE" as const,
      description: "Geração de trabalho: Impacto das Tecnologias no Ensino Superior",
    },
    {
      userId: testUser.id,
      amount: -10,
      type: "USAGE" as const,
      description: "IA: generate",
    },
    {
      userId: testUser.id,
      amount: -5,
      type: "USAGE" as const,
      description: "IA: improve",
    },
    {
      userId: testUser.id,
      amount: 1500,
      type: "PURCHASE" as const,
      description: "Compra via M-Pesa",
    },
  ];

  for (const tx of transactions) {
    await prisma.creditTransaction.create({ data: tx });
  }

  console.log(`   ✅ ${transactions.length} transações criadas\n`);

  // ============================================
  // 4. CRIAR SUBSCRIÇÃO
  // ============================================
  console.log("📋 Criando subscrição...");

  await prisma.subscription.upsert({
    where: { userId: testUser.id },
    update: {
      plan: "STUDENT",
      status: "ACTIVE",
      creditsPerMonth: 1000,
    },
    create: {
      userId: testUser.id,
      plan: "STUDENT",
      status: "ACTIVE",
      creditsPerMonth: 1000,
      startDate: new Date(),
    },
  });

  console.log(`   ✅ Subscrição: STUDENT (Ativa)\n`);

  // ============================================
  // 5. CRIAR CONFIGURAÇÕES DO UTILIZADOR
  // ============================================
  console.log("⚙️ Criando configurações...");

  await prisma.userSettings.upsert({
    where: { userId: testUser.id },
    update: {
      language: "pt-MZ",
      citationStyle: "ABNT",
      fontSize: 14,
      autoSave: true,
      aiSuggestionsEnabled: true,
      emailNotifications: true,
      marketingEmails: false,
    },
    create: {
      userId: testUser.id,
      language: "pt-MZ",
      citationStyle: "ABNT",
      fontSize: 14,
      autoSave: true,
      aiSuggestionsEnabled: true,
      emailNotifications: true,
      marketingEmails: false,
    },
  });

  console.log(`   ✅ Configurações definidas\n`);

  // ============================================
  // 6. CRIAR PROJECTOS DE EXEMPLO
  // ============================================
  console.log("📁 Criando projectos de exemplo...");

  const projects = [
    {
      title: "Impacto das Tecnologias Digitais no Ensino Superior em Moçambique",
      description: "Monografia sobre a transformação digital nas universidades moçambicanas",
      type: "MONOGRAPHY" as const,
      status: "IN_PROGRESS" as const,
      wordCount: 3250,
      userId: testUser.id,
    },
    {
      title: "Análise da Sustentabilidade Ambiental em Empresas de Maputo",
      description: "Estudo de caso sobre práticas sustentáveis",
      type: "DISSERTATION" as const,
      status: "DRAFT" as const,
      wordCount: 1200,
      userId: testUser.id,
    },
    {
      title: "O Papel da Mulher na Política Moçambicana Pós-Independência",
      description: "Artigo científico sobre participação política feminina",
      type: "ARTICLE" as const,
      status: "COMPLETED" as const,
      wordCount: 4500,
      userId: testUser.id,
    },
    {
      title: "Efeitos da Mudança Climática na Agricultura Subsistente",
      description: "Tese sobre impactos climáticos em comunidades rurais",
      type: "THESIS" as const,
      status: "IN_PROGRESS" as const,
      wordCount: 8900,
      userId: testUser.id,
    },
    {
      title: "Ensino à Distância: Desafios e Oportunidades em Moçambique",
      description: "Ensaio sobre educação remota",
      type: "ESSAY" as const,
      status: "ARCHIVED" as const,
      wordCount: 2100,
      userId: testUser.id,
    },
  ];

  const createdProjects = [];
  for (const project of projects) {
    const created = await prisma.project.create({ data: project });
    createdProjects.push(created);
    console.log(`   ✅ Projecto: ${project.title.substring(0, 50)}...`);
  }
  console.log("");

  // ============================================
  // 7. CRIAR SECÇÕES DE DOCUMENTOS
  // ============================================
  console.log("📝 Criando secções de documentos...");

  // Secções para o primeiro projecto (Monografia)
  const mainProject = createdProjects[0];
  
  const sections = [
    {
      projectId: mainProject.id,
      title: "Capa",
      content: `UNIVERSIDADE EDUARDU MONDLANE

FACULDADE DE LETRAS E CIÊNCIAS SOCIAIS

MONOGRAFIA

IMPACTO DAS TECNOLOGIAS DIGITAIS NO ENSINO SUPERIOR EM MOÇAMBIQUE

Autor: Estudante Teste
Ano: 2025`,
      order: 1,
      wordCount: 25,
    },
    {
      projectId: mainProject.id,
      title: "Resumo",
      content: `O presente trabalho investiga o impacto das tecnologias digitais no ensino superior em Moçambique, analisando como a transformação digital tem influenciado os métodos de ensino, aprendizagem e gestão administrativa nas instituições de ensino superior do país. A pesquisa adoptou uma abordagem qualitativa, com revisão bibliográfica e análise documental. Os resultados indicam que a implementação de tecnologias digitais tem trazido benefícios significativos, embora ainda existam desafios relacionados com infra-estrutura, formação docente e acesso à internet. O estudo conclui que é necessário um esforço concertado entre governo, instituições e parceiros para maximizar o potencial das tecnologias digitais na educação superior moçambicana.`,
      order: 2,
      wordCount: 120,
    },
    {
      projectId: mainProject.id,
      title: "1. Introdução",
      content: `## 1.1 Contextualização

O ensino superior em Moçambique tem passado por profundas transformações nas últimas décadas, impulsionadas pela globalização e pelo avanço tecnológico. A incorporação de tecnologias digitais nas instituições de ensino superior representa uma mudança paradigmática na forma como o conhecimento é produzido, transmitido e avaliado.

Moçambique, como país em desenvolvimento, enfrenta desafios únicos na implementação de tecnologias digitais no ensino superior. A infra-estrutura tecnológica limitada, os custos de implementação e a necessidade de formação de recursos humanos qualificados são alguns dos obstáculos a serem superados.

## 1.2 Problema de Investigação

Como as tecnologias digitais têm impactado os processos de ensino e aprendizagem no ensino superior moçambicano, e quais são os principais desafios enfrentados pelas instituições na sua implementação?

## 1.3 Objectivos

### Objectivo Geral
Analisar o impacto das tecnologias digitais no ensino superior em Moçambique.

### Objectivos Específicos
- Identificar as principais tecnologias digitais adoptadas pelas instituições de ensino superior;
- Avaliar os benefícios e desafios da implementação dessas tecnologias;
- Propor recomendações para melhorar a integração tecnológica no ensino superior.

## 1.4 Justificativa

A relevância deste estudo reside na necessidade de compreender como a transformação digital pode contribuir para a melhoria da qualidade do ensino superior em Moçambique, país que busca alcançar os objectivos de desenvolvimento sustentável.`,
      order: 3,
      wordCount: 280,
    },
    {
      projectId: mainProject.id,
      title: "2. Revisão da Literatura",
      content: `## 2.1 Fundamentos Teóricos

A integração de tecnologias digitais na educação fundamenta-se em diversas teorias de aprendizagem, destacando-se o construtivismo de Vygotsky e a teoria da aprendizagem conectivista de Siemens.

Segundo Castells (1999), a sociedade em rede caracteriza-se pela transformação da informação em recurso fundamental, o que implica mudanças profundas nos processos educativos.

## 2.2 Tecnologias Digitais no Ensino Superior

As principais tecnologias adoptadas no ensino superior incluem:

- Plataformas de gestão de aprendizagem (LMS)
- Ferramentas de videoconferência
- Recursos educacionais abertos
- Ambientes virtuais de aprendizagem
- Sistemas de bibliotecas digitais

## 2.3 Contexto Africano

Estudos de añGomez e Banda (2020) indicam que os países africanos têm investido progressivamente em infra-estruturas digitais para o ensino superior, embora com ritmos diferentes.

## 2.4 Estudos em Moçambique

Pesquisas realizadas por Mazive (2019) demonstram que as universidades moçambicanas começaram a integrar tecnologias digitais nos processos de ensino-aprendizagem, com destaque para o uso de plataformas Moodle e sistemas de gestão académica.`,
      order: 4,
      wordCount: 185,
    },
    {
      projectId: mainProject.id,
      title: "3. Metodologia",
      content: `## 3.1 Tipo de Investigação

O presente estudo adoptou uma abordagem qualitativa, de carácter descritivo e exploratório, visando compreender em profundidade o fenómeno estudado.

## 3.2 Técnicas de Recolha de Dados

Foram utilizadas as seguintes técnicas:
- Revisão bibliográfica sistemática
- Análise documental
- Consulta a bases de dados científicas

## 3.3 Critérios de Inclusão

- Estudos publicados entre 2015 e 2024
- Publicações em português e inglês
- Pesquisas realizadas em contexto africano

## 3.4 Limitações do Estudo

O estudo apresenta limitações relacionadas com a escassez de literatura específica sobre o tema em Moçambique e a dificuldade de acesso a algumas fontes documentais.`,
      order: 5,
      wordCount: 130,
    },
    {
      projectId: mainProject.id,
      title: "4. Resultados e Discussão",
      content: `## 4.1 Principais Tecnologias Adoptadas

A análise dos dados revelou que as seguintes tecnologias são mais utilizadas:

1. **Plataformas LMS** - Moodle é a plataforma mais adoptada, presente em 80% das instituições analisadas.
2. **Ferramentas de Comunicação** - Zoom, Google Meet e Microsoft Teams ganharam destaque, especialmente após a pandemia.
3. **Bibliotecas Digitais** - Aumento significativo no acesso a recursos digitais.

## 4.2 Benefícios Identificados

- Democratização do acesso ao conhecimento
- Flexibilização do ensino
- Desenvolvimento de competências digitais
- Internacionalização da educação

## 4.3 Desafios Encontrados

- Infra-estrutura tecnológica deficiente
- Custos elevados de implementação
- Resistência à mudança por parte de alguns docentes
- Lacunas na formação tecnológica

## 4.4 Discussão

Os resultados corroboram estudos anteriores que apontam para um cenário de transição gradual nas instituições de ensino superior moçambicanas. A pandemia de COVID-19 acelerou este processo, obrigando as instituições a adoptar medidas emergenciais de ensino à distância.`,
      order: 6,
      wordCount: 200,
    },
    {
      projectId: mainProject.id,
      title: "5. Conclusão",
      content: `## 5.1 Síntese dos Resultados

Este estudo demonstrou que as tecnologias digitais têm um impacto significativo no ensino superior em Moçambique, embora a sua implementação ainda enfrente diversos desafios.

## 5.2 Recomendações

1. Investimento em infra-estrutura tecnológica
2. Formação contínua de docentes
3. Desenvolvimento de políticas institucionais de digitalização
4. Parcerias com entidades públicas e privadas
5. Promoção de acesso à internet nas instituições

## 5.3 Sugestões para Pesquisas Futuras

- Estudos quantitativos sobre eficácia do ensino digital
- Análise comparativa entre instituições públicas e privadas
- Investigação sobre o impacto nas comunidades estudantis

## 5.4 Considerações Finais

A transformação digital no ensino superior moçambicano é um processo em curso que exige esforços conjuntos de todos os actores envolvidos. As tecnologias digitais representam uma oportunidade sem precedentes para a melhoria da qualidade educativa, desde que implementadas de forma estratégica e sustentável.`,
      order: 7,
      wordCount: 160,
    },
    {
      projectId: mainProject.id,
      title: "Referências Bibliográficas",
      content: `CASTELLS, Manuel. A sociedade em rede. São Paulo: Paz e Terra, 1999.

GOMEZ, Manuel; BANDA, Joseph. Digital transformation in African higher education: challenges and opportunities. African Journal of Education, v. 15, n. 2, p. 45-67, 2020.

MAZIVE, Amélia. Tecnologias digitais no ensino superior moçambicano: mapeamento e perspectivas. Maputo: Universidade Eduardo Mondlane, 2019.

SIEMENS, George. Connectivism: A learning theory for the digital age. International Journal of Instructional Technology and Distance Learning, v. 2, n. 1, p. 3-10, 2005.

VYGOTSKY, Lev S. A formação social da mente. São Paulo: Martins Fontes, 1998.

UNESCO. Educação para os Objectivos de Desenvolvimento Sustentável: Objectivos de Aprendizagem. Paris: UNESCO, 2017.

MINISTÉRIO DA EDUCAÇÃO E DESENVOLVIMENTO HUMANO. Estratégia de Educação 2020-2029. Maputo: MEDH, 2020.`,
      order: 8,
      wordCount: 140,
    },
  ];

  for (const section of sections) {
    await prisma.documentSection.create({ data: section });
  }

  console.log(`   ✅ ${sections.length} secções criadas para o projecto principal\n`);

  // Criar algumas secções básicas para os outros projectos
  for (let i = 1; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    await prisma.documentSection.createMany({
      data: [
        {
          projectId: project.id,
          title: "Introdução",
          content: `Este documento apresenta o desenvolvimento do trabalho sobre ${project.title.toLowerCase()}.`,
          order: 1,
          wordCount: 20,
        },
        {
          projectId: project.id,
          title: "Desenvolvimento",
          content: `O conteúdo principal será desenvolvido aqui.`,
          order: 2,
          wordCount: 10,
        },
        {
          projectId: project.id,
          title: "Conclusão",
          content: `Considerações finais do trabalho.`,
          order: 3,
          wordCount: 5,
        },
      ],
    });
  }

  console.log(`   ✅ Secções básicas criadas para os restantes projectos\n`);

  // ============================================
  // RESUMO FINAL
  // ============================================
  console.log("=" .repeat(50));
  console.log("🎉 SEED CONCLUÍDO COM SUCESSO!");
  console.log("=" .repeat(50));
  console.log("\n📊 Resumo dos dados criados:");
  console.log("─".repeat(50));
  console.log(`👤 Utilizador:     teste@aptto.mz`);
  console.log(`🔑 Senha:         teste123`);
  console.log(`💰 Créditos:      ${credits.balance}`);
  console.log(`📁 Projectos:     ${projects.length}`);
  console.log(`📝 Secções:       ${sections.length + (createdProjects.length - 1) * 3}`);
  console.log(`📊 Transações:    ${transactions.length}`);
  console.log("─".repeat(50));
  console.log("\n🚀 Use as credenciais acima para testar a plataforma!\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
