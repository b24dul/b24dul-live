import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/providers';
import { App } from './app/App';
import './styles/index.css';

const element = document.getElementById('root');
if (!element) throw new Error('Missing application root');

createRoot(element).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
