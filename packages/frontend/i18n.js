// i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./public/locales/en.json"; // Your English translations
import zh from "./public/locales/zh.json"; // Your Chinese translations

i18n
  .use(initReactI18next) // Pass i18n instance to react-i18next.
  .init({
    resources: {
      en: {
        translation: en, // English translation
      },
      zh: {
        translation: zh, // Chinese translation
      },
    },
    lng: "en", // Default language
    fallbackLng: "en", // Fallback language
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

export default i18n;
