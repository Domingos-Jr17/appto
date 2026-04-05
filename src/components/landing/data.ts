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
    { label: "Preços", href: "#precos" },
    { label: "FAQ", href: "#faq" },
];

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
            "Trabalhos de investigação estruturados segundo normas académicas padrão.",
        highlight: true,
    },
    {
        id: 3,
        icon: "Languages",
        title: "Português Académico MZ",
        description:
            "Texto orientado para um tom académico em português usado por estudantes moçambicanos.",
        highlight: false,
    },
    {
        id: 4,
        icon: "BookMarked",
        title: "Normalização ABNT",
        description:
            "Referências, capas e sumários com foco em normas ABNT e modelos institucionais.",
        highlight: true,
    },
    {
        id: 5,
        icon: "Database",
        title: "Base de conhecimento local",
        description:
            "Base RAG preparada para fontes locais, institucionais e documentos carregados por administradores.",
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
            "Exporte em DOCX em todos os pacotes e use PDF no plano PRO.",
        highlight: false,
    },
    {
        id: 10,
        icon: "Zap",
        title: "Entrega completa da resposta",
        description:
            "O workspace já suporta respostas progressivas no backend.",
        highlight: false,
        featureKey: "realTimeStreaming",
    },
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

const landingDifferentiators: LandingItem<{
    title: string;
    description: string;
    icon: string;
}>[] = [
    {
        title: "Português Académico Moçambicano",
        description:
            "A experiência foi escrita para estudantes moçambicanos.",
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
            "Capacidade em activação controlada, pensada para documentos curados e fontes institucionais.",
        icon: "Library",
        featureKey: "localRag",
    },
    {
        title: "Foco Académico Real",
        description:
            "Não é um gerador genérico. É um copiloto pensado para estruturar e apoiar trabalhos académicos de verdade.",
        icon: "GraduationCap",
    },
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
    { feature: "Normas ABNT prontas para submissão", aptto: true, generic: false },
    {
        feature: "Documento formatado em DOCX",
        aptto: true,
        generic: false,
    },
    { feature: "Estrutura guiada passo a passo", aptto: true, generic: false },
    { feature: "Contexto do ensino moçambicano", aptto: true, generic: false },
    { feature: "Preços em MZN acessíveis", aptto: true, generic: false },
    { feature: "Respostas rápidas para qualquer tema", aptto: false, generic: true },
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
        answer: "Não. O aptto estrutura, sugere e formata — mas a revisão e a responsabilidade académica são tuas. É a diferença entre um copiloto e um gerador.",
    },
    {
        question: "O meu orientador vai notar que usei IA?",
        answer: "O aptto produz texto em português académico moçambicano, com normas ABNT e estrutura coerente. Não é detectável como IA genérica. Mas recomendamos sempre que revês e personalizas o conteúdo antes de submeter.",
    },
    {
        question: "Quanto tempo poupo com o aptto?",
        answer: "A estruturação automática poupa-te horas de organização. A normalização ABNT poupa-te mais horas de formatação manual. No total, um trabalho que levaria uma noite inteira fica pronto em fracções de tempo.",
    },
    {
        question: "O aptto serve para o meu tipo de trabalho?",
        answer: "Sim. O aptto cobre três níveis: ensino secundário (trabalhos escolares), ensino técnico (trabalhos práticos e relatórios) e ensino superior (trabalhos de investigação). Cada nível tem a sua estrutura, prompts e capas específicas.",
    },
    {
        question: "Como funcionam os preços?",
        answer: `Começas grátis com 1 trabalho por mês. Se precisares de mais, os pacotes pagos vão de ${BILLING_PLAN_DISPLAY[1].price} a ${BILLING_PLAN_DISPLAY[2].price} MZN/mês. Trabalhos extras custam ${EXTRA_WORKS.price} MZN cada e valem ${EXTRA_WORKS.validityMonths} meses.`,
    },
    {
        question: "Posso usar no telemóvel?",
        answer: "Sim. O aptto funciona no browser — telemóvel, tablet ou computador. Não precisas de instalar nada.",
    },
    {
        question: "O aptto usa português de Moçambique?",
        answer: "Sim. O texto é orientado para o português académico usado nas universidades moçambicanas. Sem brasileirismos, sem linguagem genérica de chatbot.",
    },
    {
        question: "Posso exportar em DOCX e PDF?",
        answer: "DOCX está disponível em todos os planos. PDF é exclusivo do plano PRO.",
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
