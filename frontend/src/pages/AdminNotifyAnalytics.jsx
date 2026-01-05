import React, { useEffect, useState } from 'react'
import API from '../api'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend)

function SummaryCard({ title, value, delta }){
  return (
    <div className="p-4 bg-white rounded shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {delta !== undefined && <div className="text-sm text-gray-600">{delta>=0 ? '+' : ''}{delta}</div>}
    </div>
  )
}

function formatMonthLabel(y,m){ return `${String(m).padStart(2,'0')}/${String(y).slice(-2)}` }

export default function AdminAnalytics(){
  const [smsStats, setSmsStats] = useState(null)
  const [drcStats, setDrcStats] = useState(null)
  const [compare, setCompare] = useState(null)
  const [division, setDivision] = useState('')
  const [codes, setCodes] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())

  const [tab, setTab] = useState('drc')

  const loadSms = async ()=>{
    try { const res = await API.get('/notify/analytics'); setSmsStats(res.data) } catch(e){ console.error(e) }
  }
  const loadDrc = async (div, yr) =>{
    try { const res = await API.get(`/analytics/last12${div?`?division=${encodeURIComponent(div)}`:''}`); setDrcStats(res.data) } catch(e){ console.error(e) }
  }
  const loadCompare = async (yr, m, div) => {
    try { const res = await API.get(`/analytics/compare?year=${yr}&month=${m}${div?`&division=${encodeURIComponent(div)}`:''}`); setCompare(res.data) } catch(e){ console.error(e) }
  }

  useEffect(()=>{
    loadSms();
    loadDrc('', year);
    API.get('/codes').then(r=>setCodes(r.data)).catch(()=>{})
    const cur = new Date(); loadCompare(cur.getFullYear(), cur.getMonth()+1, '')
  }, [])

  if (!smsStats || !drcStats) return <div className="max-w-3xl mx-auto mt-6">Loading...</div>

  // prepare DRC chart data
  const labels = drcStats.data.map(r => formatMonthLabel(r.year, r.month))
  const litersData = drcStats.data.map(r => r.liters || 0)
  const dryData = drcStats.data.map(r => r.dryKilos || 0)
  const metrolacData = drcStats.data.map(r => r.metrolacAvg || 0)

  const barOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' } }
  }

  const barData = {
    labels,
    datasets: [
      { label: 'Liters', data: litersData, backgroundColor: 'rgba(59,130,246,0.8)' },
      { label: 'Dry Kilos', data: dryData, backgroundColor: 'rgba(34,197,94,0.8)' }
    ]
  }

  const lineData = { labels, datasets: [{ label: 'Metrolac (avg)', data: metrolacData, borderColor: 'rgba(234,88,12,0.9)', backgroundColor: 'rgba(234,88,12,0.4)', tension: 0.3 }] }

  const curMonthLabel = labels[labels.length-1]

  const smsLabels = (smsStats.last7||[]).map(d => d.day.slice(5))
  const smsSent = (smsStats.last7||[]).map(d => (d.counts && d.counts.sent) || 0)
  const smsFailed = (smsStats.last7||[]).map(d => (d.counts && d.counts.failed) || 0)
  const smsPending = (smsStats.last7||[]).map(d => (d.counts && d.counts.pending) || 0)

  const smsData = {
    labels: smsLabels,
    datasets: [
      { label: 'Sent', data: smsSent, backgroundColor: 'rgba(59,130,246,0.9)' },
      { label: 'Failed', data: smsFailed, backgroundColor: 'rgba(239,68,68,0.9)' },
      { label: 'Pending', data: smsPending, backgroundColor: 'rgba(245,158,11,0.9)' }
    ]
  }

  const smsOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: { x: { stacked: true }, y: { stacked: true } }
  }

  return (
    <div className="max-w-6xl mx-auto mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <div className="flex gap-2 items-center">
          <select value={division} onChange={e=>{ setDivision(e.target.value); loadDrc(e.target.value, year); }} className="border p-1 rounded">
            <option value="">All Divisions</option>
            {codes.map(c => <option key={c._id} value={c.code}>{c.code}{c.label?` — ${c.label}`:''}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={()=>setTab('drc')} className={`px-4 py-2 rounded ${tab==='drc' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>DRC</button>
        <button onClick={()=>setTab('sms')} className={`px-4 py-2 rounded ${tab==='sms' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>SMS</button>
      </div>

      {tab === 'drc' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard title={`SMS sent (last period)`} value={smsStats.sent || 0} delta={smsStats.sent - (smsStats.prevSent||0)} />
            <SummaryCard title={`Liters (${curMonthLabel})`} value={litersData[litersData.length-1] || 0} delta={(litersData[litersData.length-1]||0) - (litersData[litersData.length-2]||0)} />
            <SummaryCard title={`Metrolac avg (${curMonthLabel})`} value={(metrolacData[metrolacData.length-1]||0).toFixed(2)} delta={compare ? ((compare.current.metrolacAvg||0) - (compare.previous.metrolacAvg||0)).toFixed(2) : undefined} />
          </div>

          <div className="card p-4">
            <h3 className="text-lg mb-2">DRC Monthly — Liters & Dry Kilos</h3>
            <Bar options={barOptions} data={barData} />
          </div>

          <div className="card p-4">
            <h3 className="text-lg mb-2">Metrolac (monthly avg)</h3>
            <Line options={{ responsive: true }} data={lineData} />
          </div>
        </>
      )}

      {tab === 'sms' && (
        <div className="card p-4">
          <h3 className="text-lg mb-2">SMS Activity (last 7 days)</h3>
          <div className="mb-2">Total: {smsStats.total} • Sent: {smsStats.sent} • Failed: {smsStats.failed} • Pending: {smsStats.pending}</div>
          <Bar options={smsOptions} data={smsData} />
        </div>
      )}
    </div>
  )
}
