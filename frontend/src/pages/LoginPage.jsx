import React, { useState, useEffect } from 'react'
import API from '../api'
import { useToast } from '../components/Toast'
import { useNavigate, Link } from 'react-router-dom'

export default function LoginPage() {
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) navigate('/dashboard')
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    try {
      const res = await API.post('/auth/login', { code, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      try{ toast.show('Logged in', 'success') }catch(e){}
      navigate('/dashboard')
    } catch (err) {
      const em = err?.response?.data?.message || 'Login failed'
      try{ toast.show(em, 'error') }catch(e){}
      setError(em)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 card">
      <h2 className="text-2xl mb-4">Login (Code + Password)</h2>
      <form onSubmit={submit}>
        <div>
          <label className="block text-sm">Code</label>
          <input value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <div className="flex items-center gap-2">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="text-sm text-gray-600" onClick={() => setShowPassword(s => !s)}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        {error && <div className="text-red-600">{error}</div>}
        <button className="mt-3 btn" type="submit">Login</button>
      </form>
      <div className="mt-3 text-sm text-gray-600">If you forget your password, contact your admin to reset it.</div>
      <div className="mt-3 text-sm">
        Don't have an account? <Link to="/signup" className="text-blue-600">Sign up</Link>
      </div>
    </div>
  )
}
