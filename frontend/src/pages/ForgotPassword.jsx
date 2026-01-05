import React, { useState } from 'react'
import API from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    try {
      const resp = await API.post('/auth/forgot', email ? { email } : { code })
      if (resp.data && resp.data.previewUrl) setStatus(`Email sent (preview): ${resp.data.previewUrl}`)
      else setStatus('If the account exists you will receive an email with reset instructions.')
    } catch (err) {
      console.error(err)
      setStatus('Request failed')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card p-6">
        <h2 className="text-2xl mb-4">Password reset</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your email" className="w-full border p-2 rounded mt-1" />
            <div className="text-xs text-gray-500 mt-1">Or enter your code below</div>
          </div>
          <div>
            <label className="block text-sm">Code</label>
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="your code" className="w-full border p-2 rounded mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">Send reset email</button>
            <div className="text-sm text-gray-600">{status}</div>
          </div>
        </form>
      </div>
    </div>
  )
}
