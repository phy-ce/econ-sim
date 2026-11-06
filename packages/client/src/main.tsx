import {RuntimeDesignProvider} from './ui/RuntimeDesignProvider';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipLayer } from './TooltipLayer';
import { App } from './App';
import './styles.css';
import './workspace.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RuntimeDesignProvider><App /><TooltipLayer /></RuntimeDesignProvider>
  </StrictMode>,
);

import './strategy.css';

import './readability.css';

import './ui/runtime.css';
