import React, { useEffect, useState } from 'react'
import API from '../api'
import { useToast } from '../components/Toast'

export default function MyDailyData(){
  const [list, setList] = useState([])
  const toast = useToast()

  const load = async () => {
    try {
      const res = await API.get('/daily-data/mine')
      setList(res.data)
    } catch (e) { console.error(e); try { toast.show('Failed to load your entries', 'error') } catch(e){} }
  }

  useEffect(()=>{ load() }, [])

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h3 className="text-xl mb-4">My Daily Data</h3>
      <div className="card">
        {list.length===0 ? <div className="p-4 text-sm text-gray-500">You have not added any data yet.</div> : (
          <div className="space-y-2 p-4">
            {list.map(item => (
              <div key={item._id} className="border rounded p-3">
                <div className="font-medium">{new Date(item.date).toLocaleDateString()} — {item.division || '—'}</div>
                <div className="text-sm text-gray-600">Liters: {item.liters} • Dry Kilos: {item.dryKilos} • Metrolac: {item.metrolac}</div>
                <div className="text-sm text-gray-600">Supplier: {item.supplierCode || '—'} • NH3: {item.nh3Volume || 0} • TMTD: {item.tmtDVolume || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Uploaded: {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
