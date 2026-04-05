module.exports = {
  locales: ["pt-MZ", "pt-BR", "en"],
  defaultLocale: "pt-MZ",
  localeDetection: false,
  localeCookie: {
    name: "NEXT_LOCALE",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};
