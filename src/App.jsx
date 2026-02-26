import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './Navigation.jsx';
import Home from './pages/Home.jsx';
import Visualizations from './pages/Visualizations.jsx';
import About from './pages/About.jsx';
import Nopage from './pages/Nopage.jsx';

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <BrowserRouter>
                    <Nav />
                    <Routes>
                        <Route index element={<Home />} />
                        <Route path="/visualizations" element={<Visualizations />} />
                        <Route path="/about" element={<About />} />
                        <Route path="*" element={<Nopage />} />
                    </Routes>
                </BrowserRouter>
            </header>
        </div>
    );
}

export default App;
