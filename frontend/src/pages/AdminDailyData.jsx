import React, { useEffect, useState } from 'react'
import API from '../api'
import { useToast } from '../components/Toast'
import Confirm from '../components/Confirm'

export default function AdminDailyData(){
  const [date, setDate] = useState('')
  const [liters, setLiters] = useState('')
  const [dryKilos, setDryKilos] = useState('')
  const [metrolac, setMetrolac] = useState('')
  const [supplierCode, setSupplierCode] = useState('')
  const [nh3Volume, setNh3Volume] = useState('')
  const [tmtDVolume, setTmtDVolume] = useState('')
  const [division, setDivision] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [list, setList] = useState([])
  const [codes, setCodes] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [editing, setEditing] = useState(null)
  const toast = useToast()
  const [pendingDelete, setPendingDelete] = useState(null)

  const load = async () => {
    try {
      const res = await API.get('/daily-data')
      setList(res.data)
    } catch (e) { console.error(e); try { toast.show('Failed to load', 'error') } catch(e){} }
  }

  useEffect(()=>{ load() }, [])
  useEffect(()=>{
    if (!date) setDate(new Date().toISOString().slice(0,10))
  }, [])
  useEffect(()=>{
    let mounted = true
    API.get('/codes').then(res => { if (mounted) setCodes(res.data) }).catch(()=>{})
    API.get('/codes/suppliers').then(res => { if (mounted) setSuppliers(res.data) }).catch(()=>{})
    return ()=>{ mounted = false }
  }, [])

  const submit = async (e) => {
    e && e.preventDefault()
    // client-side validation
    const errs = {}
    if (!date) errs.date = 'Date is required'
    if (!division) errs.division = 'Division is required'
    const numFields = { liters, dryKilos, metrolac, nh3Volume, tmtDVolume }
    Object.entries(numFields).forEach(([k,v])=>{
      if (v!=='' && isNaN(Number(v))) errs[k] = 'Must be a number'
      if (v!=='' && Number(v) < 0) errs[k] = 'Must be >= 0'
    })
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    try {
      const payload = { date, liters: Number(liters||0), dryKilos: Number(dryKilos||0), metrolac: Number(metrolac||0), division, supplierCode, nh3Volume: Number(nh3Volume||0), tmtDVolume: Number(tmtDVolume||0) }
      if (editing) {
        await API.patch(`/daily-data/${editing._id}`, payload)
        try { toast.show('Updated', 'success') } catch(e){}
        setEditing(null)
      } else {
        await API.post('/daily-data', payload)
        try { toast.show('Created', 'success') } catch(e){}
      }
      setDate(new Date().toISOString().slice(0,10)); setLiters(''); setDryKilos(''); setMetrolac(''); setDivision(''); setSupplierCode(''); setNh3Volume(''); setTmtDVolume('')
      load()
    } catch (err) {
      console.error(err)
      try { toast.show(err?.response?.data?.message || 'Save failed', 'error') } catch(e){}
    } finally { setSubmitting(false) }
  }

  const edit = (item) => {
    setEditing(item)
    setDate(new Date(item.date).toISOString().slice(0,10))
    setLiters(item.liters||'')
    setDryKilos(item.dryKilos||'')
    setMetrolac(item.metrolac||'')
    setSupplierCode(item.supplierCode||'')
    setNh3Volume(item.nh3Volume||'')
    setTmtDVolume(item.tmtDVolume||'')
    setDivision(item.division||'')
  }

  const remove = async (id) => {
    setPendingDelete(id)
  }

  const doConfirmDelete = async (id) => {
    setPendingDelete(null)
    try {
      await API.delete(`/daily-data/${id}`)
      try { toast.show('Deleted', 'success') } catch(e){}
      load()
    } catch (e) { console.error(e); try { toast.show('Delete failed', 'error') } catch(e){} }
  }

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h3 className="text-xl mb-4">Admin — Daily DRC Data</h3>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm">Date</label>
          <input type="date" value={date} onChange={e=>{ setDate(e.target.value); setErrors(prev=>({ ...prev, date: undefined })) }} className="w-full" />
          {errors.date && <div className="text-xs text-red-600 mt-1">{errors.date}</div>}
        </div>
        <div>
          <label className="block text-sm">Division</label>
          <select value={division} onChange={e=>setDivision(e.target.value)} className="w-full border p-2 rounded">
            <option value="">— Select division —</option>
            {codes.filter(c => c.role !== 'supplier').map(c => (
              <option key={c._id} value={c.code}>{c.code}{c.label ? ` — ${c.label}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Liters</label>
          <input type="number" min="0" step="any" value={liters} onChange={e=>{ setLiters(e.target.value); setErrors(prev=>({ ...prev, liters: undefined })) }} className="w-full" />
          {errors.liters && <div className="text-xs text-red-600 mt-1">{errors.liters}</div>}
        </div>
        <div>
          <label className="block text-sm">Dry kilos</label>
          <input type="number" min="0" step="any" value={dryKilos} onChange={e=>{ setDryKilos(e.target.value); setErrors(prev=>({ ...prev, dryKilos: undefined })) }} className="w-full" />
          {errors.dryKilos && <div className="text-xs text-red-600 mt-1">{errors.dryKilos}</div>}
        </div>
        <div>
          <label className="block text-sm">Metrolac</label>
          <input type="number" min="0" step="any" value={metrolac} onChange={e=>{ setMetrolac(e.target.value); setErrors(prev=>({ ...prev, metrolac: undefined })) }} className="w-full" />
          {errors.metrolac && <div className="text-xs text-red-600 mt-1">{errors.metrolac}</div>}
        </div>
        <div>
          <label className="block text-sm">Supplier</label>
          <select value={supplierCode} onChange={e=>setSupplierCode(e.target.value)} className="w-full border p-2 rounded">
            <option value="">— Select supplier —</option>
            {suppliers.map(s => (
              <option key={s._id} value={s.code}>{s.code}{s.label ? ` — ${s.label}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">NH3 Volume</label>
          <input type="number" min="0" step="any" value={nh3Volume} onChange={e=>{ setNh3Volume(e.target.value); setErrors(prev=>({ ...prev, nh3Volume: undefined })) }} className="w-full" />
          {errors.nh3Volume && <div className="text-xs text-red-600 mt-1">{errors.nh3Volume}</div>}
        </div>
        <div>
          <label className="block text-sm">TMTD Volume</label>
          <input type="number" min="0" step="any" value={tmtDVolume} onChange={e=>{ setTmtDVolume(e.target.value); setErrors(prev=>({ ...prev, tmtDVolume: undefined })) }} className="w-full" />
          {errors.tmtDVolume && <div className="text-xs text-red-600 mt-1">{errors.tmtDVolume}</div>}
        </div>
        <div className="flex items-end">
          <button className="btn" type="submit" disabled={submitting}>{editing ? 'Update' : 'Create'}</button>
        </div>
      </form>

      <div className="card">
        <h4 className="font-medium mb-2">Recent Entries</h4>
        {list.length===0 ? <div className="text-sm text-gray-500">No entries</div> : (
          <div className="space-y-2">
            {list.map(item => (
              <div key={item._id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <div className="font-medium">{new Date(item.date).toLocaleDateString()} — {item.division}</div>
                  <div className="text-sm text-gray-600">Liters: {item.liters} • Dry Kilos: {item.dryKilos} • Metrolac: {item.metrolac}</div>
                  <div className="text-sm text-gray-600">Supplier: {item.supplierCode || '—'} • NH3: {item.nh3Volume || 0} • TMTD: {item.tmtDVolume || 0}</div>
                  <div className="text-xs text-gray-500">By: {item.createdBy ? item.createdBy.name : '—'}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 border rounded" onClick={()=>edit(item)}>Edit</button>
                  <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={()=>remove(item._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Confirm open={!!pendingDelete} title="Delete entry?" onCancel={()=>setPendingDelete(null)} onConfirm={()=>doConfirmDelete(pendingDelete)} />
      </div>
    </div>
  )
}
