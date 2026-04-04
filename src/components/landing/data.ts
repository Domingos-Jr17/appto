import {
    isFeaturePublic,
    isFeatureVisible,
    type FeatureKey,
} from "@/lib/features";
import { BILLING_PLAN_DISPLAY, EXTRA_WORKS } from "@/lib/billing";

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
            "Referências, capas e sumários com foco em normas ABNT e modelos institucionais. A revisão académica final continua recomendada.",
        highlight: true,
    },
    {
        id: 5,
        icon: "Database",
        title: "Base de conhecimento local",
        description:
            "Base RAG preparada para fontes locais, institucionais e documentos carregados por administradores. A experiência pública continua em activação controlada.",
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
            "Exporte em DOCX em todos os pacotes e use PDF no plano PRO, com foco crescente em alinhamento institucional.",
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
            "O workspace já suporta respostas progressivas no backend. A experiência continua a melhorar conforme o provider e a qualidade da ligação.",
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
        title: "Pacotes Flexíveis",
        description:
            "Pacotes pensados para estudantes moçambicanos. Desde o gratuito até ao académico intensivo.",
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
            "Capacidade em activação controlada, pensada para documentos curados e fontes institucionais, não como biblioteca infinita aberta ao público.",
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
    { feature: "Planos e extras transparentes", aptto: true, generic: false },
];

export const pricingPlans = BILLING_PLAN_DISPLAY.map((plan) => ({
    id: plan.key.toLowerCase(),
    name: plan.name,
    price: plan.price,
    currency: "MZN",
    period: plan.price > 0 ? "por mês" : "para sempre",
    description: plan.description,
    features: [...plan.features],
    cta: plan.key === "FREE" ? "Começar Grátis" : `Escolher ${plan.name}`,
    highlighted: plan.popular,
    badge: plan.popular ? "Mais Popular" : null,
}));

export const faqs = [
    {
        question: "O aptto escreve o trabalho por mim?",
        answer: "Não. O aptto é um copiloto académico que o ajuda a estruturar, melhorar e normalizar o seu trabalho. A escrita final é sempre sua - a IA assiste, não substitui o seu pensamento académico.",
    },
    {
        question: "O aptto usa português de Moçambique?",
        answer: "Sim. O aptto foi orientado para produzir texto em português académico moçambicano, mas a revisão humana continua essencial antes da submissão.",
    },
    {
        question: "Como funcionam os planos e trabalhos extras?",
        answer: `Cada pacote inclui um número fixo de trabalhos por mês. Quando precisar de mais capacidade, pode comprar trabalhos extras por ${EXTRA_WORKS.price} MZN cada, com validade de ${EXTRA_WORKS.validityMonths} meses.`,
    },
    {
        question: "Posso exportar em DOCX e PDF?",
        answer: "Sim. O aptto exporta em DOCX para todos os pacotes e disponibiliza PDF para utilizadores PRO.",
    },
    {
        question: "O aptto serve para monografia e seminário?",
        answer: "Sim. O aptto suporta monografias, seminários, artigos científicos, teses e dissertações. Cada tipo de trabalho tem estruturas e normas específicas que a plataforma respeita.",
    },
    {
        question: "O que significa RAG com fontes locais?",
        answer: "Significa usar fontes curadas e documentos indexados para apoiar respostas factuais. A capacidade está em activação controlada e ainda não funciona como uma biblioteca pública ilimitada dentro do produto.",
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
