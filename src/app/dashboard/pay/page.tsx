import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { COOPERATIVE_BANK_DETAILS } from '@/lib/constants'
import { PaymentType, TransactionType } from '@prisma/client'

function paymentToTransactionType(type: PaymentType): TransactionType {
  if (type === 'LOAN_REPAYMENT') return 'LOAN_REPAYMENT'
  if (type === 'REGISTRATION') return 'REGISTRATION'
  if (type === 'SAVINGS') return 'SAVINGS'
  return 'CONTRIBUTION'
}

async function submitPayment(formData: FormData) {
  'use server'

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'MEMBER') {
    redirect('/dashboard')
  }

  const typeRaw = String(formData.get('type') || 'CONTRIBUTION')
  const amount = Number(formData.get('amount') || 0)
  const paymentDateRaw = String(formData.get('paymentDate') || '')
  const transactionReference = String(formData.get('transactionReference') || '').trim()
  const proofImage = String(formData.get('proofImage') || '').trim()
  const notes = String(formData.get('notes') || '').trim()

  const validTypes: PaymentType[] = ['CONTRIBUTION', 'SAVINGS', 'LOAN_REPAYMENT']
  const type: PaymentType = validTypes.includes(typeRaw as PaymentType)
    ? (typeRaw as PaymentType)
    : 'CONTRIBUTION'

  const paymentDate = paymentDateRaw ? new Date(paymentDateRaw) : new Date()
  const validDate = !Number.isNaN(paymentDate.getTime())

  if (!Number.isFinite(amount) || amount < 1000 || !transactionReference || !proofImage || !validDate) {
    return
  }

  const payment = await prisma.payment.create({
    data: {
      userId: session.user.id,
      type,
      amount,
      date: paymentDate,
      transactionReference,
      proofImage,
      status: 'PENDING',
      notes: notes || 'Payment submitted by member for verification.',
    },
  })

  await prisma.transaction.create({
    data: {
      userId: session.user.id,
      paymentId: payment.id,
      type: paymentToTransactionType(type),
      amount,
      status: 'PENDING',
      reference: `TRX-${payment.id.slice(-8).toUpperCase()}`,
      description: notes || `${type.replace('_', ' ')} submission pending admin verification`,
    },
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/pay')
  revalidatePath('/dashboard/history')
}

export default async function PayPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/login')
  }

  if (session.user.role !== 'MEMBER') {
    redirect('/dashboard')
  }

  const member = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      monthlyContribution: true,
      loanBalance: true,
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 12,
      },
    },
  })

  if (!member) {
    redirect('/login')
  }

  const pending = member.payments.filter((payment) => payment.status === 'PENDING')
  const approved = member.payments.filter((payment) => payment.status === 'APPROVED')

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Make Payment</h1>
        <p className="mt-1 text-gray-500">Submit contributions and repayments for admin verification.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Pending Verifications" value={pending.length.toString()} tone="amber" />
        <MetricCard
          label="Approved This Cycle"
          value={formatCurrency(approved.reduce((sum, payment) => sum + payment.amount, 0))}
          tone="green"
        />
        <MetricCard label="Outstanding Loan" value={formatCurrency(member.loanBalance)} tone="blue" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">New Payment Submission</h2>
          <p className="mt-1 text-sm text-gray-500">
            Recommended monthly contribution: {formatCurrency(member.monthlyContribution || 0)}
          </p>
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Cooperative Account for Direct Deposits</p>
            <p className="mt-1 text-sm font-medium text-blue-900">{COOPERATIVE_BANK_DETAILS.accountName}</p>
            <p className="text-sm text-blue-900">Account Number: {COOPERATIVE_BANK_DETAILS.accountNumber}</p>
          </div>

          <form action={submitPayment} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Payment Type</label>
              <select
                name="type"
                defaultValue="CONTRIBUTION"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              >
                <option value="CONTRIBUTION">Contribution</option>
                <option value="SAVINGS">Savings Top-up</option>
                <option value="LOAN_REPAYMENT">Loan Repayment</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Amount (Naira)</label>
              <input
                name="amount"
                type="number"
                min={1000}
                step={500}
                placeholder="e.g. 25000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Payment Date</label>
              <input
                name="paymentDate"
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Transaction Reference</label>
              <input
                name="transactionReference"
                type="text"
                placeholder="e.g. NIP5829211037"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Proof of Payment (URL or file link)</label>
              <input
                name="proofImage"
                type="text"
                placeholder="https://.../receipt.jpg"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Narration</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Transfer reference, bank name, or extra notes"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Submit for Verification
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Submissions</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {member.payments.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No payment submissions yet.</div>
            ) : (
              member.payments.slice(0, 8).map((payment) => (
                <div key={payment.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{payment.type.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(payment.date)}</p>
                      <p className="text-xs text-gray-500">Ref: {payment.transactionReference || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                      <StatusBadge status={payment.status} />
                    </div>
                  </div>
                  {payment.notes && <p className="mt-1 text-xs text-gray-500">{payment.notes}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'green' | 'blue' }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    green: 'border-green-200 bg-green-50 text-green-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
  }

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}
