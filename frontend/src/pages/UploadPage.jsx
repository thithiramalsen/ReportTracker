import React, { useEffect, useState } from 'react'
import API from '../api'
import { UploadCloud, DownloadCloud, Trash2, Edit3, Eye, Clipboard } from 'lucide-react'
import { useToast } from '../components/Toast'
import Confirm from '../components/Confirm'

export default function UploadPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [errors, setErrors] = useState({})
  const [file, setFile] = useState(null)
  const [users, setUsers] = useState([])
  const [codes, setCodes] = useState([])
  const [selected, setSelected] = useState([])
  const [selectedCodes, setSelectedCodes] = useState([])
  const [reports, setReports] = useState([])
  const [editingReport, setEditingReport] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const toast = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  useEffect(() => {
    // Prefill report date with today for convenience
    if (!reportDate) setReportDate(new Date().toISOString().slice(0,10))
    API.get('/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error(err))
    API.get('/codes').then(res => setCodes(res.data)).catch(()=>{})
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await API.get('/reports')
      // Ensure sorted by upload time (createdAt) client-side as well
      const sorted = (res.data || []).slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      setReports(sorted)
    } catch (e) {
      console.error(e)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    // client-side validations
    const newErrors = {}
    if (!title || !String(title).trim()) newErrors.title = 'Title is required'
    if (!reportDate) newErrors.reportDate = 'Report date is required'
    // validate date
    if (reportDate && Number.isNaN(new Date(reportDate).getTime())) newErrors.reportDate = 'Invalid date'
    if (!file) newErrors.file = 'Select a PDF file'
    else if (file && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) newErrors.file = 'File must be a PDF'
    else if (file && file.size > 25 * 1024 * 1024) newErrors.file = 'File must be under 25MB'
    setErrors(newErrors)
    if (Object.keys(newErrors).length) {
      const first = Object.values(newErrors)[0]
      return tryToast(first, 'error')
    }

    setIsUploading(true)

    const form = new FormData()
    form.append('title', title)
    form.append('description', description)
    form.append('reportDate', reportDate)
    form.append('file', file)
    if (selectedCodes && selectedCodes.length) form.append('codes', JSON.stringify(selectedCodes))

    try {
      await API.post('/reports', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      try { toast.show('Uploaded', 'success') } catch(e){}
      // refresh list
      fetchReports()
      // clear form
      setTitle('')
      setDescription('')
      setReportDate(new Date().toISOString().slice(0,10))
      setFile(null)
      setSelected([])
      setSelectedCodes([])
    } catch (err) {
      const em = err?.response?.data?.message || 'Upload failed'
      try { toast.show(em, 'error') } catch(e){}
    }
    finally {
      setIsUploading(false)
    }
  }

  function tryToast(msg, type='info'){
    try{ toast.show(msg, type) }catch(e){ console.log(msg) }
  }

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  const openBlob = async (id, asDownload = false) => {
    try {
      console.log('[UI] download token', localStorage.getItem('token'))
      const resp = await API.get(`/reports/${id}/download`, { responseType: 'blob' })
      const blob = new Blob([resp.data], { type: resp.data.type || 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      if (asDownload) {
        const a = document.createElement('a')
        a.href = url
        a.download = 'report.pdf'
        document.body.appendChild(a)
        a.click()
        a.remove()
      } else {
        window.open(url, '_blank')
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch (err) {
      console.error(err)
      try { toast.show('Unable to download file', 'error') } catch(e){}
    }
  }

  const copyLink = async (id) => {
    try {
      // Build the same download URL used in notifications; requires auth and will redirect to login otherwise.
      const rawBase = import.meta.env.VITE_API_BASE || `${window.location.origin}/api`
      const apiBase = rawBase.replace(/\/$/, '')
      const link = `${apiBase}/reports/${id}/download`
      await navigator.clipboard.writeText(link)
      try { toast.show('Link copied', 'success') } catch (e) { console.log('Link copied', link) }
    } catch (err) {
      console.error('copy link failed', err)
      try { toast.show('Unable to copy link', 'error') } catch (e) {}
    }
  }

  const removeReport = async (id) => {
    // show confirm modal instead of browser confirm
    setPendingDelete(id)
  }

  const saveAssignments = async (reportId, userIds) => {
    try {
      const body = { userIds }
      await API.patch(`/reports/${reportId}/assign`, body)
      try { toast.show('Assignments updated', 'success') } catch(e){}
      setEditingReport(null)
      fetchReports()
    } catch (err) {
      console.error(err)
      try { toast.show('Update failed', 'error') } catch(e){}
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 card">
      <h3 className="text-xl mb-3 flex items-center gap-2"><UploadCloud className="w-5 h-5 text-gray-600"/> Upload Report (Admin)</h3>
      <form onSubmit={submit}>
        <div>
          <label className="block text-sm">Title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full border p-2 rounded mt-1" />
          {errors.title && <div className="text-xs text-red-600 mt-1">{errors.title}</div>}
        </div>
        <div className="mt-3">
          <label className="block text-sm">Description</label>
          <input value={description} onChange={e=>setDescription(e.target.value)} className="w-full border p-2 rounded mt-1" />
        </div>
        <div className="mt-3">
          <label className="block text-sm">Report Date</label>
          <input type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)} className="w-full border p-2 rounded mt-1" />
          {errors.reportDate && <div className="text-xs text-red-600 mt-1">{errors.reportDate}</div>}
        </div>
        <div className="mt-3">
          <label className="block text-sm">File (PDF)</label>
          <input disabled={isUploading} type="file" accept="application/pdf" onChange={e=>setFile(e.target.files[0])} className="mt-1" />
          {file && <div className="text-sm text-gray-600 mt-1">Selected: {file.name}</div>}
          {errors.file && <div className="text-xs text-red-600 mt-1">{errors.file}</div>}
        </div>

        <div className="mt-3">
          <label className="block text-sm">Assign by Division Codes</label>
          <select multiple value={selectedCodes} onChange={e => setSelectedCodes(Array.from(e.target.selectedOptions, o=>o.value))} className="w-full border p-2 mt-1 rounded h-40">
            {codes.map(c => (
              <option key={c._id} value={c.code}>{c.code}{c.label ? ` — ${c.label}` : ''} {c.usedBy ? ` — ${c.usedBy.name}` : ' — (unassigned)'} ({c.role || 'user'})</option>
            ))}
          </select>
          <div className="text-xs text-gray-500 mt-1">Select division codes to assign everyone in those divisions.</div>
        </div>

        <button disabled={isUploading} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded" type="submit">
          {isUploading ? (
            <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
          ) : (
            <UploadCloud className="w-4 h-4" />
          )}
          <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
        </button>
      </form>

      {/* Upload history / recent reports */}
      <div className="mt-6">
        <h4 className="text-lg mb-2">Recent Uploads</h4>
        {reports.length === 0 ? (
          <div className="text-sm text-gray-500">No uploads yet.</div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r._id} className="border rounded p-3 flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-sm text-gray-600">Report date: {new Date(r.reportDate).toLocaleDateString()}</div>
                  <div className="text-sm text-gray-500">Uploaded: {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</div>
                  <div className="text-sm text-gray-700 mt-2">Assigned: {r.assignedUsers && r.assignedUsers.length ? r.assignedUsers.map(u=>u.name || u.code).join(', ') : '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button title="View" onClick={()=>openBlob(r._id)} className="px-2 py-1 border rounded" aria-label="view"><Eye className="w-4 h-4"/></button>
                  <button title="Download" onClick={()=>openBlob(r._id, true)} className="px-2 py-1 border rounded" aria-label="download"><DownloadCloud className="w-4 h-4"/></button>
                  <button title="Copy login link" onClick={()=>copyLink(r._id)} className="px-2 py-1 border rounded" aria-label="copy-link"><Clipboard className="w-4 h-4"/></button>
                  <button title="Edit Assignments" onClick={()=>setEditingReport(r)} className="px-2 py-1 border rounded" aria-label="edit"><Edit3 className="w-4 h-4"/></button>
                  <button title="Delete" onClick={()=>removeReport(r._id)} className="px-2 py-1 border rounded text-red-600" aria-label="delete"><Trash2 className="w-4 h-4"/></button>
                  {user?.role === 'admin' && (
                    <a title="Comments" href={`/admin/feedback?reportId=${r._id}`} className="px-2 py-1 border rounded text-sm">Comments</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit assignments modal-like area */}
      {editingReport && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-lg max-w-lg w-full p-4">
            <h5 className="font-semibold">Edit assignments for: {editingReport.title}</h5>
            <div className="mt-2">
              <label className="block text-sm">Assigned users</label>
              <select multiple value={(editingReport.assignedUsers||[]).map(u=>u.id)} onChange={e=>{
                const vals = Array.from(e.target.selectedOptions, o=>o.value)
                setEditingReport(prev => ({ ...prev, assignedUsers: vals.map(id=> {
                  const found = users.find(u=>u._id===id)
                  return found ? { id, name: found.name, code: found.code, phone: found.phone } : { id }
                }) }))
              }} className="w-full border p-2 mt-1">
                {users.map(u=> <option key={u._id} value={u._id}>{u.name} — {u.code}{u.phone ? ` (${u.phone})` : ''}</option>)}
              </select>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>setEditingReport(null)} className="px-3 py-1 border rounded">Cancel</button>
              <button onClick={()=> saveAssignments(editingReport._id, (editingReport.assignedUsers||[]).map(x=> x.id || x)) } className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      )}

      <Confirm open={!!pendingDelete} title="Delete report?" description="This cannot be undone." onCancel={()=>setPendingDelete(null)} onConfirm={()=>doConfirmDelete(pendingDelete)} />
    </div>
  )
}

  const doConfirmDelete = async (id) => {
    setPendingDelete(null)
    try {
      await API.delete(`/reports/${id}`)
      try { toast.show('Report deleted', 'success') } catch(e){}
      fetchReports()
    } catch (err) {
      console.error(err)
      const em = err?.response?.data?.message || 'Delete failed'
      try { toast.show(em, 'error') } catch(e){}
    }
  }
