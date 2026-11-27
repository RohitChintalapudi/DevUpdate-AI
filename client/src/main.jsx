import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppearanceProvider } from './context/AppearanceContext'
import { AuthProvider } from './context/AuthContext'
import { applyAppearance, readAppearance } from './utils/appearanceSettings'
import './index.css'

applyAppearance(readAppearance())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppearanceProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppearanceProvider>
    </BrowserRouter>
  </StrictMode>,
)
