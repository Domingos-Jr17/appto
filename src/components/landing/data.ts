import {
    isFeaturePublic,
    isFeatureVisible,
    type FeatureKey,
} from "@/lib/features";

type LandingItem<T> = T & {
    featureKey?: FeatureKey;
};

export const navigationLinks = [
    { label: "Recursos", href: "#recursos" },
    { label: "Como Funciona", href: "#como-funciona" },
    { label: "Preços", href: "#precos" },
    { label: "Testemunhos", href: "#testemunhos" },
    { label: "FAQ", href: "#faq" },
];

export const stats = [
    { value: "1", label: "superfície oficial da app", suffix: "" },
    { value: "3", label: "fluxos reais já ativos", suffix: "+" },
    { value: "DOCX", label: "exportação disponível", suffix: "" },
    { value: "24/7", label: "acesso web ao workspace", suffix: "" },
];

export const testimonials: Array<{
    id: number;
    name: string;
    role: string;
    institution: string;
    initials: string;
    rating: number;
    text: string;
}> = [];

const landingFeatures: LandingItem<{
    id: number;
    icon: string;
    title: string;
    description: string;
    highlight: boolean;
}>[] = [
    {
        id: 1,
        icon: "PenTool",
        title: "Escrita Assistida por IA",
        description:
            "Gere secções, parágrafos e argumentos com inteligência artificial treinada para contexto académico moçambicano.",
        highlight: false,
    },
    {
        id: 2,
        icon: "LayoutTemplate",
        title: "Estruturação Automática",
        description:
            "Monografias, seminários, artigos e teses estruturados segundo normas académicas padrão.",
        highlight: true,
    },
    {
        id: 3,
        icon: "Languages",
        title: "Português Académico MZ",
        description:
            "Texto orientado para um tom académico em português usado por estudantes moçambicanos, com revisão humana ainda recomendada.",
        highlight: false,
    },
    {
        id: 4,
        icon: "BookMarked",
        title: "Normalização ABNT",
        description:
            "Referências e citações formatadas automaticamente segundo as normas ABNT exigidas pelas universidades.",
        highlight: true,
    },
    {
        id: 5,
        icon: "Database",
        title: "Base de conhecimento local",
        description:
            "Infraestrutura preparada para fontes locais e institucionais. Ainda não está disponível publicamente na app.",
        highlight: false,
        featureKey: "localRag",
    },
    {
        id: 6,
        icon: "SpellCheck",
        title: "Revisão de Coerência",
        description:
            "Análise inteligente de argumentação, coerência textual e fluidez dos parágrafos.",
        highlight: false,
    },
    {
        id: 7,
        icon: "FileDown",
        title: "Exportação DOCX",
        description:
            "Exporte trabalhos formatados em Word (DOCX). A exportação PDF permanece fora da experiência pública até ser implementada.",
        highlight: false,
    },
    // {
    //   id: 8,
    //   icon: "Coins",
    //   title: "Gestão de Créditos",
    //   description: "Sistema transparente de créditos. Use conforme precisa, recarregue quando quiser.",
    //   highlight: false,
    // },
    // {
    //   id: 9,
    //   icon: "FolderKanban",
    //   title: "Projectos por Curso",
    //   description: "Organize trabalhos por curso, nível académico e tipo. Nunca perca o progresso.",
    //   highlight: false,
    // },
    {
        id: 10,
        icon: "Zap",
        title: "Entrega completa da resposta",
        description:
            "A experiência pública mostra respostas completas. Streaming token-a-token continua desativado até existir suporte real de backend.",
        highlight: false,
        featureKey: "realTimeStreaming",
    },
    // {
    //   id: 11,
    //   icon: "RotateCcw",
    //   title: "Auto-save do editor",
    //   description: "O conteúdo do editor é guardado automaticamente. Recuperação de trabalho, 2FA e gestão de sessões continuam fora do produto público.",
    //   highlight: false,
    //   featureKey: "workRecovery",
    // },
    {
        id: 12,
        icon: "CreditCard",
        title: "Planos Flexíveis",
        description:
            "Planos pensados para estudantes moçambicanos. Desde o gratuito até ao académico intensivo.",
        highlight: false,
    },
];

export const features = landingFeatures.filter((item) =>
    item.featureKey ? isFeatureVisible(item.featureKey) : true,
);

