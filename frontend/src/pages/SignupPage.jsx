import React, { useEffect, useState } from 'react'
import API from '../api'
import { rules, validate as validatePw } from '../utils/passwordRules'
import { useToast } from '../components/Toast'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pwStatus, setPwStatus] = useState({ valid: false, unmet: [] })
  const [codes, setCodes] = useState([])
  const [error, setError] = useState(null)
  const toast = useToast()

  useEffect(() => {
    API.get('/codes/available').then(res => setCodes(res.data)).catch(err => console.error(err))
  }, [])

  const onPasswordChange = (v) => {
    setPassword(v)
    const s = validatePw(v)
    setPwStatus(s)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    const check = validatePw(password)
    setPwStatus(check)
    if (!check.valid) return

    try {
      const res = await API.post('/auth/signup', { name, code, password, phone, email })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      try { toast.show(res.data.message || 'Account created. Awaiting approval.', 'success') } catch (e) {}
      window.location.href = '/waiting'
    } catch (err) {
      const msg = err?.response?.data?.message || 'Signup failed'
      setError(msg)
      try { toast.show(msg, 'error') } catch (e) {}
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 card">
      <h2 className="text-2xl mb-4">Create Profile</h2>
      <form onSubmit={submit}>
        <div>
          <label className="block text-sm">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="mt-3">
          <label className="block text-sm">Division Code</label>
          <select value={code} onChange={e => setCode(e.target.value)} className="w-full border p-2 rounded mt-1">
            <option value="">Select code</option>
            {codes.map(c => (
              <option key={c.code} value={c.code}>{c.code}{c.label ? ` — ${c.label}` : ''} ({c.role || 'user'})</option>
            ))}
          </select>
          <div className="text-xs text-gray-600 mt-1">Codes are provisioned by admin. Only unused codes appear.</div>
        </div>
        <div className="mt-3">
          <label className="block text-sm">Phone (WhatsApp)</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div className="mt-3">
          <label className="block text-sm">Email (admin notifications only, optional)</label>
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="mt-3">
          <label className="block text-sm">Password</label>
          <input type="password" value={password} onChange={e => onPasswordChange(e.target.value)} />
          <div className="mt-2 text-sm">
            {rules.map(r => (
              <div key={r.key} className={pwStatus.unmet?.includes(r.key) ? 'text-red-600' : 'text-green-600'}>
                {pwStatus.unmet?.includes(r.key) ? '✖' : '✓'} {r.label}
              </div>
            ))}
          </div>
        </div>
        {error && <div className="text-red-600 mt-2">{error}</div>}
        <button className="mt-4 btn" type="submit">Submit</button>
      </form>
      <div className="mt-3 text-sm text-gray-700">After submitting, an admin must approve your account. Until then you will be placed in the waiting area.</div>
    </div>
  )
}
