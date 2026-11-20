import { RuntimeDesignProvider } from './ui/RuntimeDesignProvider';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipLayer } from './TooltipLayer';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RuntimeDesignProvider>
      <App />
      <TooltipLayer />
    </RuntimeDesignProvider>
  </StrictMode>,
);

import './ui/index.css';
