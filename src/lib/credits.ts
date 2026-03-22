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
  createProject: 10,
} as const;
