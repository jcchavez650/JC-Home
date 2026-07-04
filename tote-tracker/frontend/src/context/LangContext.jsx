import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translate } from '../i18n.js';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const toggle = useCallback(() => setLang(l => (l === 'en' ? 'es' : 'en')), []);
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
