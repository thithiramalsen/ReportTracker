import React, { useEffect, useState, useRef } from 'react'
import API from '../api'
import { Bar, Line } from 'react-chartjs-2'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend)

function SummaryCard({ title, subtitle, value, delta, accent='blue' }){
  const accentBorder = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    amber: 'border-amber-500',
    purple: 'border-purple-600'
  }[accent] || 'border-gray-200'

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${accentBorder}`}>
      <div className="p-4">
        <div className="text-sm text-gray-700 font-medium">{title}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
        <div className="text-2xl font-semibold mt-3">{value}</div>
        {delta !== undefined && <div className="text-sm text-gray-600 mt-1">{delta>=0 ? '+' : ''}{delta}</div>}
      </div>
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
  const [supplierFilter, setSupplierFilter] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [codes, setCodes] = useState([])
  const [users, setUsers] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())

  const [tab, setTab] = useState('overview')
  const dateDebounce = useRef(null)

  const loadSms = async ()=>{
    console.debug('loadSms');
    try { const res = await API.get('/notify/analytics'); setSmsStats(res.data) } catch(e){ console.error('loadSms error', e) }
  }
  const loadDrc = async (div, yr, user) =>{
    try {
      const u = user !== undefined ? user : userFilter
      const s = supplierFilter
      console.debug('loadDrc', { division: div, year: yr, user: u, supplier: s })
      const parts = []
      if (div) parts.push(`division=${encodeURIComponent(div)}`)
      if (u) parts.push(`user=${encodeURIComponent(u)}`)
      if (s) parts.push(`supplier=${encodeURIComponent(s)}`)
      parts.push(`_=${Date.now()}`)
      const qs = parts.join('&')
      const res = await API.get(`/analytics/last12?${qs}`);
      console.debug('loadDrc response', res.data)
      setDrcStats(res.data)
    } catch(e){ console.error('loadDrc error', e) }
  }
  const loadCompare = async (yr, m, div, user) => {
    try {
      const u = user !== undefined ? user : userFilter
      const s = supplierFilter
      console.debug('loadCompare', { year: yr, month: m, division: div, user: u, supplier: s })
      const parts = [`year=${yr}`, `month=${m}`]
      if (div) parts.push(`division=${encodeURIComponent(div)}`)
      if (u) parts.push(`user=${encodeURIComponent(u)}`)
      if (s) parts.push(`supplier=${encodeURIComponent(s)}`)
      parts.push(`_=${Date.now()}`)
      const qs = parts.join('&')
      const res = await API.get(`/analytics/compare?${qs}`);
      console.debug('loadCompare response', res.data)
      setCompare(res.data)
    } catch(e){ console.error('loadCompare error', e) }
  }

  const loadDaily = async (s = startDate, e = endDate, div = division, br = breakdown, user) => {
    try {
      const u = user !== undefined ? user : userFilter
      const sup = supplierFilter
      console.debug('loadDaily', { start: s, end: e, division: div, breakdown: br, user: u, supplier: sup })
      const parts = [
        `start=${encodeURIComponent(s)}`,
        `end=${encodeURIComponent(e)}`
      ]
      if (div) parts.push(`division=${encodeURIComponent(div)}`)
      if (u) parts.push(`user=${encodeURIComponent(u)}`)
      if (sup) parts.push(`supplier=${encodeURIComponent(sup)}`)
      if (br) parts.push('breakdown=1')
      parts.push(`_=${Date.now()}`)
      const q = `?${parts.join('&')}`
      const res = await API.get(`/analytics/daily${q}`)
      console.debug('loadDaily response size', { count: (res.data?.data || []).length, breakdown: res.data?.breakdown })
      setDailyStats(res.data)
    } catch (err) { console.error('loadDaily error', err) }
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
    console.debug('filters changed', { division, userFilter })
    const now = new Date();
    loadDrc(division, year, userFilter);
    loadDaily(startDate, endDate, division, breakdown, userFilter || supplierFilter);
    loadCompare(now.getFullYear(), now.getMonth() + 1, division, userFilter || supplierFilter);
  }, [division, userFilter, supplierFilter])

  // responsive date selection: call loadDaily when start/end change (debounced)
  useEffect(() => {
    if (dateDebounce.current) clearTimeout(dateDebounce.current)
    dateDebounce.current = setTimeout(() => {
      loadDaily(startDate, endDate, division, breakdown, userFilter || supplierFilter)
    }, 450)
    return () => { if (dateDebounce.current) clearTimeout(dateDebounce.current) }
  }, [startDate, endDate, division, breakdown, userFilter, supplierFilter])

  // real-time polling: refresh analytics periodically while user is viewing analytics
  useEffect(() => {
    // only poll when on an analytics tab
    if (!['overview','accuracy','chemicals'].includes(tab)) return
    const pollInterval = 15000 // 15s
    const id = setInterval(() => {
      try {
        loadDaily(startDate, endDate, division, breakdown, userFilter || supplierFilter)
        loadDrc(division, year, userFilter)
        loadSms()
        const cur = new Date(); loadCompare(cur.getFullYear(), cur.getMonth() + 1, division, userFilter || supplierFilter)
      } catch (e) { console.error('poll error', e) }
    }, pollInterval)
    return () => clearInterval(id)
  }, [tab, startDate, endDate, division, breakdown, userFilter, supplierFilter, year])

  // derive suppliers from codes (role === 'supplier') and apply division heuristic
  const suppliers = codes.filter(c => c.role === 'supplier')
  // Always show supplier options; when a division is selected, prioritize
  // suppliers whose code contains the division string so options don't disappear.
  const filteredSuppliers = suppliers
    .filter(s => s.code && s.code.toLowerCase().includes(supplierSearch.toLowerCase()))
    .sort((a,b) => {
      if (!division) return 0
      const da = (a.code||'').toLowerCase().includes(division.toLowerCase())
      const db = (b.code||'').toLowerCase().includes(division.toLowerCase())
      if (da && !db) return -1
      if (!da && db) return 1
      return 0
    })

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <div className="flex gap-2 items-center w-full md:w-auto">
          <select value={division} onChange={e=>{ const newDiv = e.target.value; setDivision(newDiv); setSupplierFilter(''); }} className="border p-1 rounded">
            <option value="">All Divisions</option>
            {codes.filter(c=>c.role!=='supplier').map(c => <option key={c._id} value={c.code}>{c.code}{c.label?` — ${c.label}`:''}</option>)}
          </select>
          <div className="flex items-center border rounded overflow-hidden">
            <input placeholder="Search supplier" value={supplierSearch} onChange={e=>setSupplierSearch(e.target.value)} className="px-2 py-1 w-48" />
            <select value={supplierFilter} onChange={e=>setSupplierFilter(e.target.value)} className="border-l p-1">
              <option value="">All Suppliers</option>
              {filteredSuppliers.map(s => <option key={s._id} value={s.code}>{s.code}{s.label?` — ${s.label}`:''}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={()=>setTab('overview')} className={`px-4 py-2 rounded ${tab==='overview' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Overview</button>
        <button onClick={()=>setTab('accuracy')} className={`px-4 py-2 rounded ${tab==='accuracy' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Accuracy</button>
        <button onClick={()=>setTab('chemicals')} className={`px-4 py-2 rounded ${tab==='chemicals' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Chemicals</button>
      </div>

      {tab === 'overview' && (
        <div>
          <div className="flex items-center justify-between">
            <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-end gap-3 w-full mb-6">
                <div className="w-full sm:w-auto">
                  <label className="text-xs text-gray-500 block">Start</label>
                  <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="border p-2 rounded w-full sm:w-auto" />
                </div>
                <div className="w-full sm:w-auto">
                  <label className="text-xs text-gray-500 block">End</label>
                  <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="border p-2 rounded w-full sm:w-auto" />
                </div>
                <div className="ml-auto">
                  <button onClick={()=>loadDaily(startDate,endDate,division,breakdown)} className="px-4 py-2 bg-blue-600 text-white rounded shadow">Refresh</button>
                </div>
              </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-gray-100 rounded" onClick={async ()=>{
                const el = document.getElementById('analytics-report'); if (!el) return
                const canvas = await html2canvas(el, { scale: 2 }); const img = canvas.toDataURL('image/png'); const pdf = new jsPDF('landscape','pt','a4'); const w = pdf.internal.pageSize.getWidth(); const h = (canvas.height * w) / canvas.width; pdf.addImage(img, 'PNG', 0, 0, w, h); pdf.save('analytics.pdf')
              }}>Download PDF</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6" id="analytics-report">
            {dailyStats && (
              (() => {
                const rows = dailyStats.data || []
                const totalDry = rows.reduce((s,r)=>s+(r.dryKilos||0),0)
                const avgMet = rows.length ? (rows.reduce((s,r)=>s+(r.metrolacAvg||0),0)/rows.length).toFixed(2) : 0
                const totalNH3 = rows.reduce((s,r)=>s+(r.nh3Volume||0),0)
                const totalTMT = rows.reduce((s,r)=>s+(r.tmtDVolume||0),0)
                return (
                  <>
                    <SummaryCard accent="blue" title={`Total Dry Kilos`} subtitle={`${startDate} → ${endDate}`} value={totalDry} />
                    <SummaryCard accent="amber" title={`Avg Metrolac`} value={avgMet} />
                    <SummaryCard accent="green" title={`NH3 Vol`} value={totalNH3} />
                    <SummaryCard accent="purple" title={`TMTD Vol`} value={totalTMT} />
                  </>
                )
              })()
            )}
          </div>

          <div className="card p-4 mt-4 rounded-lg shadow-md border">
            <h3 className="text-lg mb-2">Daily Dry Kilo Yield</h3>
            {dailyStats && (()=>{
              const labels = (dailyStats.data||[]).map(r => new Date(r.date).toLocaleDateString())
              const dry = (dailyStats.data||[]).map(r => r.dryKilos || 0)
              const data = { labels, datasets: [{ label: 'Dry Kilos', data: dry, borderColor: 'rgba(34,197,94,0.9)', backgroundColor: 'rgba(34,197,94,0.2)', tension: 0.3 }] }
              return <Line options={{ responsive: true }} data={data} />
            })()}
          </div>
        </div>
      )}

      {tab === 'accuracy' && (
        <div>
          <div className="card p-4">
            <h3 className="text-lg mb-2">Metrolac Reading vs Actual Dry Kilos (Daily)</h3>
            {dailyStats && (()=>{
              const labels = (dailyStats.data||[]).map(r => new Date(r.date).toLocaleDateString())
              const met = (dailyStats.data||[]).map(r => r.metrolacAvg || 0)
              const dry = (dailyStats.data||[]).map(r => r.dryKilos || 0)
              const data = {
                labels,
                datasets: [
                  { label: 'Metrolac Reading', data: met, borderColor: 'rgba(234,88,12,0.9)', yAxisID: 'y1', tension: 0.3 },
                  { label: 'Actual Dry Kilos', data: dry, borderColor: 'rgba(34,197,94,0.9)', yAxisID: 'y', tension: 0.3 }
                ]
              }
              const opts = { responsive:true, plugins:{ legend:{ position:'top' } }, scales: { y: { type: 'linear', position: 'left' }, y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } } } }
              return <Line options={opts} data={data} />
            })()}
          </div>
        </div>
      )}

      {tab === 'chemicals' && (
        <div>
          <div className="card p-4">
            <h3 className="text-lg mb-2">NH3 and TMTD Volumes (Daily)</h3>
            {dailyStats && (()=>{
              const labels = (dailyStats.data||[]).map(r => new Date(r.date).toLocaleDateString())
              const nh3 = (dailyStats.data||[]).map(r => r.nh3Volume || 0)
              const tmt = (dailyStats.data||[]).map(r => r.tmtDVolume || 0)
              const data = { labels, datasets: [ { label: 'NH3 Volume', data: nh3, backgroundColor: 'rgba(3,105,161,0.9)' }, { label: 'TMTD Volume', data: tmt, backgroundColor: 'rgba(124,58,237,0.9)' } ] }
              const opts = { responsive:true, plugins:{ legend:{ position:'top' } }, scales: { x: { stacked: true }, y: { stacked: true } } }
              return <Bar options={opts} data={data} />
            })()}
          </div>
        </div>
      )}

      {/* SMS analytics moved to SMS Jobs page */}
    </div>
  )
}
