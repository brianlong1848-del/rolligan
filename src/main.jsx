import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import JoinGame from './JoinGame.jsx'

// rolligan.com = landing; rolligan.com/join (or ?code=ABCD) = join a live game.
const params = new URLSearchParams(window.location.search)
const isJoin =
  window.location.pathname.replace(/\/$/, '').endsWith('/join') ||
  params.has('code') || params.has('join')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isJoin ? <JoinGame /> : <App />}
  </StrictMode>,
)
