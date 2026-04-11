import {
  isFeaturePublic,
  isFeatureVisible,
  type FeatureKey,
} from "@/lib/features";
import { BILLING_PLAN_DISPLAY, EXTRA_WORKS } from "@/lib/billing";

type TranslationValues = Record<string, string | number>;
type Translator = (key: string, values?: TranslationValues) => string;

type LandingItem<T> = T & {
  featureKey?: FeatureKey;
};

const featureDefinitions: LandingItem<{
  id: number;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  highlight: boolean;
}>[] = [
  {
    id: 1,
    icon: "PenTool",
    titleKey: "items.aiWriting.title",
    descriptionKey: "items.aiWriting.description",
    highlight: false,
  },
  {
    id: 2,
    icon: "LayoutTemplate",
    titleKey: "items.autoStructure.title",
    descriptionKey: "items.autoStructure.description",
    highlight: true,
  },
  {
    id: 3,
    icon: "Languages",
    titleKey: "items.mzPortuguese.title",
    descriptionKey: "items.mzPortuguese.description",
    highlight: false,
  },
  {
    id: 4,
    icon: "BookMarked",
    titleKey: "items.abnt.title",
    descriptionKey: "items.abnt.description",
    highlight: true,
  },
  {
    id: 5,
    icon: "Database",
    titleKey: "items.localKnowledge.title",
    descriptionKey: "items.localKnowledge.description",
    highlight: false,
    featureKey: "localRag",
  },
  {
    id: 6,
    icon: "SpellCheck",
    titleKey: "items.consistencyReview.title",
    descriptionKey: "items.consistencyReview.description",
    highlight: false,
  },
  {
    id: 7,
    icon: "FileDown",
    titleKey: "items.docxExport.title",
    descriptionKey: "items.docxExport.description",
    highlight: false,
  },
  {
    id: 10,
    icon: "Zap",
    titleKey: "items.streaming.title",
    descriptionKey: "items.streaming.description",
    highlight: false,
    featureKey: "realTimeStreaming",
  },
  {
    id: 12,
    icon: "CreditCard",
    titleKey: "items.flexiblePlans.title",
    descriptionKey: "items.flexiblePlans.description",
    highlight: false,
  },
];

const differentiatorDefinitions: LandingItem<{
  icon: string;
  titleKey: string;
  descriptionKey: string;
}>[] = [
  {
    icon: "Globe",
    titleKey: "items.mzAcademicPortuguese.title",
    descriptionKey: "items.mzAcademicPortuguese.description",
  },
  {
    icon: "BookOpen",
    titleKey: "items.nativeAbnt.title",
    descriptionKey: "items.nativeAbnt.description",
  },
  {
    icon: "Library",
    titleKey: "items.localRag.title",
    descriptionKey: "items.localRag.description",
    featureKey: "localRag",
  },
  {
    icon: "GraduationCap",
    titleKey: "items.realAcademicFocus.title",
    descriptionKey: "items.realAcademicFocus.description",
  },
  {
    icon: "MapPin",
    titleKey: "items.madeForMozambique.title",
    descriptionKey: "items.madeForMozambique.description",
  },
];

const genericComparisonDefinitions = [
  { key: "mozambiquePortuguese", aptto: true, generic: false },
  { key: "abntReady", aptto: true, generic: false },
  { key: "docxFormatted", aptto: true, generic: false },
  { key: "guidedStructure", aptto: true, generic: false },
  { key: "mozambiqueContext", aptto: true, generic: false },
  { key: "affordablePricing", aptto: true, generic: false },
  { key: "fastAnswers", aptto: false, generic: true },
] as const;

const faqKeys = [
  "item1",
  "item2",
  "item3",
  "item4",
  "item5",
  "item6",
  "item7",
  "item8",
] as const;

const heroBadgeDefinitions = [
  { key: "mzAcademic", icon: "Languages" },
  { key: "abntReady", icon: "BookMarked" },
  { key: "docxExport", icon: "FileDown" },
] as const;

const trustIndicatorDefinitions: LandingItem<{ key: string; icon: string }>[] = [
  { key: "mzAcademic", icon: "Check" },
  { key: "abnt", icon: "Check" },
  { key: "docx", icon: "Check" },
  {
    key: "transparentCredits",
    icon: "Check",
    featureKey: "transparentCredits",
  },
  {
    key: "localRag",
    icon: "Check",
    featureKey: "localRag",
  },
];

