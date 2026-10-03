import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ru from './locales/ru.json';
import uz from './locales/uz.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      uz: { translation: uz },
      en: { translation: en },
    },
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'uz', 'en'],
    interpolation: {
      escapeValue: false, // React уже экранирует
    },
    detection: {
      // Порядок определения:
      // 1. Сохранённый выбор пользователя (localStorage)
      // 2. Язык браузера
      // 3. Язык HTML (html lang="...")
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'price-scanner-language',
    },
  });

export default i18n;