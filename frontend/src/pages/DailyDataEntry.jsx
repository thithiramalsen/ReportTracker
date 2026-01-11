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
  const toast = useToast()

  useEffect(()=>{
    if (!date) setDate(new Date().toISOString().slice(0,10))
  }, [])

  const submit = async (e) => {
    e && e.preventDefault()
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
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 card">
      <h3 className="text-xl mb-4">Daily Data Entry</h3>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm">Date</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block text-sm">Supplier code</label>
          <input value={supplierCode} onChange={e=>setSupplierCode(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block text-sm">Liters</label>
          <input value={liters} onChange={e=>setLiters(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block text-sm">Dry kilos</label>
          <input value={dryKilos} onChange={e=>setDryKilos(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block text-sm">Metrolac</label>
          <input value={metrolac} onChange={e=>setMetrolac(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block text-sm">NH3 Volume</label>
          <input value={nh3Volume} onChange={e=>setNh3Volume(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block text-sm">TMTD Volume</label>
          <input value={tmtDVolume} onChange={e=>setTmtDVolume(e.target.value)} className="w-full" />
        </div>
        <div className="flex items-end">
          <button className="btn" type="submit">Save</button>
        </div>
      </form>
    </div>
  )
}
