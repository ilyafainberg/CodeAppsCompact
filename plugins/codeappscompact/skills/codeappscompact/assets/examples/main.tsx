import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './style.css';
const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } });
ReactDOM.createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><p className="notice">Synthetic local demo. No tenant or live connector.</p><App /></QueryClientProvider>);
