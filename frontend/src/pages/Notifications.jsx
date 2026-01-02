import React, { useEffect, useState } from 'react'
import API from '../api'
import { Bell } from 'lucide-react'
import { useToast } from '../components/Toast'

export default function Notifications(){
  const [list, setList] = useState([])
  const toast = useToast()
  const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace(/\/$/, '')

  const openReportByUrl = async (url) => {
    // Open download URL in a new tab to avoid S3 CORS issues (backend redirects to presigned URL)
    try {
      if (!url) throw new Error('no url')
      const base = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace(/\/$/, '')
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank')
        return
      }
      if (url.startsWith('/api/')) {
        const full = `${base}${url.replace(/^\/api/, '')}`
        window.open(full, '_blank')
        return
      }
      // fallback: treat as relative to api
      window.open(`${base}${url.startsWith('/') ? url : '/' + url}`, '_blank')
    } catch (err) {
      console.error('openReportByUrl error', err)
      try { toast.show('Failed to open report', 'error') } catch(e){}
    }
  }

  const copyReportLink = async (url) => {
    try {
      if (!url) throw new Error('no url')
      const full = url.startsWith('http')
        ? url
        : url.startsWith('/api/')
          ? `${apiBase}${url.replace(/^\/api/, '')}`
          : `${apiBase}${url.startsWith('/') ? url : '/' + url}`
      await navigator.clipboard.writeText(full)
      try { toast.show('Link copied', 'success') } catch(e){}
    } catch (err) {
      console.error('copyReportLink error', err)
      try { toast.show('Failed to copy link', 'error') } catch(e){}
    }
  }

  const load = async () => {
    try {
      const res = await API.get('/notifications')
      setList(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(()=>{ load() }, [])

  // SSE: open EventSource to receive live notifications
  useEffect(()=>{
    const token = localStorage.getItem('token')
    if (!token) return
    const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api'
    const es = new EventSource(`${base}/notifications/stream?token=${token}`)
    es.addEventListener('notification', (e) => {
      try {
        const n = JSON.parse(e.data)
        setList(prev => [n, ...prev])
        try { toast.show('New notification', 'info') } catch(e){}
      } catch (err) { console.error('invalid SSE data', err) }
    })
    es.onerror = () => { es.close() }
    return () => es.close()
  }, [])

  const markRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`)
      setList(prev => prev.map(n => n._id===id ? { ...n, read: true } : n))
      try { toast.show('Marked read', 'success') } catch(e){}
    } catch (e) { console.error(e); try { toast.show('Failed', 'error') } catch(e){} }
  }

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h3 className="text-xl mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-gray-600"/> Notifications</h3>
      {list.length===0 ? (
        <div className="text-sm text-gray-500">No notifications</div>
      ) : (
        <div className="space-y-2">
          {list.map(n => (
            <div key={n._id} className={`p-3 border rounded ${n.read ? 'bg-white' : 'bg-yellow-50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{n.message}</div>
                  <div className="text-sm text-gray-600 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  {n.data?.downloadUrl && (
                    <div className="mt-2 flex gap-3 items-center">
                      <button className="text-blue-600" onClick={()=> openReportByUrl(n.data.downloadUrl)}>Open report</button>
                      <button className="text-sm text-gray-600 underline" onClick={()=> copyReportLink(n.data.downloadUrl)}>Copy link</button>
                    </div>
                  )}
                </div>
                <div>
                  {!n.read && <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={()=>markRead(n._id)}>Mark read</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
