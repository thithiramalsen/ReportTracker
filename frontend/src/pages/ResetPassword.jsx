import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import API from '../api'

export default function ResetPassword(){
  const { token } = useParams()
  const navigate = useNavigate()
  // Also support ?code=... query param in addition to /reset/:token
  const urlCode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('code') : ''
  const initialCode = urlCode || token || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState(initialCode)
  const [status, setStatus] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setStatus('Passwords do not match'); return }
    try {
      const payload = code ? { token: code, password } : { token, password }
      await API.post('/auth/reset', payload)
      setStatus('Password reset. Redirecting to login...')
      setTimeout(()=>navigate('/login'), 1200)
    } catch (err) { console.error(err); setStatus('Reset failed') }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card p-6">
        <h2 className="text-2xl mb-4">Reset Password</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm">Reset code</label>
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="Enter the 6-digit code" className="w-full border p-2 rounded mt-1" />
          </div>
          <div>
            <label className="block text-sm">New password</label>
            <div className="mt-1 relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full border p-2 rounded" />
              <button type="button" className="absolute right-2 top-2 text-gray-600" onClick={()=>setShowPassword(s=>!s)} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm">Confirm password</label>
            <div className="mt-1 relative">
              <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full border p-2 rounded" />
              <button type="button" className="absolute right-2 top-2 text-gray-600" onClick={()=>setShowConfirm(s=>!s)} aria-label="Toggle confirm password visibility">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-green-600 text-white rounded">Set password</button>
            <div className="text-sm text-gray-600">{status}</div>
          </div>
        </form>
      </div>
    </div>
  )
}
