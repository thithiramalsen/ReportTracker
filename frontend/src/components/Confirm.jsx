import React from 'react'

export default function Confirm({ open, title = 'Are you sure?', description, onConfirm, onCancel, confirmText='Yes', cancelText='Cancel' }){
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded shadow-lg max-w-md w-full p-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && <div className="text-sm text-gray-600 mt-2">{description}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 border rounded">{cancelText}</button>
          <button onClick={onConfirm} className="px-3 py-1 bg-red-600 text-white rounded">{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
