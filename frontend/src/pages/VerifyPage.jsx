import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import API from '../api'
import { useToast } from '../components/Toast'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function VerifyPage() {
  const query = useQuery()
  const navigate = useNavigate()
  const token = query.get('token')
  const [status, setStatus] = useState('Verifying...')
  const toast = useToast()

  useEffect(() => {
    if (!token) {
      setStatus('Missing token')
      return
    }

    API.get(`/auth/verify?token=${token}`)
      .then(res => {
        setStatus(res.data.message || 'Verified')
        try { toast.show('Account verified', 'success') } catch(e){}
        setTimeout(() => navigate('/login'), 1500)
      })
      .catch(err => setStatus(err?.response?.data?.message || 'Verification failed'))
  }, [token])

  return (
    <div className="max-w-md mx-auto mt-20 card">
      <h2 className="text-2xl mb-4">Email verification</h2>
      <div>{status}</div>
    </div>
  )
}
