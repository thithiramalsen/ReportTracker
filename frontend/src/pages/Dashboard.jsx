import React, { useEffect, useState } from 'react'
import API from '../api'
import { FileText } from 'lucide-react'

function ReportCard({ r }) {
  return (
    <div className="card mb-3">
      <h4 className="text-lg font-semibold">{r.title}</h4>
      <div className="text-sm text-gray-600">{r.description}</div>
      <div className="text-sm text-gray-500">{new Date(r.reportDate).toLocaleDateString()}</div>
      <a className="text-blue-600" href={r.fileUrl} target="_blank" rel="noreferrer">View PDF</a>
    </div>
  )
}

export default function Dashboard() {
  const [reports, setReports] = useState([])

  useEffect(() => {
    API.get('/reports')
      .then(res => setReports(res.data))
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
