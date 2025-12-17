import React, { useEffect, useState } from 'react'
import API from '../api'
import { useNavigate } from 'react-router-dom'
import { User, Key } from 'lucide-react'

export default function UserSettings(){
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(()=>{
    API.get('/auth/profile').then(res=>{
      setUser(res.data)
    }).catch(()=>{
      navigate('/login')
    }).finally(()=>setLoading(false))
  },[])

  if(loading) return <div className="p-6">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto mt-8 card p-6">
      <div className="flex items-center gap-4 mb-4">
        <User className="w-10 h-10 text-gray-600" />
        <div>
          <div className="font-semibold text-lg">{user.name}</div>
          <div className="text-sm text-gray-500">Role: {user.role}</div>
          <div className="text-sm text-gray-500">Code: {user.code}</div>
        </div>
      </div>

      <div className="space-y-3 text-sm text-gray-700">
        <div>Phone: {user.phone || 'Not provided'}</div>
        <div>Email (admin notifications only): {user.email || 'Not provided'}</div>
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-gray-600" />
          <div className="text-sm text-gray-600">Password resets are handled by your administrator.</div>
        </div>
      </div>
    </div>
  )
}
