import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {FoundationsSite} from './site';
import './site.css';
createRoot(document.getElementById('root')!).render(<StrictMode><FoundationsSite/></StrictMode>);
