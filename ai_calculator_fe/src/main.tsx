import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Remove StrictMode wrapper
createRoot(document.getElementById('root')!).render(
  <App />
);
