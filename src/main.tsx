import './aws-sdk-polyfill.js';
import './aws-sdk-wrapper';
import './aws-sdk-debug.js';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

window.onerror = function(message, _source, _lineno, _colno, error) {
  console.error('Global error:', message, error);
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
