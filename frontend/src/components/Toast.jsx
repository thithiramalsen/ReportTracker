import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }){
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type='info', ttl=4000)=>{
    const id = Date.now()+Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(()=>{
      setToasts(t => t.filter(x=>x.id !== id))
    }, ttl)
  }, [])

  const ctx = { show }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`max-w-sm w-full p-3 rounded shadow text-sm ${t.type==='error' ? 'bg-red-50 text-red-800' : t.type==='success' ? 'bg-green-50 text-green-800' : 'bg-white text-gray-800'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
