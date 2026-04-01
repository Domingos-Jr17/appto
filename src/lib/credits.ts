export const AI_ACTION_CREDIT_COSTS = {
    generate: 10,
    improve: 5,
    suggest: 7,
    references: 3,
    outline: 5,
    chat: 3,
    summarize: 3,
    translate: 5,
    citations: 2,
    "plagiarism-check": 15,
    "generate-section": 8,
    "generate-complete": 50,
} as const;

export const DEFAULT_AI_ACTION_COST = 5;

export const CREDIT_DEFAULTS = {
    initialBalance: 150,
    exportDocx: 5,
    exportPdf: 8,
    createProject: 10,
} as const;

export const CREDIT_PACKAGES = {
    starter: { credits: 500, price: 100, currency: "MZN" },
    basic: { credits: 1500, price: 250, currency: "MZN" },
    pro: { credits: 5000, price: 700, currency: "MZN" },
    academic: { credits: 3000, price: 500, currency: "MZN" },
} as const;

export type CreditPackageKey = keyof typeof CREDIT_PACKAGES;

export interface CreditPackageDisplay {
    key: CreditPackageKey;
    name: string;
    description: string;
    credits: number;
    price: number;
    currency: string;
    popular: boolean;
    highlight: boolean;
    features: string[];
}

export const CREDIT_PACKAGES_DISPLAY: CreditPackageDisplay[] = [
    {
        key: "starter",
        name: "Starter",
        description: "Perfeito para começar a experimentar",
        credits: 500,
        price: 100,
        currency: "MZN",
        popular: false,
        highlight: false,
        features: [
            "500 créditos no saldo",
            "Cerca de 50 gerações de conteúdo",
            "Histórico de compra persistido",
        ],
    },
    {
        key: "basic",
        name: "Standard",
        description: "O mais popular para uso regular",
        credits: 1500,
        price: 250,
        currency: "MZN",
        popular: true,
        highlight: true,
        features: [
            "1500 créditos no saldo",
            "Cerca de 150 gerações de conteúdo",
            "Histórico de compra persistido",
        ],
    },
    {
        key: "pro",
        name: "Pro",
        description: "Para utilizadores intensivos",
        credits: 5000,
        price: 700,
        currency: "MZN",
        popular: false,
        highlight: false,
        features: [
            "5000 créditos no saldo",
            "Cerca de 500 gerações de conteúdo",
            "Histórico de compra persistido",
        ],
    },
    {
        key: "academic",
        name: "Académico",
        description: "Ideal para estudantes e investigadores",
        credits: 3000,
        price: 500,
        currency: "MZN",
        popular: false,
        highlight: false,
        features: [
            "3000 créditos no saldo",
            "Cerca de 300 gerações de conteúdo",
            "Histórico de compra persistido",
            "Suporte prioritário",
        ],
    },
];
