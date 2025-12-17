import React, { useEffect, useState } from 'react'
import API from '../api'
import { Bell } from 'lucide-react'
import { useToast } from '../components/Toast'

export default function Notifications(){
  const [list, setList] = useState([])
  const toast = useToast()

  const openReportByUrl = async (url) => {
    // normalize URL: API.baseURL already includes '/api', so strip leading '/api' to avoid duplication
    let path = url
    try {
      if (!url) throw new Error('no url')
      if (url.startsWith('http://') || url.startsWith('https://')) {
        path = url
      } else if (url.startsWith('/api/')) {
        path = url.replace(/^\/api/, '')
      }
    } catch (err) { console.error('openReportByUrl - invalid url', err); try { toast.show('Invalid report URL', 'error') } catch(e){}; return }

    try {
      const resp = await API.get(path, { responseType: 'blob' })
      const blob = new Blob([resp.data], { type: (resp.data && resp.data.type) || 'application/pdf' })
      const u = window.URL.createObjectURL(blob)
      window.open(u, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(u), 10000)
    } catch (err) {
      console.error('failed to fetch report blob', err)
      try { toast.show('Failed to open report', 'error') } catch(e){}
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
                  {n.data?.downloadUrl && (<div className="mt-2"><button className="text-blue-600" onClick={()=> openReportByUrl(n.data.downloadUrl)}>Open report</button></div>)}
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
