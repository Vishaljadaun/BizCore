import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// StrictMode: development-only tool
// - Detects potential problems in your code
// - Renders components twice to find side effect bugs
// - Does NOT affect production build