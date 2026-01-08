import React, { useEffect, useState } from 'react'
import API from '../api'
import { useNavigate } from 'react-router-dom'
import { User, Key } from 'lucide-react'
import { useToast } from '../components/Toast'

export default function UserSettings(){
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(()=>{
    API.get('/auth/profile').then(res=>{
      setUser(res.data)
    }).catch(()=>{
      navigate('/login')
    }).finally(()=>setLoading(false))
  },[])

  if(loading) return <div className="p-6">Loading...</div>

  const requestReset = async () => {
    if (!user) return
    setSending(true)
    setPreviewUrl('')
    try {
      const res = await API.post('/auth/forgot', { email: user.email, code: user.code })
      toast.show('If an email is on file, a reset code was sent.', 'success')
      if (res?.data?.previewUrl) setPreviewUrl(res.data.previewUrl)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not send reset email'
      toast.show(msg, 'error')
    } finally {
      setSending(false)
    }
  }

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
          <div className="text-sm text-gray-600">
            <div>Password resets are handled by your administrator.</div>
            <button
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
              onClick={requestReset}
              disabled={sending || (!user.email && !user.code)}
            >
              {sending ? 'Sending…' : 'Send me a reset link/code'}
            </button>
            {!user.email && <div className="text-xs text-gray-500 mt-1">No email on file; admin may need to set one.</div>}
            {previewUrl && <div className="text-xs text-green-700 mt-2">Preview (dev only): <a className="underline" href={previewUrl} target="_blank" rel="noreferrer">open</a></div>}
          </div>
        </div>
      </div>
    </div>
  )
}