export const howItWorksSteps = [
    {
        step: 1,
        title: "Crie o seu projecto",
        description:
            "Configure o trabalho académico: tema, curso, nível e tipo de documento.",
        icon: "FolderPlus",
    },
    {
        step: 2,
        title: "Defina os parâmetros",
        description:
            "Indique objectivos, metodologia pretendida e palavras-chave relevantes.",
        icon: "Settings",
    },
    {
        step: 3,
        title: "Trabalhe com a IA",
        description:
            "Estruture, escreva e melhore o texto com assistência inteligente personalizada.",
        icon: "Wand2",
    },
    {
        step: 4,
        title: "Exporte e submeta",
        description:
            "Normalize referências, exporte em DOCX e siga para revisão ou submissão.",
        icon: "Send",
    },
];

const landingDifferentiators: LandingItem<{
    title: string;
    description: string;
    icon: string;
}>[] = [
    {
        title: "Português Académico Moçambicano",
        description:
            "A experiência foi escrita para estudantes moçambicanos, mas continua a depender de revisão humana e não substitui validação académica.",
        icon: "Globe",
    },
    {
        title: "Normas ABNT Nativas",
        description:
            "Citações e referências formatadas automaticamente segundo as normas ABNT exigidas pelas universidades moçambicanas.",
        icon: "BookOpen",
    },
    {
        title: "RAG com Fontes Locais",
        description:
            "Funcionalidade planeada. O domínio está a ser preparado, mas a retrieval real ainda não está disponível no produto público.",
        icon: "Library",
        featureKey: "localRag",
    },
    {
        title: "Foco Académico Real",
        description:
            "Não é um gerador genérico. É um copiloto pensado para estruturar e apoiar trabalhos académicos de verdade.",
        icon: "GraduationCap",
    },
    // {
    //     title: "Créditos Transparentes",
    //     description:
    //         "Sem surpresas. Saiba exactamente quanto custa cada acção e gerencie os seus créditos com clareza.",
    //     icon: "Eye",
    // },
    {
        title: "Produto Feito para Moçambique",
        description:
            "Desenvolvido com compreensão real das necessidades dos estudantes e instituições moçambicanas.",
        icon: "MapPin",
    },
];

export const differentiators = landingDifferentiators.filter((item) =>
    item.featureKey ? isFeatureVisible(item.featureKey) : true,
);

export const genericComparison = [
    { feature: "Português académico moçambicano", aptto: true, generic: false },
    { feature: "Normas ABNT nativas", aptto: true, generic: false },
    {
        feature: "Fluxo de editor e projectos próprio",
        aptto: true,
        generic: false,
    },
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
        answer: "Hoje o aptto exporta em DOCX. A exportação em PDF continua fora da experiência pública até existir um renderer dedicado e validado.",
    },
    {
        question: "O aptto serve para monografia e seminário?",
        answer: "Sim. O aptto suporta monografias, seminários, artigos científicos, teses e dissertações. Cada tipo de trabalho tem estruturas e normas específicas que a plataforma respeita.",
    },
    {
        question: "O que significa RAG com fontes locais?",
        answer: "É uma funcionalidade planeada para uma fase posterior. O objetivo é permitir consulta a fontes locais durante a geração, mas isso ainda não está ativo na versão pública atual.",
    },
    {
        question: "O meu orientador vai aceitar?",
        answer: "O aptto ajuda na estrutura e na escrita, mas não substitui revisão, validação factual nem responsabilidade académica do estudante. O texto gerado deve ser revisto antes de submissão.",
    },
    {
        question: "Posso usar no telemóvel?",
        answer: "Sim. O aptto é uma plataforma web responsiva que funciona bem em telemóveis, tablets e computadores. A sua experiência é optimizada para qualquer dispositivo.",
    },
];

export const heroBadges = [
    { label: "PT-MZ Académico", icon: "Languages" },
    { label: "ABNT Ready", icon: "BookMarked" },
    { label: "DOCX Export", icon: "FileDown" },
];

const trustIndicatorCandidates: LandingItem<{ label: string; icon: string }>[] =
    [
        { label: "Português académico MZ", icon: "Check" },
        { label: "Normalização ABNT", icon: "Check" },
        { label: "Exportação DOCX", icon: "Check" },
        {
            label: "Créditos transparentes",
            icon: "Check",
            featureKey: "transparentCredits",
        },
        {
            label: "RAG local em preparação",
            icon: "Check",
            featureKey: "localRag",
        },
    ];

export const trustIndicators = trustIndicatorCandidates.filter((item) =>
    item.featureKey ? isFeaturePublic(item.featureKey) : true,
);

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
