export type FeatureStatus = "real" | "beta" | "hidden";

export type FeatureKey =
  | "localRag"
  | "pdfExport"
  | "realTimeStreaming"
  | "workRecovery"
  | "twoFactorAuth"
  | "passwordReset"
  | "mobilePayments"
  | "transparentCredits"
  | "landingSocialProof"
  | "landingTestimonials";

export const featureRegistry: Record<FeatureKey, FeatureStatus> = {
  localRag: "hidden",
  pdfExport: "beta",
  realTimeStreaming: "beta",
  workRecovery: "real",
  twoFactorAuth: "beta",
  passwordReset: "beta",
  mobilePayments: "beta",
  transparentCredits: "real",
  landingSocialProof: "real",
  landingTestimonials: "real",
};

export function getFeatureStatus(feature: FeatureKey): FeatureStatus {
  return featureRegistry[feature];
}

export function isFeatureVisible(feature: FeatureKey) {
  return getFeatureStatus(feature) !== "hidden";
}

export function isFeaturePublic(feature: FeatureKey) {
  return getFeatureStatus(feature) === "real";
}
