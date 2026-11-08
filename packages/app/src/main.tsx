import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './original/original.css';
import { CSS_REPORTE } from './original/reporteCss';

const estilo = document.createElement('style');
estilo.id = 'repEstilo'; estilo.textContent = CSS_REPORTE;
document.head.appendChild(estilo);

createRoot(document.getElementById('raiz')!).render(<StrictMode><App /></StrictMode>);
