import React, { useEffect, useState } from 'react'
import API from '../api'
import { Users } from 'lucide-react'
import { useToast } from '../components/Toast'

export default function AdminUsers() {
  const [users, setUsers] = useState([])

  const load = () => {
    API.get('/users').then(res=>setUsers(res.data)).catch(err=>console.error(err))
  }

  const toast = useToast()

  useEffect(()=>{ load() }, [])

  const remove = async (id) => {
    if (!confirm('Delete user?')) return
    try {
      await API.delete(`/users/${id}`)
      load()
      try { toast.show('User deleted', 'success') } catch(e){}
    } catch (err) {
      const em = err?.response?.data?.message || 'Delete failed'
      try { toast.show(em, 'error') } catch(e){}
    }
  }

  const approve = async (id) => {
    try {
      await API.post(`/users/${id}/approve`)
      load()
      try { toast.show('User approved', 'success') } catch(e){}
    } catch (err) {
      const em = err?.response?.data?.message || 'Approve failed'
      try { toast.show(em, 'error') } catch(e){}
    }
  }

  const deny = async (id) => {
    if (!confirm('Deny and remove this user?')) return
    try {
      await API.post(`/users/${id}/deny`)
      load()
      try { toast.show('User denied and removed', 'success') } catch(e){}
    } catch (err) {
      const em = err?.response?.data?.message || 'Deny failed'
      try { toast.show(em, 'error') } catch(e){}
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h2 className="text-2xl mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-gray-600"/> Manage Users</h2>
      <div className="card">
        {users.map(u => (
          <div key={u._id} className="flex justify-between items-center py-2">
            <div>
              <div className="font-medium">{u.name} ({u.code})</div>
              <div className="text-sm text-gray-600">Role: {u.role} • Phone: {u.phone || '—'}{u.email ? ` • Email: ${u.email}` : ''}</div>
            </div>
            <div className="flex gap-2">
              {!u.isApproved && <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={()=>approve(u._id)}>Approve</button>}
              {!u.isApproved && <button className="px-3 py-1 bg-gray-300 text-gray-800 rounded" onClick={()=>deny(u._id)}>Deny</button>}
              <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={()=>remove(u._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
