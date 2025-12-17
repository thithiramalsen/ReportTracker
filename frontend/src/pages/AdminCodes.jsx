import React, { useEffect, useState } from 'react'
import API from '../api'
import { useToast } from '../components/Toast'
import { MapPin } from 'lucide-react'

export default function AdminCodes(){
  const [codes, setCodes] = useState([])
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [role, setRole] = useState('user')
  const toast = useToast()

  const load = () => API.get('/codes').then(r=>setCodes(r.data)).catch(e=>console.error(e))
  useEffect(()=>{ load() }, [])

  const create = async (e) => {
    e.preventDefault()
    if (!code) return toast.show('Code required', 'error')
    try {
      await API.post('/codes', { code, label, role })
      setCode(''); setLabel(''); setRole('user')
      load()
      try { toast.show('Code created', 'success') } catch(e){}
    } catch (err) {
      const em = err?.response?.data?.message || 'Create failed'
      try { toast.show(em, 'error') } catch(e){}
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete code slot?')) return
    try {
      await API.delete(`/codes/${id}`)
      load()
      try { toast.show('Code deleted', 'success') } catch(e){}
    } catch (err) {
      const em = err?.response?.data?.message || 'Delete failed'
      try { toast.show(em, 'error') } catch(e){}
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h2 className="text-2xl mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-gray-600"/> Manage Codes</h2>

      <div className="card mb-4">
        <form onSubmit={create} className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm">Code</label>
            <input value={code} onChange={e=>setCode(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Label</label>
            <input value={label} onChange={e=>setLabel(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Role</label>
            <select value={role} onChange={e=>setRole(e.target.value)} className="w-full border p-2 rounded">
              <option value="user">user</option>
              <option value="manager">manager</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="col-span-3 mt-2">
            <button className="btn" type="submit">Create Code</button>
          </div>
        </form>
      </div>

      <div className="card">
        {codes.map(c=> (
          <div key={c._id} className="flex justify-between items-center py-2">
            <div>
              <div className="font-medium">{c.code} {c.label ? `— ${c.label}` : ''}</div>
              <div className="text-sm text-gray-600">Role: {c.role} • Active: {c.isActive ? 'yes' : 'no'} • UsedBy: {c.usedBy ? 'assigned' : 'free'}</div>
            </div>
            <div>
              <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={()=>remove(c._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
