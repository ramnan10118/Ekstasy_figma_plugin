import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';

console.log('UI: Starting React app...');

const container = document.getElementById('root')!;
console.log('UI: Found container:', container);

const root = createRoot(container);
console.log('UI: Created React root');

root.render(<App />);
console.log('UI: Rendered App component');