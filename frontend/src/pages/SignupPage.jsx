import React, { useState } from 'react'
import API from '../api'
import { useNavigate } from 'react-router-dom'
import { rules, validate as validatePw } from '../utils/passwordRules'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pwErrors, setPwErrors] = useState([])
  const [pwStatus, setPwStatus] = useState({ valid: false, unmet: [] })
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    // Client-side validation (authoritative check before submit)
    const client = validatePw(password)
    setPwStatus(client)
    if (!client.valid) {
      setPwErrors(client.unmet.map(k => rules.find(r => r.key === k).label))
      return
    }

    try {
      const res = await API.post('/auth/signup', { name, email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      // If the server returned a previewUrl (Ethereal) or message, show it instead of immediately navigating
      if (res.data.previewUrl || res.data.verifyToken) {
        setInfo({ message: res.data.message, previewUrl: res.data.previewUrl, verifyToken: res.data.verifyToken })
        return
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data?.message || 'Signup failed')
    }
  }

  const [info, setInfo] = React.useState(null)

    function onPasswordChange(v) {
      setPassword(v)
      setPwErrors([])
      const s = validatePw(v)
      setPwStatus(s)
    }

  return (
    <div className="max-w-md mx-auto mt-20 card">
      <h2 className="text-2xl mb-4">Create account</h2>
      <form onSubmit={submit}>
        <div>
          <label className="block text-sm">Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input type="password" value={password} onChange={e=>onPasswordChange(e.target.value)} />
          <div className="mt-2 text-sm">
            {rules.map(r => (
              <div key={r.key} className={pwStatus.unmet.includes(r.key) ? 'text-red-600' : 'text-green-600'}>
                {pwStatus.unmet.includes(r.key) ? '✖' : '✓'} {r.label}
              </div>
            ))}
          </div>
        </div>
        {error && <div className="text-red-600">{error}</div>}
        {info && (
          <div className="mb-3">
            <div className="text-green-600">{info.message}</div>
            {info.previewUrl && <div className="mt-2"><a className="text-blue-600" target="_blank" rel="noreferrer" href={info.previewUrl}>Open email preview</a></div>}
            {info.verifyToken && <div className="mt-2 text-sm">Verify Token: <code>{info.verifyToken}</code></div>}
          </div>
        )}
        <button className="mt-3" type="submit">Create account</button>
      </form>
    </div>
  )
}
