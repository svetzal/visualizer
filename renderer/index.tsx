import React from 'react';
import { createRoot } from 'react-dom/client';
import ReactFlowApp from './ReactFlowApp';

console.log('[Renderer] React index.tsx loading...');

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <React.StrictMode>
    <ReactFlowApp />
  </React.StrictMode>
);

console.log('[Renderer] React app mounted');
