import React, { useEffect, useState } from 'react'
import API from '../api'
import { UploadCloud } from 'lucide-react'
import { useToast } from '../components/Toast'

export default function UploadPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [file, setFile] = useState(null)
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState([])
  const toast = useToast()

  useEffect(() => {
    API.get('/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error(err))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!file) return tryToast('Select PDF', 'error')

    const form = new FormData()
    form.append('title', title)
    form.append('description', description)
    form.append('reportDate', reportDate)
    form.append('file', file)
    form.append('userIds', JSON.stringify(selected))

    try {
      await API.post('/reports', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      try { toast.show('Uploaded', 'success') } catch(e){}
      // clear form
      setTitle('')
      setDescription('')
      setReportDate('')
      setFile(null)
      setSelected([])
    } catch (err) {
      const em = err?.response?.data?.message || 'Upload failed'
      try { toast.show(em, 'error') } catch(e){}
    }
  }

  function tryToast(msg, type='info'){
    try{ toast.show(msg, type) }catch(e){ alert(msg) }
  }

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 card">
      <h3 className="text-xl mb-3 flex items-center gap-2"><UploadCloud className="w-5 h-5 text-gray-600"/> Upload Report (Admin)</h3>
      <form onSubmit={submit}>
        <div>
          <label className="block text-sm">Title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Description</label>
          <input value={description} onChange={e=>setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Report Date</label>
          <input type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">File (PDF)</label>
          <input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files[0])} />
        </div>

        <div>
          <label className="block text-sm">Assign to users</label>
          <div className="max-h-48 overflow-auto border p-2">
            {users.map(u => (
              <div key={u._id} className="py-1">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={selected.includes(u._id)} onChange={()=>toggle(u._id)} /> <span>{u.name} ({u.email})</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <button className="mt-3" type="submit">Upload</button>
      </form>
    </div>
  )
}
