import React, { useEffect, useState } from 'react'
import API from '../api'
import { Users } from 'lucide-react'
import { useToast } from '../components/Toast'
import Confirm from '../components/Confirm'
import { Eye, EyeOff } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState([])

  const load = () => {
    API.get('/users').then(res=>setUsers(res.data)).catch(err=>console.error(err))
  }

  const toast = useToast()
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingDeny, setPendingDeny] = useState(null)
  const [pendingReset, setPendingReset] = useState(null)
  const [resetPassword, setResetPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)

  useEffect(()=>{ load() }, [])

  const remove = async (id) => {
    setPendingDelete(id)
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
    setPendingDeny(id)
  }

  const doConfirmDelete = async (id) => {
    setPendingDelete(null)
    try { await API.delete(`/users/${id}`); load(); toast.show('User deleted','success') } catch(e){ const em = e?.response?.data?.message || 'Delete failed'; toast.show(em,'error') }
  }

  const doConfirmDeny = async (id) => {
    setPendingDeny(null)
    try { await API.post(`/users/${id}/deny`); load(); toast.show('User denied and removed','success') } catch(e){ const em = e?.response?.data?.message || 'Deny failed'; toast.show(em,'error') }
  }

  const submitReset = async () => {
    if (!pendingReset) return
    try {
      await API.post('/auth/admin-reset', { userId: pendingReset._id, password: resetPassword })
      toast.show('Password reset', 'success')
      setPendingReset(null)
      setResetPassword('')
    } catch (e) {
      const em = e?.response?.data?.message || 'Reset failed'
      toast.show(em, 'error')
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
              <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={()=>{ setPendingReset(u); setResetPassword('') }}>Reset Password</button>
              <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={()=>remove(u._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <Confirm open={!!pendingDelete} title="Delete user?" onCancel={()=>setPendingDelete(null)} onConfirm={()=>doConfirmDelete(pendingDelete)} />
      <Confirm open={!!pendingDeny} title="Deny and remove this user?" onCancel={()=>setPendingDeny(null)} onConfirm={()=>doConfirmDeny(pendingDeny)} />

      {pendingReset && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-4 w-full max-w-md">
            <div className="text-lg font-semibold mb-2">Reset password</div>
            <div className="text-sm text-gray-600 mb-3">{pendingReset.name} ({pendingReset.code})</div>
            <label className="text-xs text-gray-500">New password</label>
            <div className="mt-1 relative">
              <input type={showResetPassword ? 'text' : 'password'} value={resetPassword} onChange={e=>setResetPassword(e.target.value)} className="w-full border p-2 rounded mb-4" placeholder="Enter new password" />
              <button type="button" className="absolute right-3 top-3 text-gray-600" onClick={()=>setShowResetPassword(s=>!s)} aria-label="Toggle password visibility">
                {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={()=>{ setPendingReset(null); setResetPassword('') }}>Cancel</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={submitReset} disabled={!resetPassword}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
