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
  academic: { credits: 15000, price: 1800, currency: "MZN" },
} as const;

export type CreditPackageKey = keyof typeof CREDIT_PACKAGES;
