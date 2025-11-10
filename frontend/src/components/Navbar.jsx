import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const [imgError, setImgError] = useState(false)
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="flex items-center justify-between p-3 border-b bg-white">
      <div className="flex items-center gap-3">
        <img
          src={'/logo.png'}
          alt="Lalan logo"
          onError={() => setImgError(true)}
          className={imgError ? 'hidden h-11' : 'h-11'}
        />
        <div className="font-bold text-lg">Lalan rubbers Pvt LTD</div>
      </div>

      <div className="flex items-center gap-4">
        <Link className="text-sm text-gray-700" to="/dashboard">Dashboard</Link>
        {user?.role === 'admin' && <Link className="text-sm text-gray-700" to="/upload">Upload</Link>}
        {user ? (
          <>
            <span className="text-sm text-gray-600">{user.name}</span>
            <button className="px-3 py-1 bg-red-50 text-red-600 rounded" onClick={logout}>Logout</button>
          </>
        ) : (
          <Link className="text-sm text-blue-600" to="/login">Login</Link>
        )}
      </div>
    </div>
  )
}
