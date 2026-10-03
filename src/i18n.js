import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ru from './locales/ru.json';
import uz from './locales/uz.json';
import en from './locales/en.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import tr from './locales/tr.json';
import es from './locales/es.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import id from './locales/id.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'ru', label: 'Русский', native: 'Русский', dir: 'ltr' },
  { code: 'uz', label: "O'zbekcha", native: "O'zbekcha", dir: 'ltr' },
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'zh', label: 'Chinese', native: '中文', dir: 'ltr' },
  { code: 'ja', label: 'Japanese', native: '日本語', dir: 'ltr' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe', dir: 'ltr' },
  { code: 'es', label: 'Spanish', native: 'Español', dir: 'ltr' },
  { code: 'de', label: 'German', native: 'Deutsch', dir: 'ltr' },
  { code: 'fr', label: 'French', native: 'Français', dir: 'ltr' },
  { code: 'id', label: 'Indonesian', native: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'pt', label: 'Portuguese', native: 'Português', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      uz: { translation: uz },
      en: { translation: en },
      zh: { translation: zh },
      ja: { translation: ja },
      tr: { translation: tr },
      es: { translation: es },
      de: { translation: de },
      fr: { translation: fr },
      id: { translation: id },
      pt: { translation: pt },
      ar: { translation: ar },
    },
    fallbackLng: 'ru',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'price-scanner-language',
    },
  });

// Устанавливаем dir для html в зависимости от языка
const setDocumentDirection = (lng) => {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === lng);
  const dir = lang?.dir || 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
};

i18n.on('languageChanged', setDocumentDirection);

// Устанавливаем сразу при инициализации
setDocumentDirection(i18n.language);

export default i18n;