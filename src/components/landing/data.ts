// Mock data for aptto landing page

export const navigationLinks = [
  { label: "Recursos", href: "#recursos" },
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Preços", href: "#precos" },
  { label: "Testemunhos", href: "#testemunhos" },
  { label: "FAQ", href: "#faq" },
];

export const stats = [
  { value: "2.500+", label: "Estudantes activos", suffix: "" },
  { value: "15.000", label: "Trabalhos estruturados", suffix: "+" },
  { value: "98%", label: "Taxa de satisfação", suffix: "" },
  { value: "45min", label: "Tempo médio poupado", suffix: "" },
];

export const testimonials = [
  {
    id: 1,
    name: "Ana Cristina Macamo",
    role: "Estudante de Direito",
    institution: "Universidade Eduardo Mondlane",
    initials: "AC",
    rating: 5,
    text: "O aptto transformou completamente a forma como estruturo os meus trabalhos. A normalização ABNT era um pesadelo, agora está sempre perfeita. Recomendo a todos os colegas.",
  },
  {
    id: 2,
    name: "Carlos Munhiça",
    role: "Mestrando em Educação",
    institution: "Universidade Pedagógica",
    initials: "CM",
    rating: 5,
    text: "Finalmente uma ferramenta que entende o contexto moçambicano. O português académico é exactamente como os meus professores esperam. O RAG com fontes locais faz toda a diferença.",
  },
  {
    id: 3,
    name: "Fátima Chaúque",
    role: "Finalista de Economia",
    institution: "ISCTEM",
    initials: "FC",
    rating: 5,
    text: "Passei noites em branco com a minha monografia. Com o aptto, consegui organizar tudo em dias. O melhor: o texto parece mesmo meu, com a minha voz académica.",
  },
  {
    id: 4,
    name: "João Paulo Manjate",
    role: "Estudante de Engenharia",
    institution: "Universidade Save",
    initials: "JM",
    rating: 5,
    text: "A funcionalidade de exportar em DOCX formatado poupa-me horas. Os créditos são transparentes e o preço é justo para nós estudantes. Excelente investimento.",
  },
  {
    id: 5,
    name: "Lúcia Mondlane",
    role: "Doutoranda em Saúde Pública",
    institution: "Universidade Lúrio",
    initials: "LM",
    rating: 5,
    text: "Como doutoranda, preciso de rigor. O aptto não gera texto genérico - ajuda-me a pensar, estruturar e melhorar. É um copiloto académico de verdade.",
  },
  {
    id: 6,
    name: "Ricardo Nhantumbo",
    role: "Estudante de Gestão",
    institution: "ISPU",
    initials: "RN",
    rating: 5,
    text: "O que mais me impressiona é a qualidade do português académico moçambicano. Nada de traduções estranhas. É português nosso, académico e bem escrito.",
  },
];

export const features = [
  {
    id: 1,
    icon: "PenTool",
    title: "Escrita Assistida por IA",
    description: "Gere secções, parágrafos e argumentos com inteligência artificial treinada para contexto académico moçambicano.",
    highlight: false,
  },
  {
    id: 2,
    icon: "LayoutTemplate",
    title: "Estruturação Automática",
    description: "Monografias, seminários, artigos e teses estruturados segundo normas académicas padrão.",
    highlight: true,
  },
  {
    id: 3,
    icon: "Languages",
    title: "Português Académico MZ",
    description: "Texto em português académico moçambicano, com vocabulário e expressões adequadas ao nosso contexto.",
    highlight: false,
  },
  {
    id: 4,
    icon: "BookMarked",
    title: "Normalização ABNT",
    description: "Referências e citações formatadas automaticamente segundo as normas ABNT exigidas pelas universidades.",
    highlight: true,
  },
  {
    id: 5,
    icon: "Database",
    title: "RAG com Fontes Locais",
    description: "Acesso a base de conhecimento com fontes moçambicanas para enriquecer o seu trabalho com referências relevantes.",
    highlight: false,
  },
  {
    id: 6,
    icon: "SpellCheck",
    title: "Revisão de Coerência",
    description: "Análise inteligente de argumentação, coerência textual e fluidez dos parágrafos.",
    highlight: false,
  },
  {
    id: 7,
    icon: "FileDown",
    title: "Exportação DOCX/PDF",
    description: "Exporte trabalhos formatados em Word ou PDF, prontos para submissão institucional.",
    highlight: false,
  },
  {
    id: 8,
    icon: "Coins",
    title: "Gestão de Créditos",
    description: "Sistema transparente de créditos. Use conforme precisa, recarregue quando quiser.",
    highlight: false,
  },
  {
    id: 9,
    icon: "FolderKanban",
    title: "Projectos por Curso",
    description: "Organize trabalhos por curso, nível académico e tipo. Nunca perca o progresso.",
    highlight: false,
  },
  {
    id: 10,
    icon: "Zap",
    title: "Streaming em Tempo Real",
    description: "Veja o texto ser gerado em tempo real, com possibilidade de ajustar a meio da geração.",
    highlight: false,
  },
  {
    id: 11,
    icon: "RotateCcw",
    title: "Recuperação de Sessão",
    description: "Continue de onde parou. O seu trabalho é guardado automaticamente a cada momento.",
    highlight: false,
  },
  {
    id: 12,
    icon: "CreditCard",
    title: "Planos Flexíveis",
    description: "Planos pensados para estudantes moçambicanos. Desde o gratuito até ao académico intensivo.",
    highlight: false,
  },
];

