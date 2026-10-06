import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './presentation/App'
import './index.css'
import { registerServiceWorker } from './infrastructure/pwa'

createRoot(document.getElementById('root')).render(<App />)

registerServiceWorker()
