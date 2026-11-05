import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import trTranslations from "./locales/tr.json";
import enTranslations from "./locales/en.json";

const resources = {
  tr: trTranslations,
  en: enTranslations,
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    // the server cannot read localStorage, so both sides start in Turkish and the saved
    // language is applied after hydration (see RootComponent); otherwise React hydration fails
    lng: "tr",
    fallbackLng: "tr",

    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// keep <html lang> in sync so CSS uppercase and screen readers use the right language
i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") document.documentElement.lang = lng;
});

export default i18n;