export const howItWorksSteps = [
  {
    step: 1,
    title: "Crie o seu projecto",
    description: "Configure o trabalho académico: tema, curso, nível e tipo de documento.",
    icon: "FolderPlus",
  },
  {
    step: 2,
    title: "Defina os parâmetros",
    description: "Indique objectivos, metodologia pretendida e palavras-chave relevantes.",
    icon: "Settings",
  },
  {
    step: 3,
    title: "Trabalhe com a IA",
    description: "Estruture, escreva e melhore o texto com assistência inteligente personalizada.",
    icon: "Wand2",
  },
  {
    step: 4,
    title: "Exporte e submeta",
    description: "Normalize referências, exporte em DOCX/PDF e submeta com confiança.",
    icon: "Send",
  },
];

export const differentiators = [
  {
    title: "Português Académico Moçambicano",
    description: "Não é português de Portugal, nem do Brasil. É português académico moçambicano, com a terminologia e expressões correctas para o nosso contexto.",
    icon: "Globe",
  },
  {
    title: "Normas ABNT Nativas",
    description: "Citações e referências formatadas automaticamente segundo as normas ABNT exigidas pelas universidades moçambicanas.",
    icon: "BookOpen",
  },
  {
    title: "RAG com Fontes Locais",
    description: "Acesso a base de conhecimento com literatura e fontes relevantes para o contexto de Moçambique.",
    icon: "Library",
  },
  {
    title: "Foco Académico Real",
    description: "Não é um gerador genérico. É um copiloto pensado para estruturar e apoiar trabalhos académicos de verdade.",
    icon: "GraduationCap",
  },
  {
    title: "Créditos Transparentes",
    description: "Sem surpresas. Saiba exactamente quanto custa cada acção e gerencie os seus créditos com clareza.",
    icon: "Eye",
  },
  {
    title: "Produto Feito para Moçambique",
    description: "Desenvolvido com compreensão real das necessidades dos estudantes e instituições moçambicanas.",
    icon: "MapPin",
  },
];

export const genericComparison = [
  { feature: "Português académico moçambicano", aptto: true, generic: false },
  { feature: "Normas ABNT nativas", aptto: true, generic: false },
  { feature: "RAG com fontes locais", aptto: true, generic: false },
  { feature: "Foco em estrutura académica", aptto: true, generic: false },
  { feature: "Contexto de Moçambique", aptto: true, generic: false },
  { feature: "Créditos transparentes", aptto: true, generic: false },
];

