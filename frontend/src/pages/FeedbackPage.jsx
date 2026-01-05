import React, { useEffect, useState } from 'react'
import API from '../api'
import { MessageSquare, Clock } from 'lucide-react'

export default function FeedbackPage(){
  const [message, setMessage] = useState('')
  const [type, setType] = useState('feedback')
  const [reportId, setReportId] = useState('')
  const [mine, setMine] = useState([])
  const [reports, setReports] = useState([])
  const [users, setUsers] = useState([])
  const [filterUserId, setFilterUserId] = useState('')
  const [filterTitle, setFilterTitle] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  useEffect(()=>{
    const isAdmin = user?.role === 'admin'
    if (isAdmin) {
      API.get('/feedback').then(r=>setMine(r.data)).catch(()=>{})
      API.get('/users').then(r=>setUsers(r.data)).catch(()=>{})
    } else {
      API.get('/feedback/mine').then(r=>setMine(r.data)).catch(()=>{})
    }
    API.get('/reports').then(r=>setReports(r.data)).catch(()=>{})
  }, [])

  function timeAgo(d){
    if (!d) return ''
    const diff = Math.floor((Date.now() - new Date(d).getTime())/1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return `${Math.floor(diff/86400)}d ago`
  }

  const submit = async (e)=>{
    e.preventDefault()
    try{
      const body = { message, type }
      if (reportId) body.reportId = reportId
      await API.post('/feedback', body)
      setMessage('')
      setType('feedback')
      setReportId('')
      API.get('/feedback/mine').then(r=>setMine(r.data)).catch(()=>{})
      alert('Feedback submitted')
    }catch(e){ console.error(e); alert('Submit failed') }
  }

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h2 className="text-2xl mb-3 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-gray-600"/> Submit Feedback</h2>
      <form onSubmit={submit} className="card p-4">
        <div className="mb-3">
          <label className="block text-sm">About Report (optional)</label>
          <select value={reportId} onChange={e=>setReportId(e.target.value)} className="w-full border p-2 rounded mt-1">
            <option value="">General / Not about a report</option>
            {reports.map(r=> <option key={r._id} value={r._id}>{r.title} — {new Date(r.reportDate).toLocaleDateString()}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-sm">Type</label>
          <select value={type} onChange={e=>setType(e.target.value)} className="w-full border p-2 rounded mt-1">
            <option value="feedback">Feedback</option>
            <option value="comment">Comment</option>
            <option value="bug">Bug</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-sm">Message</label>
          <textarea required value={message} onChange={e=>setMessage(e.target.value)} className="w-full border p-2 rounded mt-1 h-28" />
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Submit</button>
      </form>
      <div className="mt-6">
        <h3 className="text-lg mb-2">Your Feedback</h3>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          {user?.role === 'admin' && (
            <div>
              <label className="text-xs text-gray-500">Division / User</label>
              <select value={filterUserId} onChange={e=>setFilterUserId(e.target.value)} className="w-full border p-2 rounded">
                <option value="">All users</option>
                {users.map(u=> <option key={u._id} value={u._id}>{u.code || u.name || u._id}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500">Report title</label>
            <input value={filterTitle} onChange={e=>setFilterTitle(e.target.value)} placeholder="Search by report title" className="w-full border p-2 rounded" />
          </div>

          <div>
            <label className="text-xs text-gray-500">From</label>
            <input type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} className="w-full border p-2 rounded" />
          </div>

          <div>
            <label className="text-xs text-gray-500">To</label>
            <div className="flex gap-2">
              <input type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} className="w-full border p-2 rounded" />
              <button onClick={()=>{ setFilterUserId(''); setFilterTitle(''); setFilterFrom(''); setFilterTo(''); API.get(user?.role==='admin'?'/feedback/mine':'/feedback/mine').then(r=>setMine(r.data)).catch(()=>{}); }} className="px-3 py-2 border rounded">Clear</button>
            </div>
          </div>
        </div>

        {mine.length===0 && <div className="text-gray-600">No feedback submitted yet.</div>}
        <div className="space-y-3">
          {mine.filter(f => {
            if (filterUserId && String(f.userId?._id) !== String(filterUserId)) return false
            if (filterTitle) {
              const rt = (f.reportId && (f.reportId.title || '')) || ''
              if (!rt.toLowerCase().includes(filterTitle.toLowerCase())) return false
            }
            if (filterFrom) {
              const from = new Date(filterFrom)
              if (new Date(f.createdAt) < from) return false
            }
            if (filterTo) {
              const to = new Date(filterTo)
              to.setHours(23,59,59,999)
              if (new Date(f.createdAt) > to) return false
            }
            return true
          }).map(f=> (
            <div key={f._id} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">{f.type} • {f.reportId ? f.reportId.title : 'General'}</div>
                <div className="text-xs text-gray-400 flex items-center gap-2"><Clock className="w-3 h-3"/>{timeAgo(f.createdAt)}</div>
              </div>
              <div className="mt-1">{f.message}</div>
              {f.response && <div className="mt-2 p-2 bg-gray-50">Response: {f.response.text} <div className="text-xs text-gray-500">{f.response.respondedAt ? timeAgo(f.response.respondedAt) : ''}</div></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
