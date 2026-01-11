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
  const [dailyStats, setDailyStats] = useState(null)
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10)} )
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0,10))
  const [breakdown, setBreakdown] = useState(false)
  const [compare, setCompare] = useState(null)
  const [division, setDivision] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [codes, setCodes] = useState([])
  const [users, setUsers] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())

  const [tab, setTab] = useState('drc')

  const loadSms = async ()=>{
    try { const res = await API.get('/notify/analytics'); setSmsStats(res.data) } catch(e){ console.error(e) }
  }
  const loadDrc = async (div, yr, user) =>{
    try {
      const u = user !== undefined ? user : userFilter
      const qs = `${div?`division=${encodeURIComponent(div)}`:''}${u?`${div?'&':''}user=${encodeURIComponent(u)}`:''}`
      const res = await API.get(`/analytics/last12${qs?`?${qs}`:''}`);
      setDrcStats(res.data)
    } catch(e){ console.error(e) }
  }
  const loadCompare = async (yr, m, div, user) => {
    try {
      const u = user !== undefined ? user : userFilter
      const qs = `year=${yr}&month=${m}${div?`&division=${encodeURIComponent(div)}`:''}${u?`&user=${encodeURIComponent(u)}`:''}`
      const res = await API.get(`/analytics/compare?${qs}`);
      setCompare(res.data)
    } catch(e){ console.error(e) }
  }

  const loadDaily = async (s = startDate, e = endDate, div = division, br = breakdown, user) => {
    try {
      const u = user !== undefined ? user : userFilter
      const q = `?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}${div?`&division=${encodeURIComponent(div)}`:''}${u?`&user=${encodeURIComponent(u)}`:''}${br?`&breakdown=1`:''}`
      const res = await API.get(`/analytics/daily${q}`)
      setDailyStats(res.data)
    } catch (err) { console.error(err) }
  }

  useEffect(()=>{
    loadSms();
    loadDrc('', year);
    loadDaily();
    API.get('/users').then(r=>setUsers(r.data)).catch(()=>{})
    API.get('/codes').then(r=>setCodes(r.data)).catch(()=>{})
    const cur = new Date(); loadCompare(cur.getFullYear(), cur.getMonth()+1, '')
  }, [])

  useEffect(() => {
    const now = new Date();
    loadDrc(division, year, userFilter);
    loadDaily(startDate, endDate, division, breakdown, userFilter);
    loadCompare(now.getFullYear(), now.getMonth() + 1, division, userFilter);
  }, [division, userFilter])

  if (!smsStats || !drcStats) return <div className="max-w-3xl mx-auto mt-6">Loading...</div>

  // prepare DRC chart data
  const labels = drcStats.data.map(r => formatMonthLabel(r.year, r.month))
  const litersData = drcStats.data.map(r => r.liters || 0)
  const dryData = drcStats.data.map(r => r.dryKilos || 0)
  const metrolacData = drcStats.data.map(r => r.metrolacAvg || 0)
  const nh3Data = drcStats.data.map(r => r.nh3Volume || 0)
  const tmtDData = drcStats.data.map(r => r.tmtDVolume || 0)

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

  const lineData = { labels, datasets: [
    { label: 'Metrolac (avg)', data: metrolacData, borderColor: 'rgba(234,88,12,0.9)', backgroundColor: 'rgba(234,88,12,0.4)', tension: 0.3 },
    { label: 'NH3 Volume', data: nh3Data, borderColor: 'rgba(3,105,161,0.9)', backgroundColor: 'rgba(3,105,161,0.2)', tension: 0.3 },
    { label: 'TMTD Volume', data: tmtDData, borderColor: 'rgba(124,58,237,0.9)', backgroundColor: 'rgba(124,58,237,0.2)', tension: 0.3 }
  ] }

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
          <select value={division} onChange={e=>{ const newDiv = e.target.value; setDivision(newDiv); }} className="border p-1 rounded">
            <option value="">All Divisions</option>
            {codes.map(c => <option key={c._id} value={c.code}>{c.code}{c.label?` — ${c.label}`:''}</option>)}
          </select>
          <select value={userFilter} onChange={e=>{ const newUser = e.target.value; setUserFilter(newUser); }} className="border p-1 rounded">
            <option value="">All Users</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name} — {u.code}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={()=>setTab('drc')} className={`px-4 py-2 rounded ${tab==='drc' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>DRC</button>
        <button onClick={()=>setTab('sms')} className={`px-4 py-2 rounded ${tab==='sms' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>SMS</button>
      </div>

      {tab === 'drc' && (
        <>
          <div className="card p-4">
            <div className="flex gap-3 items-end mb-3">
              <div>
                <label className="text-xs text-gray-500">Start</label>
                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="border p-1 rounded" />
              </div>
              <div>
                <label className="text-xs text-gray-500">End</label>
                <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="border p-1 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <input id="breakdown" type="checkbox" checked={breakdown} onChange={e=>setBreakdown(e.target.checked)} />
                <label htmlFor="breakdown" className="text-sm">Division breakdown</label>
              </div>
              <div>
                <button onClick={()=>loadDaily(startDate,endDate,division,breakdown)} className="px-3 py-1 bg-blue-600 text-white rounded">Refresh</button>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-2">Showing daily data from <strong>{startDate}</strong> to <strong>{endDate}</strong>{division?` for ${division}`:''}</div>
            {dailyStats && !dailyStats.data && <div>Loading daily data...</div>}
          </div>

          <div className="grid grid-cols-5 gap-4">
            <SummaryCard title={`SMS sent (last period)`} value={smsStats.sent || 0} delta={smsStats.sent - (smsStats.prevSent||0)} />
            <SummaryCard title={`Liters (${curMonthLabel})`} value={litersData[litersData.length-1] || 0} delta={(litersData[litersData.length-1]||0) - (litersData[litersData.length-2]||0)} />
            <SummaryCard title={`Dry Kilos (${curMonthLabel})`} value={dryData[dryData.length-1] || 0} />
            <SummaryCard title={`NH3 Volume (${curMonthLabel})`} value={nh3Data[nh3Data.length-1] || 0} />
            <SummaryCard title={`TMTD Volume (${curMonthLabel})`} value={tmtDData[tmtDData.length-1] || 0} />
          </div>

          <div className="card p-4">
            <h3 className="text-lg mb-2">DRC Monthly — Liters & Dry Kilos</h3>
            <Bar options={barOptions} data={barData} />
          </div>

          <div className="card p-4">
            <h3 className="text-lg mb-2">Metrolac (monthly avg)</h3>
            <Line options={{ responsive: true }} data={lineData} />
          </div>

          {/* Daily charts section */}
          {dailyStats && (
            <div className="card p-4">
              <h3 className="text-lg mb-2">Daily Detail</h3>
              {!dailyStats.breakdown && (
                (() => {
                  const labels = (dailyStats.data||[]).map(r => new Date(r.date).toLocaleDateString())
                  const liters = (dailyStats.data||[]).map(r => r.liters || 0)
                  const dry = (dailyStats.data||[]).map(r => r.dryKilos || 0)
                  const met = (dailyStats.data||[]).map(r => r.metrolacAvg || 0)
                  const nh3 = (dailyStats.data||[]).map(r => r.nh3Volume || 0)
                  const tmt = (dailyStats.data||[]).map(r => r.tmtDVolume || 0)
                  const dailyLine = { labels, datasets: [ { label: 'Liters', data: liters, borderColor: 'rgba(59,130,246,0.9)', backgroundColor: 'rgba(59,130,246,0.2)' }, { label: 'Dry Kilos', data: dry, borderColor: 'rgba(34,197,94,0.9)', backgroundColor: 'rgba(34,197,94,0.2)' }, { label: 'Metrolac (avg)', data: met, borderColor: 'rgba(234,88,12,0.9)', backgroundColor: 'rgba(234,88,12,0.2)' }, { label: 'NH3 Volume', data: nh3, borderColor: 'rgba(3,105,161,0.9)', backgroundColor: 'rgba(3,105,161,0.2)' }, { label: 'TMTD Volume', data: tmt, borderColor: 'rgba(124,58,237,0.9)', backgroundColor: 'rgba(124,58,237,0.2)' } ] }
                  return <Line options={{ responsive:true }} data={dailyLine} />
                })()
              )}

              {dailyStats.breakdown && (
                (() => {
                  const rows = dailyStats.data || []
                  const labels = Array.from(new Set(rows.map(r => new Date(r.date).toLocaleDateString()))).sort((a,b)=> new Date(a)-new Date(b))
                  const divisions = Array.from(new Set(rows.map(r => r.division || ''))).sort()
                  const datasets = divisions.map((div, idx) => {
                    const map = Object.fromEntries(rows.filter(r=> (r.division||'')===div).map(r => [new Date(r.date).toLocaleDateString(), r.liters || 0]))
                    const data = labels.map(l => map[l] || 0)
                    const color = [`rgba(59,130,246,0.9)`,`rgba(34,197,94,0.9)`,`rgba(234,88,12,0.9)`,`rgba(168,85,247,0.9)`][idx % 4]
                    return { label: div || 'Unknown', data, backgroundColor: color }
                  })
                  const bar = { labels, datasets }
                  const opts = { responsive:true, plugins:{ legend:{ position:'top' } }, scales: { x: { stacked: true }, y: { stacked: true } } }
                  return <Bar options={opts} data={bar} />
                })()
              )}
            </div>
          )}
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
