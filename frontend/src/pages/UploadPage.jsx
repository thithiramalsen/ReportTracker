import React, { useEffect, useState } from 'react'
import API from '../api'

export default function UploadPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [file, setFile] = useState(null)
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState([])

  useEffect(() => {
    API.get('/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error(err))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!file) return alert('Select PDF')

    const form = new FormData()
    form.append('title', title)
    form.append('description', description)
    form.append('reportDate', reportDate)
    form.append('file', file)
    form.append('userIds', JSON.stringify(selected))

    try {
      await API.post('/reports', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      alert('Uploaded')
    } catch (err) {
      alert(err?.response?.data?.message || 'Upload failed')
    }
  }

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 card">
      <h3 className="text-xl mb-3">Upload Report (Admin)</h3>
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
