import React, { useState } from 'react'
import API from '../api'
import { useToast } from '../components/Toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const toast = useToast()

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await API.post('/auth/forgot', { email })
      let msg = res.data.message || 'If that email exists, a reset link was sent'
      if (res.data.resetToken) msg = `${res.data.message} Token: ${res.data.resetToken}`
      setMessage(msg)
      if (res.data.previewUrl) setPreview(res.data.previewUrl)
        try { toast.show('Reset email sent', 'success') } catch(e){}
    } catch (err) {
      const em = err?.response?.data?.message || 'Error'
        try { toast.show(em, 'error') } catch(e){}
      setError(em)
    }
  }

  const [preview, setPreview] = useState(null)

  return (
    <div className="max-w-md mx-auto mt-20 card">
      <h2 className="text-2xl mb-4">Forgot Password</h2>
      <form onSubmit={submit}>
        <div>
          <label className="block text-sm">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        {message && <div className="text-green-600">{message}</div>}
        {preview && <div className="mt-2"><a className="text-blue-600" target="_blank" rel="noreferrer" href={preview}>Open email preview</a></div>}
        <button className="mt-3 btn" type="submit">Send reset link</button>
      </form>
    </div>
  )
}
