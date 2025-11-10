import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <div>
        <Navbar />
        <Routes>
          <Route path='/' element={<Navigate to="/dashboard" replace />} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/dashboard' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path='/upload' element={<AdminRoute><UploadPage /></AdminRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  </React.StrictMode>
)
