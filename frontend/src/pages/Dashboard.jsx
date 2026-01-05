import React, { useEffect, useState } from 'react'
import API from '../api'
import { FileText, Eye } from 'lucide-react'

function ReportCard({ r }) {
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
      <h4 className="text-lg font-semibold">{r.title}</h4>
      <div className="text-sm text-gray-600">{r.description}</div>
      <div className="text-sm text-gray-500">Report date: {new Date(r.reportDate).toLocaleDateString()}</div>
      <div className="text-sm text-gray-500">Uploaded: {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</div>
      <button onClick={() => openReport(r._id)} className="text-blue-600 inline-flex items-center gap-2"><Eye className="w-4 h-4"/>View PDF</button>
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
