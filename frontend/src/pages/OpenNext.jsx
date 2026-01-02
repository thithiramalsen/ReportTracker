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
      if (next.startsWith(apiBase)) {
        const path = next.slice(apiBase.length) || '/'
        setStatus('Fetching file...')
        API.get(path, { responseType: 'blob' }).then(resp => openBlob(resp.data, resp.data.type)).catch(err => {
          console.error('OpenNext fetch failed', err)
          try{ toast.show('Failed to open file', 'error') }catch(e){}
          setStatus('Failed to open file')
        })
        return
      }

      if (next.startsWith('/api/')) {
        const path = next.replace(/^\/api/, '')
        setStatus('Fetching file...')
        API.get(path, { responseType: 'blob' }).then(resp => openBlob(resp.data, resp.data.type)).catch(err => {
          console.error('OpenNext fetch failed', err)
          try{ toast.show('Failed to open file', 'error') }catch(e){}
          setStatus('Failed to open file')
        })
        return
      }

      // otherwise navigate directly (S3 or external link)
      window.location.href = next
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
