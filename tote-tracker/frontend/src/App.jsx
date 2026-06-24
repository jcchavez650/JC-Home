import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ToteList from './pages/ToteList.jsx';
import ToteDetail from './pages/ToteDetail.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ToteList />} />
        <Route path="/tote/:id" element={<ToteDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
