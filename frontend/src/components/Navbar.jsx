import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, LogOut, Home, UploadCloud } from 'lucide-react'
import { Bell } from 'lucide-react'
import API from '../api'

export default function Navbar() {
  const [imgError, setImgError] = useState(false)
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const [unread, setUnread] = useState(0)

  useEffect(()=>{
    let mounted = true
    const load = async () => {
      if (!user) return setUnread(0)
      try {
        const res = await API.get('/notifications')
        if (!mounted) return
        const cnt = (res.data || []).filter(n=>!n.read).length
        setUnread(cnt)
      } catch(e){ }
    }
    load()
    const iv = setInterval(load, 10000)
    return ()=>{ mounted=false; clearInterval(iv) }
  }, [user])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="flex items-center justify-between p-3 border-b bg-white shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <img
          src={'/logo.png'}
          alt="Lalan logo"
          onError={() => setImgError(true)}
          className={imgError ? 'hidden h-11' : 'h-11'}
        />
        <div className="font-semibold text-lg text-gray-800">Lalan Rubbers</div>
      </div>

      <div className="flex items-center gap-4">
        <Link className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900" to="/dashboard"><Home className="w-4 h-4"/> Dashboard</Link>
        {user?.role === 'admin' && (
          <>
            <Link className="flex items-center gap-1 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded" to="/upload"><UploadCloud className="w-4 h-4"/> Upload</Link>
            <Link className="flex items-center gap-1 text-sm text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded" to="/admin/daily-data">Daily Data</Link>
          </>
        )}

        {user?.role === 'admin' && <Link className="text-sm text-gray-600 hover:text-gray-800" to="/admin/analytics">Analytics</Link>}
        {user?.role === 'admin' && <Link className="text-sm text-gray-600 hover:text-gray-800" to="/admin/users">Manage Users</Link>}
        {user?.role === 'admin' && <Link className="text-sm text-gray-600 hover:text-gray-800" to="/admin/codes">Manage Codes</Link>}
        {user?.role === 'admin' && <Link className="text-sm text-gray-600 hover:text-gray-800" to="/admin/notify-jobs">SMS Jobs</Link>}

        {user ? (
          <>
            <Link className="flex items-center gap-3" to="/notifications">
              <Bell className="w-5 h-5 text-gray-600"/>
              {unread>0 && <span className="-ml-3 mt-0.5 inline-flex items-center justify-center w-5 h-5 bg-red-600 text-white text-xs rounded-full">{unread}</span>}
            </Link>

            <Link className="flex items-center gap-2 ml-2" to="/settings"><User className="w-5 h-5 text-gray-600"/>
              <span className="text-sm text-gray-700">{user.name}</span>
            </Link>
            <button className="px-3 py-1 bg-red-50 text-red-600 rounded flex items-center gap-2" onClick={logout}><LogOut className="w-4 h-4"/>Logout</button>
          </>
        ) : (
          <>
            <Link className="text-sm text-blue-600" to="/login">Login</Link>
          </>
        )}
      </div>
    </div>
  )
}
