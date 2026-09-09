import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Feuille de style globale : elle assemble tokens, base, animations et
// composants dans le bon ordre (voir src/styles/index.css).
import './styles/index.css';

import { App } from './app/App';
import { registerServiceWorker } from './pwa/register';

const container = document.getElementById('root');
if (!container) throw new Error('Élément #root introuvable');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
