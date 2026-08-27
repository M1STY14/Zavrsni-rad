import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';
import AppShell from './components/AppShell';
import { LanguageProvider } from './i18n/index';
import { ThemeProvider } from './theme';

// Single client for the app's lifetime. Default staleTime of 60s means repeat
// fetches within a minute return from cache — the proof flow benefits the most
// (clicking the same leaf twice doesn't re-hit the server).
const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: 60_000, refetchOnWindowFocus: false },
    },
});

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <LanguageProvider>
                <ThemeProvider>
                    <div className="App">
                        <AppShell />
                    </div>
                </ThemeProvider>
            </LanguageProvider>
        </QueryClientProvider>
    );
}
