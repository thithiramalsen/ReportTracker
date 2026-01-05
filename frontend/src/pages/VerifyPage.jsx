import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import API from '../api'

export default function VerifyPage(){
  const [status, setStatus] = useState('Verifying...')
  const loc = useLocation()
  const navigate = useNavigate()

  useEffect(()=>{
    const p = new URLSearchParams(loc.search)
    const token = p.get('token')
    if (!token) { setStatus('Missing token'); return }
    API.get(`/auth/verify?token=${encodeURIComponent(token)}`).then(()=>{
      setStatus('Email verified. Redirecting...')
      setTimeout(()=>navigate('/login'), 1200)
    }).catch(()=> setStatus('Verification failed or token expired'))
  }, [])

  return (
    <div className="max-w-md mx-auto mt-20 card p-6">
      <h2 className="text-2xl mb-4">Verification</h2>
      <div className="text-gray-700">{status}</div>
    </div>
  )
}
