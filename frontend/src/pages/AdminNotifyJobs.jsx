import React, { useEffect, useState } from 'react'
import API from '../api'
import { useToast } from '../components/Toast'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function AdminNotifyJobs(){
  const [jobs, setJobs] = useState([])
  const [smsStats, setSmsStats] = useState(null)
  const toast = useToast()

  const load = async ()=>{
    try { const res = await API.get('/notify/jobs'); setJobs(res.data) } catch(e){ console.error(e) }
  }

  useEffect(()=>{ load() }, [])
  useEffect(()=>{
    const loadSms = async () => {
      try { const res = await API.get('/notify/analytics'); setSmsStats(res.data) } catch(e){ console.error('loadSms', e) }
    }
    loadSms()
  }, [])

  const retry = async (id)=>{
    try { await API.patch(`/notify/jobs/${id}/retry`); load(); try{ toast.show('Retry scheduled','success') }catch(e){} } catch(e){ console.error(e); try{ toast.show('Retry failed','error') }catch(e){} }
  }

  const resolveJob = async (id)=>{
    try { await API.patch(`/notify/jobs/${id}/resolve`); load(); try{ toast.show('Marked resolved','success') }catch(e){} } catch(e){ console.error(e); try{ toast.show('Resolve failed','error') }catch(e){} }
  }

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <h2 className="text-2xl mb-4">SMS Jobs</h2>
      {smsStats && (
        <div className="card p-4 mb-4">
          <h3 className="text-lg mb-2">SMS Activity (last 7 days)</h3>
          <div className="mb-2">Total: {smsStats.total} • Sent: {smsStats.sent} • Failed: {smsStats.failed} • Pending: {smsStats.pending}</div>
          <Bar options={{ responsive: true, plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { stacked: true }, y: { stacked: true } } }} data={{ labels: (smsStats.last7||[]).map(d=>d.day.slice(5)), datasets: [ { label: 'Sent', data: (smsStats.last7||[]).map(d=>(d.counts && d.counts.sent)||0), backgroundColor: 'rgba(59,130,246,0.9)' }, { label: 'Failed', data: (smsStats.last7||[]).map(d=>(d.counts && d.counts.failed)||0), backgroundColor: 'rgba(239,68,68,0.9)' }, { label: 'Pending', data: (smsStats.last7||[]).map(d=>(d.counts && d.counts.pending)||0), backgroundColor: 'rgba(245,158,11,0.9)' } ] }} />
        </div>
      )}
      <div className="space-y-2">
        {jobs.map(j => (
          <div key={j._id} className="p-3 border rounded flex justify-between">
            <div>
              <div className="font-medium">To: {j.to} • Status: {j.status} • Attempts: {j.attempts}</div>
              <div className="text-sm text-gray-600">Created: {new Date(j.createdAt).toLocaleString()}</div>
              <div className="text-sm mt-2">{j.message}</div>
              {j.lastError && <div className="text-sm text-red-600 mt-1">Last error: {j.lastError}</div>}
              {j.providerMessageId && <div className="text-sm text-gray-600 mt-1">Provider ID: {j.providerMessageId}</div>}
            </div>
            <div className="flex flex-col gap-2">
              <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={()=>retry(j._id)}>Retry</button>
              <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={()=>resolveJob(j._id)}>Resolve</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
