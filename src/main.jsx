import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

import UserHeartbeat from './components/UserHeartbeat'
import './index.css'
import './App.css'
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UserHeartbeat />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)



