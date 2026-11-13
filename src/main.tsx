import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const savedTheme = localStorage.getItem("app_theme") || "obsidian";
document.documentElement.className = `theme-${savedTheme}`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
