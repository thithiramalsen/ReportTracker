import React, { useEffect, useState } from 'react'
import API from '../api'

function SimpleBarChart({ data }){
  // data: [{ day:'2026-01-01', counts: { sent: 3, failed:1 } }, ...]
  const max = Math.max(...data.map(d=> (d.counts && (d.counts.sent||0)) ));
  return (
    <div className="grid grid-cols-7 gap-2">
      {data.map(d => {
        const val = (d.counts && d.counts.sent) || 0
        const h = max ? Math.round((val / max) * 100) : 4
        return (
          <div key={d.day} className="flex flex-col items-center">
            <div className="w-full bg-gray-200" style={{height: '120px', display:'flex', alignItems:'end'}}>
              <div className="bg-blue-600 w-full" style={{height: h+'%'}}></div>
            </div>
            <div className="text-xs mt-1">{d.day.slice(5)}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminNotifyAnalytics(){
  const [stats, setStats] = useState(null)

  const load = async ()=>{
    try { const res = await API.get('/notify/analytics'); setStats(res.data) } catch(e){ console.error(e) }
  }

  useEffect(()=>{ load() }, [])

  if (!stats) return <div className="max-w-3xl mx-auto mt-6">Loading...</div>

  const last7 = stats.last7 || []

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <h2 className="text-2xl mb-4">SMS Analytics</h2>
      <div className="mb-4">Total: {stats.total} • Sent: {stats.sent} • Failed: {stats.failed} • Pending: {stats.pending}</div>
      <div className="card p-4">
        <SimpleBarChart data={last7} />
      </div>
    </div>
  )
}
