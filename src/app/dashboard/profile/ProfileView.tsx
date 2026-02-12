'use client'

import { useState } from 'react'
import { Pencil, Save, X } from 'lucide-react'
import { updateProfile } from './actions'
import toast from 'react-hot-toast'

export default function ProfileView({ member }: { member: any }) {
  const [isEditingBank, setIsEditingBank] = useState(false)
  const [isEditingPhone, setIsEditingPhone] = useState(false)

  async function handleSave(formData: FormData) {
    const res = await updateProfile(formData)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success('Profile updated successfully')
      setIsEditingBank(false)
      setIsEditingPhone(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Personal Info Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-gray-500">Name</span>
            <span className="col-span-2 font-medium text-gray-900">{member.name || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-gray-500">Email</span>
            <span className="col-span-2 font-medium text-gray-900">{member.email}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-gray-500">Staff ID</span>
            <span className="col-span-2 font-medium text-gray-900">{member.staffId || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-gray-500">Department</span>
            <span className="col-span-2 font-medium text-gray-900">{member.department || 'N/A'}</span>
          </div>

          {/* Editable Phone */}
          <form action={handleSave} className="border-t border-gray-100 pt-4">
            <div className="grid grid-cols-3 gap-2 text-sm items-center">
              <span className="text-gray-500">Phone</span>
              {isEditingPhone ? (
                <div className="col-span-2 flex gap-2">
                  <input
                    name="phone"
                    defaultValue={member.phone || ''}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    required
                  />
                  <button type="submit" className="text-green-600 hover:text-green-700">
                    <Save size={16} />
                  </button>
                  <button type="button" onClick={() => setIsEditingPhone(false)} className="text-red-500 hover:text-red-600">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="col-span-2 flex items-center justify-between">
                  <span className="font-medium text-gray-900">{member.phone || 'N/A'}</span>
                  <button type="button" onClick={() => setIsEditingPhone(true)} className="text-primary-600 hover:text-primary-700">
                    <Pencil size={14} />
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Bank Details Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
          {!isEditingBank && (
            <button
              onClick={() => setIsEditingBank(true)}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>

        {isEditingBank ? (
          <form action={handleSave} className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Bank Name</label>
              <input
                name="bankName"
                defaultValue={member.bankName || ''}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Account Number</label>
              <input
                name="bankAccountNumber"
                defaultValue={member.bankAccountNumber || ''}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Account Name</label>
              <input
                name="bankAccountName"
                defaultValue={member.bankAccountName || ''}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                required
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditingBank(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-500">Bank</span>
              <span className="col-span-2 font-medium text-gray-900">{member.bankName || 'Not Set'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-500">Account No</span>
              <span className="col-span-2 font-medium text-gray-900 font-mono">{member.bankAccountNumber || 'Not Set'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-500">Acct Name</span>
              <span className="col-span-2 font-medium text-gray-900">{member.bankAccountName || 'Not Set'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
