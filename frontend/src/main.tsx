import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './hooks/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '16px',
            background: '#111827',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            padding: '12px 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
          },
          success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
    </ThemeProvider>
  </React.StrictMode>
);
