import React, { useEffect, useState } from 'react'
import API from '../api'
import { useToast } from '../components/Toast'
import Confirm from '../components/Confirm'
import { MapPin } from 'lucide-react'

export default function AdminCodes(){
  const [tab, setTab] = useState('user')
  const [codes, setCodes] = useState([])
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [role, setRole] = useState('user')
  const [supplierCode, setSupplierCode] = useState('')
  const [supplierLabel, setSupplierLabel] = useState('')
  const toast = useToast()
  const [pendingDelete, setPendingDelete] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editActive, setEditActive] = useState(true)

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

  const createSupplier = async (e) => {
    e.preventDefault()
    if (!supplierCode) return toast.show('Code required', 'error')
    try {
      await API.post('/codes', { code: supplierCode, label: supplierLabel, role: 'supplier' })
      setSupplierCode(''); setSupplierLabel('')
      load()
      try { toast.show('Supplier code created', 'success') } catch(e){}
    } catch (err) {
      const em = err?.response?.data?.message || 'Create failed'
      try { toast.show(em, 'error') } catch(e){}
    }
  }

  const remove = async (id) => {
    setPendingDelete(id)
  }

  const doConfirmDelete = async (id) => {
    setPendingDelete(null)
    try {
      await API.delete(`/codes/${id}`)
      load()
      try { toast.show('Code deleted', 'success') } catch(e){}
    } catch (err) {
      const em = err?.response?.data?.message || 'Delete failed'
      try { toast.show(em, 'error') } catch(e){}
    }
  }

  const startEdit = (c) => {
    setEditingId(c._id)
    setEditLabel(c.label || '')
    setEditActive(!!c.isActive)
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      await API.patch(`/codes/${editingId}`, { label: editLabel, isActive: editActive })
      setEditingId(null); setEditLabel(''); setEditActive(true)
      load()
      try { toast.show('Updated', 'success') } catch(e){}
    } catch (err) {
      const em = err?.response?.data?.message || 'Update failed'
      try { toast.show(em, 'error') } catch(e){}
    }
  }

  const cancelEdit = () => {
    setEditingId(null); setEditLabel(''); setEditActive(true)
  }

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h2 className="text-2xl mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-gray-600"/> Manage Codes</h2>
      <div className="mb-4">
        <div className="flex gap-2">
          <button className={`px-3 py-2 rounded ${tab==='user' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={()=>setTab('user')}>User Codes</button>
          <button className={`px-3 py-2 rounded ${tab==='supplier' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={()=>setTab('supplier')}>Supplier Codes</button>
        </div>
      </div>

      {tab === 'user' && (
        <>
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
            <h3 className="font-semibold mb-2">User / Admin Codes</h3>
            {codes.filter(c=>c.role!=='supplier').map(c=> (
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
        </>
      )}

      {tab === 'supplier' && (
        <div className="mt-6">
          <h2 className="text-xl mb-3">Supplier Codes</h2>
          <div className="card mb-4">
            <form onSubmit={createSupplier} className="grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-sm">Code</label>
                <input value={supplierCode} onChange={e=>setSupplierCode(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm">Label</label>
                <input value={supplierLabel} onChange={e=>setSupplierLabel(e.target.value)} />
              </div>
              <div className="col-span-3 mt-2">
                <button className="btn" type="submit">Create Supplier Code</button>
              </div>
            </form>
          </div>

          <div className="card">
            {codes.filter(c=>c.role==='supplier').map(c=> (
              <div key={c._id} className="flex justify-between items-center py-2">
                <div>
                  {editingId === c._id ? (
                    <div className="flex gap-2 items-center">
                      <div>
                        <input value={editLabel} onChange={e=>setEditLabel(e.target.value)} placeholder="Label" />
                      </div>
                      <div className="text-sm">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={editActive} onChange={e=>setEditActive(e.target.checked)} /> Active
                        </label>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium">{c.code} {c.label ? `— ${c.label}` : ''}</div>
                      <div className="text-sm text-gray-600">Active: {c.isActive ? 'yes' : 'no'} • UsedBy: {c.usedBy ? 'assigned' : 'free'}</div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {editingId === c._id ? (
                    <>
                      <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={saveEdit}>Save</button>
                      <button className="px-3 py-1 bg-gray-300 rounded" onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={()=>startEdit(c)}>Edit</button>
                      <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={()=>remove(c._id)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Confirm open={!!pendingDelete} title="Delete code slot?" onCancel={()=>setPendingDelete(null)} onConfirm={()=>doConfirmDelete(pendingDelete)} />
    </div>
  )
}
