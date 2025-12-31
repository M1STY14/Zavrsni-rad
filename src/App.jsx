//aplication frontend
import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './Navigation.jsx';
import Layout from './pages/Layout.jsx';
import Home from './pages/Home.jsx';
import Visualizations from './pages/Visualizations.jsx';
import About from './pages/About.jsx';


//aplikacija
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <BrowserRouter>
          <Nav />
          <Routes>
            <Route path="/" element={<Layout />} />
            <Route index element={<Home />} />
            <Route path="/visualizations" element={<Visualizations />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<h2>404 - Stranica nije pronađena</h2>} />
          </Routes>
        </BrowserRouter>
      </header>
    </div >
  );
}

export default App;