import React from 'react'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />

  const user = JSON.parse(localStorage.getItem('user') || 'null')
  if (user && user.isApproved === false) {
    return <Navigate to="/waiting" replace />
  }

  return children
}
