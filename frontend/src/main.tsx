import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Providers } from './providers'
import { SmoothScrollProvider } from './providers/SmoothScrollProvider'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Providers>
        <SmoothScrollProvider>
          <App />
        </SmoothScrollProvider>
      </Providers>
    </BrowserRouter>
  </StrictMode>,
)