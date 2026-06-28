import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ToteList from './pages/ToteList.jsx';
import ToteDetail from './pages/ToteDetail.jsx';
import ShareView from './pages/ShareView.jsx';
import useTheme from './hooks/useTheme.js';

export default function App() {
  const { theme, toggle } = useTheme();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ToteList theme={theme} onToggleTheme={toggle} />} />
        <Route path="/tote/:id" element={<ToteDetail theme={theme} onToggleTheme={toggle} />} />
        <Route path="/share/:token" element={<ShareView theme={theme} onToggleTheme={toggle} />} />
      </Routes>
    </BrowserRouter>
  );
}
