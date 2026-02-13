'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { submitWithdrawalRequest } from './actions'
import toast from 'react-hot-toast'

export default function WithdrawalForm({ member }: { member: any }) {
  const [source, setSource] = useState<'MONTHLY_SAVINGS' | 'SPECIAL_SAVINGS'>('MONTHLY_SAVINGS')
  
  // Calculate limits
  const monthlyBalance = member.balance || 0
  const specialBalance = member.specialBalance || 0
  
  const monthlyLimit = monthlyBalance * 0.7
  const specialLimit = specialBalance // 100% allowed

  const currentBalance = source === 'MONTHLY_SAVINGS' ? monthlyBalance : specialBalance
  const currentLimit = source === 'MONTHLY_SAVINGS' ? monthlyLimit : specialLimit

  async function handleSubmit(formData: FormData) {
    const res = await submitWithdrawalRequest(formData)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success('Request submitted successfully')
    }
  }

  return (
    <form action={handleSubmit} className="mt-6 space-y-4">
      
      {/* Source Selection */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Source Account</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSource('MONTHLY_SAVINGS')}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              source === 'MONTHLY_SAVINGS'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Monthly Savings
            <span className="block text-xs font-normal text-gray-500 mt-1">{formatCurrency(monthlyBalance)}</span>
          </button>
          
          <button
            type="button"
            onClick={() => setSource('SPECIAL_SAVINGS')}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              source === 'SPECIAL_SAVINGS'
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Special Savings
            <span className="block text-xs font-normal text-gray-500 mt-1">{formatCurrency(specialBalance)}</span>
          </button>
        </div>
        <input type="hidden" name="source" value={source} />
      </div>

      {/* Amount Input */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Amount</label>
        <div className="relative">
          <input
            name="requestedAmount"
            type="number"
            min={1}
            max={Math.floor(currentLimit)}
            step={1}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            required
          />
          <div className="absolute right-3 top-2 text-xs text-gray-400">
            Max: {formatCurrency(currentLimit)}
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {source === 'MONTHLY_SAVINGS' 
            ? 'Limit: 70% of balance (Monthly restriction)' 
            : 'Limit: 100% of balance (Special savings)'}
        </p>
      </div>

      {/* Bank Details */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
        <p className="text-xs font-medium text-gray-500 mb-2">Payout to:</p>
        <p className="text-sm font-medium text-gray-900">{member.bankName || 'No bank set'}</p>
        <p className="text-xs text-gray-500 font-mono">{member.bankAccountNumber}</p>
        <p className="text-xs text-gray-500">{member.bankAccountName}</p>
        <input type="hidden" name="useProfileBank" value="yes" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
        <textarea
          name="reason"
          rows={2}
          placeholder="e.g. Rent, Emergency..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        disabled={currentLimit <= 0}
      >
        Submit Request
      </button>
    </form>
  )
}
