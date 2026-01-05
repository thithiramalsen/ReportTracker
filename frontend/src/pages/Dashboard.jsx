import React, { useEffect, useState } from 'react'
import API from '../api'
import { FileText, Eye, MessageSquare, Clock } from 'lucide-react'

function ReportCard({ r }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  function timeAgo(d) {
    if (!d) return ''
    const diff = Math.floor((Date.now() - new Date(d).getTime())/1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return `${Math.floor(diff/86400)}d ago`
  }

  const openReport = async (id) => {
    try {
      console.log('[UI] download token', localStorage.getItem('token'))
      const resp = await API.get(`/reports/${id}/download`, { responseType: 'blob' })
      const blob = new Blob([resp.data], { type: resp.data.type || 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch (err) {
      console.error(err)
      alert('Unable to open report')
    }
  }

  return (
    <div className="card mb-3">
      <div className="flex justify-between">
        <div>
          <h4 className="text-lg font-semibold">{r.title}</h4>
          <div className="text-sm text-gray-600">{r.description}</div>
          <div className="mt-1 text-sm text-gray-500">Report date: {new Date(r.reportDate).toLocaleDateString()}</div>
          <div className="text-sm text-gray-500">Uploaded: {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'} <span className="ml-2 text-xs text-gray-400">({timeAgo(r.createdAt)})</span></div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <a href={`/feedback?reportId=${r._id}`} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"><MessageSquare className="w-4 h-4"/>Feedback</a>
            {user?.role === 'admin' && (
              <a href={`/admin/feedback?reportId=${r._id}`} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"><MessageSquare className="w-4 h-4"/>Admin Comments</a>
            )}
            <button onClick={() => openReport(r._id)} className="text-blue-600 inline-flex items-center gap-2"><Eye className="w-4 h-4"/>View PDF</button>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2"><Clock className="w-3 h-3"/>{r.fileUrl ? 'File available' : 'No file'}</div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [reports, setReports] = useState([])

  useEffect(() => {
    API.get('/reports')
      .then(res => {
        const sorted = (res.data || []).slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
        setReports(sorted)
      })
      .catch(err => console.error(err))
  }, [])

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h2 className="text-2xl mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-gray-600"/> Dashboard</h2>
      <div>
        {reports.length === 0 && <div className="text-gray-600">No reports</div>}
        {reports.map(r => <ReportCard key={r._id} r={r} />)}
      </div>
    </div>
  )
}
