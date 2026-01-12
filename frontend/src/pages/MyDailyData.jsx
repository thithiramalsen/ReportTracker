import React, { useEffect, useState } from 'react'
import API from '../api'
import { useToast } from '../components/Toast'
import Confirm from '../components/Confirm'

export default function MyDailyData(){
  const [list, setList] = useState([])
  const toast = useToast()

  const load = async () => {
    try {
      const res = await API.get('/daily-data/mine')
      setList(res.data)
    } catch (e) { console.error(e); try { toast.show('Failed to load your entries', 'error') } catch(e){} }
  }

  const [flags, setFlags] = useState([])
  const [editFlagId, setEditFlagId] = useState(null)
  const [openFlagFor, setOpenFlagFor] = useState(null)
  const [flagEditable, setFlagEditable] = useState(true)
  const [flagSubmitting, setFlagSubmitting] = useState(false)
  const [flagForm, setFlagForm] = useState({ liters: '', dryKilos: '', metrolac: '', nh3Volume: '', tmtDVolume: '', remarkText: '', remarkTags: [] })
  const [slipFile, setSlipFile] = useState(null)

  useEffect(()=>{ load() }, [])

  useEffect(()=>{ // load user's flags
    let mounted = true
    API.get('/flags').then(res => { if (mounted) setFlags(res.data) }).catch(()=>{})
    return ()=>{ mounted = false }
  }, [])

  // map flags by dailyDataId for quick lookup
  const flagsByDaily = {};
  flags.forEach(f => { if (f && f.dailyDataId) flagsByDaily[String(f.dailyDataId._id)] = f });
  const currentFlag = editFlagId ? flags.find(f => f._id === editFlagId) : null;

  const openFlag = (item) => {
    // check if there's an existing flag for this dailyData
    const existing = flags.find(f => f.dailyDataId && String(f.dailyDataId._id) === String(item._id) );
    if (existing) {
      setEditFlagId(existing._id)
      setFlagEditable(!(existing.status === 'accepted' || existing.status === 'discarded'))
      setFlagForm({
        liters: existing.userProposedData?.liters ?? item.liters ?? '',
        dryKilos: existing.userProposedData?.dryKilos ?? item.dryKilos ?? '',
        metrolac: existing.userProposedData?.metrolac ?? item.metrolac ?? '',
        nh3Volume: existing.userProposedData?.nh3Volume ?? item.nh3Volume ?? '',
        tmtDVolume: existing.userProposedData?.tmtDVolume ?? item.tmtDVolume ?? '',
        remarkText: existing.remarkText || '',
        remarkTags: existing.remarkTags || []
      })
    } else {
      setEditFlagId(null)
      setFlagEditable(true)
      setFlagForm({ liters: item.liters||'', dryKilos: item.dryKilos||'', metrolac: item.metrolac||'', nh3Volume: item.nh3Volume||'', tmtDVolume: item.tmtDVolume||'', remarkText: '', remarkTags: [] })
    }
    setOpenFlagFor(item)
    setSlipFile(null)
  }

  const submitFlag = async (e) => {
    e && e.preventDefault()
    if (!openFlagFor) return
    setFlagSubmitting(true)
    try {
      const fd = new FormData()
      if (!editFlagId) fd.append('dailyDataId', openFlagFor._id)
      fd.append('liters', flagForm.liters)
      fd.append('dryKilos', flagForm.dryKilos)
      fd.append('metrolac', flagForm.metrolac)
      fd.append('nh3Volume', flagForm.nh3Volume)
      fd.append('tmtDVolume', flagForm.tmtDVolume)
      fd.append('remarkText', flagForm.remarkText)
      fd.append('remarkTags', JSON.stringify(flagForm.remarkTags || []))
      if (slipFile) fd.append('slip', slipFile)
      let res
      if (editFlagId) {
        res = await API.patch(`/flags/${editFlagId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        try { toast.show('Flag updated', 'success') } catch(e){}
      } else {
        res = await API.post('/flags', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        try { toast.show('Flag submitted', 'success') } catch(e){}
      }
      setOpenFlagFor(null)
      setEditFlagId(null)
      // refresh flags
      const rf = await API.get('/flags'); setFlags(rf.data)
    } catch (err) {
      console.error(err)
      try { toast.show(err?.response?.data?.message || 'Flag failed', 'error') } catch(e){}
    } finally { setFlagSubmitting(false) }
  }


  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h3 className="text-xl mb-4">My Daily Data</h3>
      <div className="card">
        {list.length===0 ? <div className="p-4 text-sm text-gray-500">No records available for your division.</div> : (
          <div className="space-y-2 p-4">
            {list.map(item => {
              const flag = flagsByDaily[item._id]
              return (
              <div key={item._id} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{new Date(item.date).toLocaleDateString()} — {item.division || '—'}</div>
                      {flag && <div className={`text-xs px-2 py-0.5 rounded ${flag.status==='accepted' ? 'bg-green-100 text-green-800' : flag.status==='discarded' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-800'}`}>{flag.status}</div>}
                      {flag && flag.status==='accepted' && <div className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">Edited</div>}
                    </div>
                    <div className="text-sm text-gray-600">Liters: {item.liters} • Dry Kilos: {item.dryKilos} • Metrolac: {item.metrolac}</div>
                    <div className="text-sm text-gray-600">Supplier: {item.supplierCode || '—'} • NH3: {item.nh3Volume || 0} • TMTD: {item.tmtDVolume || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Uploaded: {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</div>
                  </div>
                  <div className="ml-4">
                    <button className="px-3 py-1 border rounded" onClick={()=>openFlag(item)}>Flag</button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Flag modal (simple) */}
      {openFlagFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-11/12 max-w-3xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">Flag record</div>
                <div className="text-sm text-gray-600">{openFlagFor.division || '—'} • {new Date(openFlagFor.date).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                {editFlagId && <div className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800">Editing existing flag</div>}
                <button className="text-sm px-3 py-1 border rounded" onClick={()=>setOpenFlagFor(null)}>Close</button>
              </div>
            </div>

            <form onSubmit={submitFlag} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-500 mb-2">Admin data</div>
                  <div className="text-sm"><strong>Liters:</strong> {openFlagFor.liters ?? '—'}</div>
                  <div className="text-sm"><strong>Dry Kilos:</strong> {openFlagFor.dryKilos ?? '—'}</div>
                  <div className="text-sm"><strong>Metrolac:</strong> {openFlagFor.metrolac ?? '—'}</div>
                  <div className="text-sm"><strong>NH3:</strong> {openFlagFor.nh3Volume ?? 0}</div>
                  <div className="text-sm"><strong>TMTD:</strong> {openFlagFor.tmtDVolume ?? 0}</div>
                </div>
                <div className="p-4 rounded border">
                  <div className="text-sm text-gray-500 mb-2">Your proposed values</div>
                    <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600">Liters</label>
                      <input type="number" step="any" value={flagForm.liters} onChange={e=>setFlagForm(f=>({ ...f, liters: e.target.value }))} disabled={!flagEditable} className={`w-full p-2 border rounded ${!flagEditable ? 'bg-gray-100' : ''}`} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Dry Kilos</label>
                      <input type="number" step="any" value={flagForm.dryKilos} onChange={e=>setFlagForm(f=>({ ...f, dryKilos: e.target.value }))} disabled={!flagEditable} className={`w-full p-2 border rounded ${!flagEditable ? 'bg-gray-100' : ''}`} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Metrolac</label>
                      <input type="number" step="any" value={flagForm.metrolac} onChange={e=>setFlagForm(f=>({ ...f, metrolac: e.target.value }))} disabled={!flagEditable} className={`w-full p-2 border rounded ${!flagEditable ? 'bg-gray-100' : ''}`} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">NH3 Volume</label>
                      <input type="number" step="any" value={flagForm.nh3Volume} onChange={e=>setFlagForm(f=>({ ...f, nh3Volume: e.target.value }))} disabled={!flagEditable} className={`w-full p-2 border rounded ${!flagEditable ? 'bg-gray-100' : ''}`} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-2">Reason</div>
                <div className="flex flex-wrap gap-2">
                  {['Quantity mismatch','Wrong supplier','Other'].map((tag, i) => (
                    <label key={tag} className={`inline-flex items-center cursor-pointer select-none ${ (flagForm.remarkTags||[]).includes(tag) ? 'ring-2 ring-offset-1' : '' }`}>
                      <input type="checkbox" className="hidden" checked={(flagForm.remarkTags||[]).includes(tag)} onChange={e=>{
                        setFlagForm(f=>{
                          const tags = new Set(f.remarkTags||[]);
                          if (e.target.checked) tags.add(tag); else tags.delete(tag);
                          return { ...f, remarkTags: Array.from(tags) }
                        })
                      }} />
                      <span className={`px-3 py-1 rounded ${i===0 ? 'bg-pink-100 text-pink-800' : i===1 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{tag}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600">Comment</label>
                <textarea value={flagForm.remarkText} onChange={e=>setFlagForm(f=>({ ...f, remarkText: e.target.value }))} className="w-full p-2 border rounded" rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-sm text-gray-600">Upload proof (image/pdf)</label>
                  <input type="file" accept="image/*,application/pdf" onChange={e=>setSlipFile(e.target.files && e.target.files[0])} disabled={!flagEditable} />
                  {currentFlag && currentFlag.slipUrl && (
                    <div className="mt-2 text-sm">
                      <a className="text-blue-600" href={`${API.defaults.baseURL.replace(/\/api\/?$/,'')}${currentFlag.slipUrl}`} target="_blank" rel="noreferrer">View existing slip</a>
                    </div>
                  )}
                </div>
                <div>
                  {(flagForm.remarkTags||[]).length>0 && (
                    <div className="mt-1 flex gap-2">
                      {(flagForm.remarkTags||[]).map((t, idx) => (
                        <span key={idx} className={`text-xs px-2 py-0.5 rounded ${idx % 3 === 0 ? 'bg-pink-100 text-pink-800' : idx % 3 === 1 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" className="px-4 py-2 border rounded" onClick={()=>setOpenFlagFor(null)}>Cancel</button>
                {flagEditable ? (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={flagSubmitting}>{flagSubmitting ? 'Submitting...' : editFlagId ? 'Update Flag' : 'Submit Flag'}</button>
                ) : (
                  <div className="self-center text-sm text-gray-600">This flag cannot be edited because it was {currentFlag ? currentFlag.status : 'processed'} by admin.</div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
