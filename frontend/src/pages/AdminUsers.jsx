import React, { useEffect, useState } from 'react'
import API from '../api'

export default function AdminUsers() {
  const [users, setUsers] = useState([])

  const load = () => {
    API.get('/users').then(res=>setUsers(res.data)).catch(err=>console.error(err))
  }

  useEffect(()=>{ load() }, [])

  const remove = async (id) => {
    if (!confirm('Delete user?')) return
    try {
      await API.delete(`/users/${id}`)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h2 className="text-2xl mb-4">Manage Users</h2>
      <div className="card">
        {users.map(u => (
          <div key={u._id} className="flex justify-between items-center py-2">
            <div>
              <div className="font-medium">{u.name}</div>
              <div className="text-sm text-gray-600">{u.email} • {u.role}</div>
            </div>
            <div>
              <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={()=>remove(u._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
