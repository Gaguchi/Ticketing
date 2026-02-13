import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enTickets from './locales/en/tickets.json';
import enDashboard from './locales/en/dashboard.json';
import enCompanies from './locales/en/companies.json';
import enSettings from './locales/en/settings.json';

import kaCommon from './locales/ka/common.json';
import kaTickets from './locales/ka/tickets.json';
import kaDashboard from './locales/ka/dashboard.json';
import kaCompanies from './locales/ka/companies.json';
import kaSettings from './locales/ka/settings.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        tickets: enTickets,
        dashboard: enDashboard,
        companies: enCompanies,
        settings: enSettings,
      },
      ka: {
        common: kaCommon,
        tickets: kaTickets,
        dashboard: kaDashboard,
        companies: kaCompanies,
        settings: kaSettings,
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

// Set Georgian as default if no preference stored
if (!localStorage.getItem('language')) {
  i18n.changeLanguage('ka');
}

export default i18n;
