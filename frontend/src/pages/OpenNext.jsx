import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import API from '../api'
import { useToast } from '../components/Toast'

export default function OpenNext(){
  const loc = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [status, setStatus] = useState('Preparing...')

  useEffect(()=>{
    const params = new URLSearchParams(loc.search)
    const next = params.get('next')
    if (!next) { navigate('/dashboard'); return }

    const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace(/\/$/, '')

    const openBlob = (blob, mime) => {
      const u = window.URL.createObjectURL(new Blob([blob], { type: mime || 'application/pdf' }))
      window.open(u, '_blank')
      setTimeout(()=> window.URL.revokeObjectURL(u), 10000)
    }

    // If next points to our API (contains /api), fetch via API (which adds Authorization)
    try {
      // Avoid XHR to S3 presigned URLs (CORS). Open backend download URL in new tab so browser navigation follows redirect.
      if (next.startsWith(apiBase) || next.startsWith('/api/')) {
        const full = next.startsWith(apiBase) ? next : `${apiBase}${next.replace(/^\/api/, '')}`
        setStatus('Opening file in new tab...')
        window.open(full, '_blank')
        return
      }

      // otherwise navigate directly (S3 or external link)
      window.open(next, '_blank')
    } catch (e) {
      console.error('OpenNext error', e)
      navigate('/dashboard')
    }
  }, [loc.search])

  return (
    <div className="max-w-xl mx-auto mt-24 text-center">
      <div className="card p-6">
        <h3 className="text-lg">Opening link</h3>
        <div className="mt-4 text-sm text-gray-600">{status}</div>
      </div>
    </div>
  )
}
