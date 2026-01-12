import React, { useEffect, useState } from 'react'
import API from '../api'
import { useToast } from '../components/Toast'

export default function DailyDataEntry(){
  const [date, setDate] = useState('')
  const [liters, setLiters] = useState('')
  const [dryKilos, setDryKilos] = useState('')
  const [metrolac, setMetrolac] = useState('')
  const [supplierCode, setSupplierCode] = useState('')
  const [nh3Volume, setNh3Volume] = useState('')
  const [tmtDVolume, setTmtDVolume] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()
  const [suppliers, setSuppliers] = useState([])

  useEffect(()=>{
    if (!date) setDate(new Date().toISOString().slice(0,10))
    let mounted = true
    API.get('/codes/suppliers').then(r => { if (mounted) setSuppliers(r.data) }).catch(()=>{})
    return () => { mounted = false }
  }, [])

  const submit = async (e) => {
    e && e.preventDefault()
    const errs = {}
    if (!date) errs.date = 'Date is required'
    if (!supplierCode) errs.supplierCode = 'Supplier is required'
    const numFields = { liters, dryKilos, metrolac, nh3Volume, tmtDVolume }
    Object.entries(numFields).forEach(([k,v])=>{
      if (v!=='' && isNaN(Number(v))) errs[k] = 'Must be a number'
      if (v!=='' && Number(v) < 0) errs[k] = 'Must be >= 0'
    })
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    try {
      const payload = {
        date,
        liters: Number(liters||0),
        dryKilos: Number(dryKilos||0),
        metrolac: Number(metrolac||0),
        supplierCode,
        nh3Volume: Number(nh3Volume||0),
        tmtDVolume: Number(tmtDVolume||0)
      }
      await API.post('/daily-data', payload)
      try { toast.show('Saved', 'success') } catch(e){}
      setDate(new Date().toISOString().slice(0,10))
      setLiters(''); setDryKilos(''); setMetrolac(''); setSupplierCode(''); setNh3Volume(''); setTmtDVolume('')
    } catch (err) {
      console.error(err)
      try { toast.show(err?.response?.data?.message || 'Save failed', 'error') } catch(e){}
    } finally { setSubmitting(false) }
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 card">
      <h3 className="text-xl mb-4">Daily Data Entry</h3>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm">Date</label>
          <input type="date" value={date} onChange={e=>{ setDate(e.target.value); setErrors(prev=>({ ...prev, date: undefined })) }} className="w-full" />
          {errors.date && <div className="text-xs text-red-600 mt-1">{errors.date}</div>}
        </div>
        <div>
          <label className="block text-sm">Supplier</label>
          <select value={supplierCode} onChange={e=>{ setSupplierCode(e.target.value); setErrors(prev=>({ ...prev, supplierCode: undefined })) }} className="w-full border p-2 rounded">
            <option value="">— Select supplier —</option>
            {suppliers.map(s => (
              <option key={s._id} value={s.code}>{s.code}{s.label ? ` — ${s.label}` : ''}</option>
            ))}
          </select>
          {errors.supplierCode && <div className="text-xs text-red-600 mt-1">{errors.supplierCode}</div>}
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
          <button className="btn" type="submit" disabled={submitting}>Save</button>
        </div>
      </form>
    </div>
  )
}
