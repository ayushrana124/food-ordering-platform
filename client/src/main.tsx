import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './redux/store';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <App />
                <Toaster
                    position="top-center"
                    containerStyle={{ zIndex: 99999 }}
                    toastOptions={{
                        duration: 3000,
                        style: {
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '14px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            zIndex: 99999,
                        },
                        success: {
                            iconTheme: { primary: '#2D6A4F', secondary: '#D8F3DC' },
                        },
                        error: {
                            iconTheme: { primary: '#E63946', secondary: '#FFF0F1' },
                        },
                    }}
                />
            </BrowserRouter>
        </Provider>
    </React.StrictMode>
);

// Register service worker for PWA (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('SW registration failed:', err);
        });
    });
}

// Unregister stale service workers in dev mode
if ('serviceWorker' in navigator && import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
            registration.unregister();
        }
    });
}
