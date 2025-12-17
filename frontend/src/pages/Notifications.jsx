import React, { useEffect, useState } from 'react'
import API from '../api'
import { Bell } from 'lucide-react'
import { useToast } from '../components/Toast'

export default function Notifications(){
  const [list, setList] = useState([])
  const toast = useToast()

  const load = async () => {
    try {
      const res = await API.get('/notifications')
      setList(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(()=>{ load() }, [])

  const markRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`)
      setList(prev => prev.map(n => n._id===id ? { ...n, read: true } : n))
      try { toast.show('Marked read', 'success') } catch(e){}
    } catch (e) { console.error(e); try { toast.show('Failed', 'error') } catch(e){} }
  }

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h3 className="text-xl mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-gray-600"/> Notifications</h3>
      {list.length===0 ? (
        <div className="text-sm text-gray-500">No notifications</div>
      ) : (
        <div className="space-y-2">
          {list.map(n => (
            <div key={n._id} className={`p-3 border rounded ${n.read ? 'bg-white' : 'bg-yellow-50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{n.message}</div>
                  <div className="text-sm text-gray-600 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  {n.data?.downloadUrl && (<div className="mt-2"><a className="text-blue-600" href={n.data.downloadUrl}>Open report</a></div>)}
                </div>
                <div>
                  {!n.read && <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={()=>markRead(n._id)}>Mark read</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
