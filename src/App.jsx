import React from 'react';
import './App.css';
import AppShell from './components/AppShell.jsx';
import { LanguageProvider } from './i18n/index.js';

function App() {
    return (
        <LanguageProvider>
            <div className="App">
                <AppShell />
            </div>
        </LanguageProvider>
    );
}

export default App;
