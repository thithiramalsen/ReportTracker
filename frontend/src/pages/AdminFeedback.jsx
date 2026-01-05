import React, { useEffect, useState } from 'react'
import API from '../api'
import { MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react'

export default function AdminFeedback(){
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [filterReportId, setFilterReportId] = useState('')
  const [users, setUsers] = useState([])
  const [reports, setReports] = useState([])
  const [filterUserId, setFilterUserId] = useState('')
  const [filterTitle, setFilterTitle] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const fetch = ()=> {
    const url = filterReportId ? `/feedback?reportId=${encodeURIComponent(filterReportId)}` : '/feedback'
    return API.get(url).then(r=>setItems(r.data)).catch(e=>console.error(e))
  }

  useEffect(()=>{ 
    // read reportId from querystring if present
    try{
      const p = new URLSearchParams(window.location.search)
      const rid = p.get('reportId') || ''
      if (rid) setFilterReportId(rid)
    }catch(e){}
    // fetch auxiliary lists
    API.get('/users').then(r=>setUsers(r.data)).catch(()=>{})
    API.get('/reports').then(r=>setReports(r.data)).catch(()=>{})
    fetch()
  }, [])

  useEffect(()=>{ fetch() }, [filterReportId])

  const open = (f)=>{ setSelected(f); setReplyText(f.response?.text||'') }

  const doReply = async () => {
    try{
      await API.patch(`/feedback/${selected._id}/reply`, { text: replyText, status: 'closed' })
      alert('Replied')
      setSelected(null)
      fetch()
    }catch(e){ console.error(e); alert('Reply failed') }
  }

  const doDelete = async (id) => {
    if (!confirm('Delete feedback?')) return
    try{ await API.delete(`/feedback/${id}`); fetch() }catch(e){ console.error(e); alert('Delete failed') }
  }

  function timeAgo(d){
    if (!d) return ''
    const diff = Math.floor((Date.now() - new Date(d).getTime())/1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return `${Math.floor(diff/86400)}d ago`
  }

  return (
    <div className="max-w-6xl mx-auto mt-6">
      <h2 className="text-2xl mb-3 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-gray-600"/> Feedback & Comments</h2>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500">Division / User</label>
          <select value={filterUserId} onChange={e=>setFilterUserId(e.target.value)} className="w-full border p-2 rounded">
            <option value="">All users</option>
            {users.map(u=> <option key={u._id} value={u._id}>{u.code || u.name || u._id}</option>)}
          </select>
        </div>

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
            <button onClick={()=>{ setFilterReportId(''); setFilterUserId(''); setFilterTitle(''); setFilterFrom(''); setFilterTo(''); fetch(); }} className="px-3 py-2 border rounded">Clear</button>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {items.filter(f => {
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
          <div key={f._id} className="border rounded p-3 flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">{f.type} • {f.reportId ? `Report: ${(f.reportId.title || f.reportId._id || f.reportId)}` : 'General'}</div>
                <div className="text-xs text-gray-400">• {timeAgo(f.createdAt)}</div>
                <div>
                  {f.status === 'open' ? <span className="ml-2 inline-block bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded">Open</span> : <span className="ml-2 inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Closed</span>}
                </div>
              </div>
              <div className="mt-1">{f.message.length>200 ? f.message.slice(0,200)+'...' : f.message}</div>
              {f.response && <div className="mt-2 text-sm text-green-700">Response: {f.response.text} <div className="text-xs text-gray-400">{f.response.respondedAt ? timeAgo(f.response.respondedAt) : ''}</div></div>}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={()=>open(f)} className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2"><MessageSquare className="w-4 h-4"/>View / Reply</button>
              <button onClick={()=>doDelete(f._id)} className="px-3 py-1 border text-red-600 rounded flex items-center gap-2"><XCircle className="w-4 h-4"/>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-lg max-w-3xl w-full p-4">
            <h3 className="font-semibold">Feedback from {selected.senderName || (selected.userId && selected.userId.name) || 'Unknown'}</h3>
            <div className="text-sm text-gray-600">{selected.type} • {selected.reportId ? `Report: ${(selected.reportId.title || selected.reportId._id || selected.reportId)}` : 'General'} • {new Date(selected.createdAt).toLocaleString()}</div>
            <div className="mt-3">{selected.message}</div>

            <div className="mt-4">
              <label className="block text-sm">Reply</label>
              <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} className="w-full border p-2 rounded mt-1 h-28" />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>setSelected(null)} className="px-3 py-1 border rounded">Close</button>
              <button onClick={doReply} className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2"><CheckCircle className="w-4 h-4"/>Send Reply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
