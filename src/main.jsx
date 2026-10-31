import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import JoinGame from './JoinGame.jsx'
import PlayHome from './host/PlayHome.jsx'
import HostGame from './host/HostGame.jsx'

// rolligan.com = landing; /join (or ?code=ABCD) = join a live game;
// /play = the Android app's start screen; /host = banker mode (Android app only).
const params = new URLSearchParams(window.location.search)
const path = window.location.pathname.replace(/\/$/, '')
const isJoin = path.endsWith('/join') || params.has('code') || params.has('join')
const screen = path.endsWith('/host') ? <HostGame />
  : path.endsWith('/play') ? <PlayHome />
  : isJoin ? <JoinGame />
  : <App />

createRoot(document.getElementById('root')).render(
  <StrictMode>{screen}</StrictMode>,
)
