import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useThemeStore } from './store/themeStore'
 
// Apply saved theme BEFORE first render
// Agar yeh nahi kiya toh dark → light "flash" dikhega
const isDark = useThemeStore.getState().isDark;
document.documentElement.classList.toggle('dark', isDark);
 
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
 