export const pricingPlans = [
  {
    id: "gratuito",
    name: "Gratuito",
    price: 0,
    currency: "MZN",
    period: "para sempre",
    description: "Perfeito para experimentar o aptto",
    features: [
      "50 créditos iniciais",
      "5 gerações por dia",
      "Exportação básica",
      "Estruturação simples",
      "Suporte por email",
    ],
    cta: "Começar Grátis",
    highlighted: false,
    badge: null,
  },
  {
    id: "estudante",
    name: "Estudante",
    price: 350,
    currency: "MZN",
    period: "por mês",
    description: "Ideal para finalistas e uso recorrente",
    features: [
      "500 créditos por mês",
      "Gerações ilimitadas",
      "Exportação completa DOCX/PDF",
      "Todas as estruturas académicas",
      "Normalização ABNT automática",
      "Suporte prioritário",
    ],
    cta: "Escolher Estudante",
    highlighted: true,
    badge: "Mais Popular",
  },
  {
    id: "academico",
    name: "Académico",
    price: 900,
    currency: "MZN",
    period: "por mês",
    description: "Para pós-graduação e utilizadores intensivos",
    features: [
      "2.000 créditos por mês",
      "Gerações ilimitadas",
      "Acesso ao RAG local",
      "Modelos de IA avançados",
      "Exportação premium",
      "Projectos ilimitados",
      "Suporte dedicado",
    ],
    cta: "Escolher Académico",
    highlighted: false,
    badge: null,
  },
];

export const faqs = [
  {
    question: "O aptto escreve o trabalho por mim?",
    answer: "Não. O aptto é um copiloto académico que o ajuda a estruturar, melhorar e normalizar o seu trabalho. A escrita final é sempre sua - a IA assiste, não substitui o seu pensamento académico.",
  },
  {
    question: "O aptto usa português de Moçambique?",
    answer: "Sim. O aptto foi treinado para produzir texto em português académico moçambicano, com a terminologia e expressões adequadas ao contexto das nossas universidades.",
  },
  {
    question: "Como funcionam os créditos?",
    answer: "Cada acção na plataforma consome créditos (gerar texto, estruturar, exportar). Os créditos são transparentes - você sempre sabe quanto custa antes de executar. Pode recarregar ou fazer upgrade de plano quando precisar.",
  },
  {
    question: "Posso exportar em DOCX e PDF?",
    answer: "Sim. O aptto permite exportar trabalhos formatados em Word (DOCX) e PDF, prontos para submissão institucional, com formatação académica correcta.",
  },
  {
    question: "O aptto serve para monografia e seminário?",
    answer: "Sim. O aptto suporta monografias, seminários, artigos científicos, teses e dissertações. Cada tipo de trabalho tem estruturas e normas específicas que a plataforma respeita.",
  },
  {
    question: "O que significa RAG com fontes locais?",
    answer: "RAG (Retrieval-Augmented Generation) significa que a IA pode consultar uma base de conhecimento com fontes relevantes para Moçambique durante a geração, enriquecendo o seu trabalho com referências locais apropriadas.",
  },
  {
    question: "O meu orientador vai aceitar?",
    answer: "O aptto produz texto que parece seu - com a sua voz académica. Não é texto genérico de IA. Muitos orientadores elogiam a qualidade da estrutura e normalização. O que importa é o seu conteúdo e argumentação.",
  },
  {
    question: "Posso usar no telemóvel?",
    answer: "Sim. O aptto é uma plataforma web responsiva que funciona bem em telemóveis, tablets e computadores. A sua experiência é optimizada para qualquer dispositivo.",
  },
];

export const heroBadges = [
  { label: "PT-MZ Académico", icon: "Languages" },
  { label: "ABNT Ready", icon: "BookMarked" },
  { label: "RAG Local", icon: "Database" },
  { label: "DOCX Export", icon: "FileDown" },
  { label: "Streaming AI", icon: "Zap" },
];

export const trustIndicators = [
  { label: "Português académico MZ", icon: "Check" },
  { label: "Normalização ABNT", icon: "Check" },
  { label: "RAG com fontes locais", icon: "Check" },
  { label: "Exportação DOCX/PDF", icon: "Check" },
  { label: "Créditos transparentes", icon: "Check" },
];

export const footerLinks = {
  product: [
    { label: "Funcionalidades", href: "#recursos" },
    { label: "Preços", href: "#precos" },
    { label: "Demo", href: "#demo" },
    { label: "FAQ", href: "#faq" },
  ],
  company: [
    { label: "Sobre nós", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Carreiras", href: "#" },
    { label: "Contacto", href: "#" },
  ],
  legal: [
    { label: "Termos de uso", href: "#" },
    { label: "Privacidade", href: "#" },
    { label: "Cookies", href: "#" },
  ],
  social: [
    { label: "LinkedIn", href: "#", icon: "Linkedin" },
    { label: "Twitter", href: "#", icon: "Twitter" },
    { label: "Instagram", href: "#", icon: "Instagram" },
    { label: "Facebook", href: "#", icon: "Facebook" },
  ],
};
