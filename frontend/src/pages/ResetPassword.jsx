import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import API from '../api'
import { rules, validate as validatePw } from '../utils/passwordRules'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [pwErrors, setPwErrors] = useState([])
  const [pwStatus, setPwStatus] = useState({ valid: false, unmet: [] })

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    // client-side validation
    const client = validatePw(password)
    setPwStatus(client)
    if (!client.valid) {
      setPwErrors(client.unmet.map(k => rules.find(r => r.key === k).label))
      return
    }

    try {
      const res = await API.post('/auth/reset', { token, password })
      setMessage(res.data.message || 'Password reset')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err?.response?.data?.message || 'Error')
    }
  }

  function onPasswordChange(v) {
    setPassword(v)
    setPwErrors([])
    const s = validatePw(v)
    setPwStatus(s)
  }

  return (
    <div className="max-w-md mx-auto mt-20 card">
      <h2 className="text-2xl mb-4">Reset Password</h2>
      <form onSubmit={submit}>
        <div>
          <label className="block text-sm">New password</label>
          <input type="password" value={password} onChange={e => onPasswordChange(e.target.value)} />
          <div className="mt-2 text-sm">
            {rules.map(r => (
              <div key={r.key} className={pwStatus.unmet.includes(r.key) ? 'text-red-600' : 'text-green-600'}>
                {pwStatus.unmet.includes(r.key) ? '✖' : '✓'} {r.label}
              </div>
            ))}
          </div>
        </div>
        {error && <div className="text-red-600">{error}</div>}
        {message && <div className="text-green-600">{message}</div>}
        <button className="mt-3" type="submit">Reset password</button>
      </form>
    </div>
  )
}
