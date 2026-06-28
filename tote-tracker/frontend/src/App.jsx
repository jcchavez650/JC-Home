import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ToteList from './pages/ToteList.jsx';
import ToteDetail from './pages/ToteDetail.jsx';
import ShareView from './pages/ShareView.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ToteList />} />
        <Route path="/tote/:id" element={<ToteDetail />} />
        <Route path="/share/:token" element={<ShareView />} />
      </Routes>
    </BrowserRouter>
  );
}
