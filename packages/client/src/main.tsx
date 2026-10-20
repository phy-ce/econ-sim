import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipLayer } from './TooltipLayer';
import { App } from './App';
import './styles.css';
import './workspace.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App /><TooltipLayer />
  </StrictMode>,
);

import './strategy.css';