const footerSocialLinks = [
  { key: "linkedin", href: "#", icon: "Linkedin" },
  { key: "twitter", href: "#", icon: "Twitter" },
  { key: "instagram", href: "#", icon: "Instagram" },
  { key: "facebook", href: "#", icon: "Facebook" },
] as const;

export function getNavigationLinks(t: Translator) {
  return [
    { label: t("resources"), href: "#recursos" },
    { label: t("pricing"), href: "#precos" },
    { label: t("faq"), href: "#faq" },
  ];
}

export function getFeatures(t: Translator) {
  return featureDefinitions
    .filter((item) => (item.featureKey ? isFeatureVisible(item.featureKey) : true))
    .map(({ titleKey, descriptionKey, ...item }) => ({
      ...item,
      title: t(titleKey),
      description: t(descriptionKey),
    }));
}

export function getDifferentiators(t: Translator) {
  return differentiatorDefinitions
    .filter((item) => (item.featureKey ? isFeatureVisible(item.featureKey) : true))
    .map(({ titleKey, descriptionKey, ...item }) => ({
      ...item,
      title: t(titleKey),
      description: t(descriptionKey),
    }));
}

export function getGenericComparison(t: Translator) {
  return genericComparisonDefinitions.map((item) => ({
    feature: t(item.key),
    aptto: item.aptto,
    generic: item.generic,
  }));
}

const pricingPlanKeyMap = {
  FREE: "free",
  STARTER: "starter",
  PRO: "pro",
} as const;

export function getPricingPlans(t: Translator) {
  return BILLING_PLAN_DISPLAY.map((plan) => {
    const planKey = pricingPlanKeyMap[plan.key];
    const name = t(`plans.${planKey}.name`);

    return {
      id: plan.key.toLowerCase(),
      name,
      price: plan.price,
      currency: t("currency"),
      period: plan.price > 0 ? t("perMonthShort") : t("forever"),
      description: t(`plans.${planKey}.description`),
      features: [
        t(`plans.${planKey}.features.works`, { count: plan.worksPerMonth }),
        t(`plans.${planKey}.features.feature1`),
        t(`plans.${planKey}.features.feature2`),
        ...(planKey === "pro" ? [t(`plans.${planKey}.features.feature3`)] : []),
      ].map((text) => ({ text, included: true })),
      cta: plan.key === "FREE" ? t("startFree") : t("choose", { name }),
      highlighted: plan.popular,
      badge: plan.popular ? t("popular") : null,
    };
  });
}

export function getFaqs(t: Translator) {
  return faqKeys.map((key) => ({
    question: t(`${key}.question`),
    answer: t(`${key}.answer`, {
      starterPrice: BILLING_PLAN_DISPLAY[1]?.price ?? 0,
      proPrice: BILLING_PLAN_DISPLAY[2]?.price ?? 0,
      extraWorkPrice: EXTRA_WORKS.price,
      validityMonths: EXTRA_WORKS.validityMonths,
    }),
  }));
}

export function getHeroBadges(t: Translator) {
  return heroBadgeDefinitions.map((item) => ({
    label: t(item.key),
    icon: item.icon,
  }));
}

export function getTrustIndicators(t: Translator) {
  return trustIndicatorDefinitions
    .filter((item) => (item.featureKey ? isFeaturePublic(item.featureKey) : true))
    .map(({ key, ...item }) => ({
      ...item,
      label: t(key),
    }));
}

export function getFooterLinks(t: Translator) {
  return {
    product: [
      { label: t("links.features"), href: "#recursos" },
      { label: t("links.pricing"), href: "#precos" },
      { label: t("links.demo"), href: "#demo" },
      { label: t("links.faq"), href: "#faq" },
    ],
    company: [
      { label: t("links.about"), href: "#" },
      { label: t("links.blog"), href: "#" },
      { label: t("links.careers"), href: "#" },
      { label: t("links.contact"), href: "#" },
    ],
    legal: [
      { label: t("links.terms"), href: "#" },
      { label: t("links.privacy"), href: "#" },
      { label: t("links.cookies"), href: "#" },
    ],
    social: footerSocialLinks.map((item) => ({
      label: t(`social.${item.key}`),
      href: item.href,
      icon: item.icon,
    })),
  };
}
