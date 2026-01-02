import React, { useEffect, useState } from 'react'
import API from '../api'
import { useToast } from '../components/Toast'

export default function AdminNotifyJobs(){
  const [jobs, setJobs] = useState([])
  const toast = useToast()

  const load = async ()=>{
    try { const res = await API.get('/notify/jobs'); setJobs(res.data) } catch(e){ console.error(e) }
  }

  useEffect(()=>{ load() }, [])

  const retry = async (id)=>{
    try { await API.patch(`/notify/jobs/${id}/retry`); load(); try{ toast.show('Retry scheduled','success') }catch(e){} } catch(e){ console.error(e); try{ toast.show('Retry failed','error') }catch(e){} }
  }

  const resolveJob = async (id)=>{
    try { await API.patch(`/notify/jobs/${id}/resolve`); load(); try{ toast.show('Marked resolved','success') }catch(e){} } catch(e){ console.error(e); try{ toast.show('Resolve failed','error') }catch(e){} }
  }

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <h2 className="text-2xl mb-4">SMS Jobs</h2>
      <div className="space-y-2">
        {jobs.map(j => (
          <div key={j._id} className="p-3 border rounded flex justify-between">
            <div>
              <div className="font-medium">To: {j.to} • Status: {j.status} • Attempts: {j.attempts}</div>
              <div className="text-sm text-gray-600">Created: {new Date(j.createdAt).toLocaleString()}</div>
              <div className="text-sm mt-2">{j.message}</div>
              {j.lastError && <div className="text-sm text-red-600 mt-1">Last error: {j.lastError}</div>}
              {j.providerMessageId && <div className="text-sm text-gray-600 mt-1">Provider ID: {j.providerMessageId}</div>}
            </div>
            <div className="flex flex-col gap-2">
              <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={()=>retry(j._id)}>Retry</button>
              <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={()=>resolveJob(j._id)}>Resolve</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
