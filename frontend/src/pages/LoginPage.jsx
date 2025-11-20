import React, { useState, useEffect } from 'react'
import API from '../api'
import { useToast } from '../components/Toast'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const res = await API.post('/auth/login', { email, password })
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
      <h2 className="text-2xl mb-4">Login</h2>
      <form onSubmit={submit}>
        <div>
          <label className="block text-sm">Email</label>
          <input className="" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        <button className="mt-3 btn" type="submit">Login</button>
      </form>
      <div className="mt-3 text-sm">
        <a className="text-blue-600" href="/forgot">Forgot password?</a>
      </div>
    </div>
  )
}
