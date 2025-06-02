import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { CartProvider } from './context/CartContext.tsx'
import { register } from "./serviceWorkerRegistration.ts";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
    <BrowserRouter>
    <CartProvider>
      <App/>
      </CartProvider>
    </BrowserRouter>
    </Suspense>
  </StrictMode>,
)
register();