import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { LOAN_POLICY } from '@/lib/constants'

async function submitLoanRequest(formData: FormData) {
  'use server'

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'MEMBER') {
    redirect('/dashboard')
  }

  const amount = Number(formData.get('amount') || 0)
  const duration = Number(formData.get('duration') || 0)
  const purpose = String(formData.get('purpose') || '').trim()

  if (
    !Number.isFinite(amount) ||
    amount < LOAN_POLICY.minAmount ||
    !Number.isFinite(duration) ||
    duration < LOAN_POLICY.minDurationMonths ||
    duration > LOAN_POLICY.maxDurationMonths ||
    !purpose
  ) {
    return
  }

  const member = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      balance: true,
      loanBalance: true,
      bankName: true,
      bankAccountName: true,
      bankAccountNumber: true,
      loans: {
        where: { status: 'PENDING' },
        select: { id: true },
      },
    },
  })

  if (!member) {
    return
  }

  const eligibility = member.balance * LOAN_POLICY.maxSavingsMultiplier
  if (amount > eligibility) {
    return
  }

  if (member.loanBalance > 0 || member.loans.length > 0) {
    return
  }

  if (!member.bankName || !member.bankAccountName || !member.bankAccountNumber) {
    return
  }

  const interestRate = LOAN_POLICY.interestRatePercent
  const totalRepayable = amount + amount * (interestRate / 100)

  await prisma.loan.create({
    data: {
      userId: session.user.id,
      amount,
      purpose,
      duration,
      interestRate,
      totalRepayable,
      monthlyPayment: totalRepayable / duration,
      status: 'PENDING',
      notes: 'Loan request submitted by member and awaiting admin review.',
      disbursementBankName: member.bankName,
      disbursementAccountName: member.bankAccountName,
      disbursementAccountNumber: member.bankAccountNumber,
    },
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/apply-loan')
  revalidatePath('/dashboard/my-loans')
}

export default async function ApplyLoanPage() {
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
      balance: true,
      loanBalance: true,
      bankName: true,
      bankAccountName: true,
      bankAccountNumber: true,
      loans: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!member) {
    redirect('/login')
  }

  const eligibility = member.balance * LOAN_POLICY.maxSavingsMultiplier
  const pendingLoans = member.loans.filter((loan) => loan.status === 'PENDING')
  const hasOutstandingLoan = member.loanBalance > 0
  const canSubmitLoan = !hasOutstandingLoan && pendingLoans.length === 0
  const hasBankDetails = Boolean(member.bankName && member.bankAccountName && member.bankAccountNumber)

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Apply for Loan</h1>
        <p className="mt-1 text-gray-500">Create a new request and track review status in real time.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Loan Eligibility" value={formatCurrency(eligibility)} tone="blue" />
        <MetricCard label="Current Loan Balance" value={formatCurrency(member.loanBalance)} tone="amber" />
        <MetricCard label="Pending Requests" value={pendingLoans.length.toString()} tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">New Loan Request</h2>
          <p className="mt-1 text-sm text-gray-500">
            You can request up to {formatCurrency(eligibility)} (maximum 2x your current savings).
          </p>
          {!hasBankDetails && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Bank details are missing on your profile. Contact admin to update your account before requesting a loan.
            </p>
          )}
          {!canSubmitLoan && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              You cannot request a new loan while you have a pending request or outstanding approved loan.
            </p>
          )}

          <form action={submitLoanRequest} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Amount (Naira)</label>
              <input
                name="amount"
                type="number"
                min={LOAN_POLICY.minAmount}
                max={Math.max(LOAN_POLICY.minAmount, Math.floor(eligibility))}
                step={1000}
                placeholder="e.g. 150000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                required
                disabled={!canSubmitLoan || !hasBankDetails}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Duration (months)</label>
              <select
                name="duration"
                defaultValue="6"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                disabled={!canSubmitLoan || !hasBankDetails}
              >
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="9">9 months</option>
                <option value="12">12 months</option>
                <option value="18">18 months</option>
                <option value="24">24 months</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Purpose</label>
              <textarea
                name="purpose"
                rows={4}
                placeholder="State why you need this loan"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                required
                disabled={!canSubmitLoan || !hasBankDetails}
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmitLoan || !hasBankDetails}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Submit Loan Request
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {member.loans.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No loan requests yet.</div>
            ) : (
              member.loans.map((loan) => (
                <div key={loan.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(loan.amount)}</p>
                      <p className="text-xs text-gray-500">{loan.duration} months · {loan.interestRate}%</p>
                    </div>
                    <StatusBadge status={loan.status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{loan.purpose}</p>
                  <p className="mt-1 text-xs text-gray-400">Submitted: {formatDateTime(loan.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'amber' | 'green' }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    green: 'border-green-200 bg-green-50 text-green-800',
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
    COMPLETED: 'bg-blue-100 text-blue-800',
  }

  return (
    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}
