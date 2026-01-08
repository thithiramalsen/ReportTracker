import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import App from './App'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import SignupPage from './pages/SignupPage'
import AdminUsers from './pages/AdminUsers'
import AdminCodes from './pages/AdminCodes'
import AdminNotifyJobs from './pages/AdminNotifyJobs'
import AdminNotifyAnalytics from './pages/AdminNotifyAnalytics'
import AdminFeedback from './pages/AdminFeedback'
import FeedbackPage from './pages/FeedbackPage'
import AdminDailyData from './pages/AdminDailyData'
import Notifications from './pages/Notifications'
import OpenNext from './pages/OpenNext'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyPage from './pages/VerifyPage'
import WaitingPage from './pages/WaitingPage'
import UserSettings from './pages/UserSettings'
import Navbar from './components/Navbar'
import ToastProvider from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

import './styles.css'

function NormalizePath(){
  const location = useLocation()
  const navigate = useNavigate()
  React.useEffect(()=>{
    if (location.pathname.startsWith('//')) {
      const fixed = location.pathname.replace(/^\/+/, '/') || '/'
      navigate({ pathname: fixed, search: location.search }, { replace: true })
    }
  }, [location.pathname, location.search, navigate])
  return null
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
      <div>
        <NormalizePath />
        <Navbar />
        <Routes>
          <Route path='/' element={<Navigate to="/dashboard" replace />} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/signup' element={<SignupPage />} />
          <Route path='/forgot' element={<ForgotPassword />} />
          <Route path='/reset' element={<ResetPassword />} />
          <Route path='/reset/:token' element={<ResetPassword />} />
          <Route path='/verify' element={<VerifyPage />} />
          <Route path='/waiting' element={<WaitingPage />} />
          <Route path='/dashboard' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path='/settings' element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
          <Route path='/open' element={<OpenNext />} />
          <Route path='/upload' element={<AdminRoute><UploadPage /></AdminRoute>} />
          <Route path='/admin/users' element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path='/admin/codes' element={<AdminRoute><AdminCodes /></AdminRoute>} />
          <Route path='/admin/notify-jobs' element={<AdminRoute><AdminNotifyJobs /></AdminRoute>} />
          <Route path='/admin/analytics' element={<AdminRoute><AdminNotifyAnalytics /></AdminRoute>} />
          <Route path='/admin/feedback' element={<AdminRoute><AdminFeedback /></AdminRoute>} />
          <Route path='/feedback' element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
          <Route path='/admin/daily-data' element={<AdminRoute><AdminDailyData /></AdminRoute>} />
          <Route path='/notifications' element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        </Routes>
      </div>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
)
