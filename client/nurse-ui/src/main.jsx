import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import React from 'react'
import './index.css'
import App from './App.jsx'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
createRoot(document.getElementById('root')).render(
  
 <StrictMode>
    <ClerkProvider publishableKey={clerkPubKey} navigate={(to) => window.history.pushState({}, "", to)}>
     
        <App />
      
    </ClerkProvider>
  </StrictMode>,
 
 
)
