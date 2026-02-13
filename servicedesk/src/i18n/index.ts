import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enTickets from './locales/en/tickets.json';
import enAuth from './locales/en/auth.json';

import kaCommon from './locales/ka/common.json';
import kaTickets from './locales/ka/tickets.json';
import kaAuth from './locales/ka/auth.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        tickets: enTickets,
        auth: enAuth,
      },
      ka: {
        common: kaCommon,
        tickets: kaTickets,
        auth: kaAuth,
      },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
  });

if (!localStorage.getItem('language')) {
  i18n.changeLanguage('ka');
}

export default i18n;
