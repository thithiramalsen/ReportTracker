import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import API from '../api'

export default function ResetPassword(){
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState(token || '')
  const [status, setStatus] = useState('')

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
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border p-2 rounded mt-1" />
          </div>
          <div>
            <label className="block text-sm">Confirm password</label>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full border p-2 rounded mt-1" />
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
