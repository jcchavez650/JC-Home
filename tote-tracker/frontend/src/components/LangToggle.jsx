import React from 'react';
import { useLang } from '../context/LangContext.jsx';

// Small button styled like the theme toggle; shows the language you'll switch TO.
export default function LangToggle({ style }) {
  const { lang, toggle } = useLang();
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
      style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.03em', ...style }}
    >
      {lang === 'en' ? 'ES' : 'EN'}
    </button>
  );
}
