import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { LOAN_POLICY } from '@/lib/constants'

async function reviewLoan(formData: FormData) {
  'use server'

  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const loanId = String(formData.get('loanId') || '')
  const action = String(formData.get('action') || '')

  if (!loanId || !['approve', 'reject'].includes(action)) {
    return
  }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      user: {
        select: {
          balance: true,
          loanBalance: true,
        },
      },
    },
  })
  if (!loan) {
    return
  }

  const approved = action === 'approve'
  const eligibility = (loan.user?.balance || 0) * LOAN_POLICY.maxSavingsMultiplier
  const hasOutstandingLoan = (loan.user?.loanBalance || 0) > 0
  const cannotApprove = loan.amount > eligibility || hasOutstandingLoan

  if (approved && cannotApprove) {
    await prisma.loan.update({
      where: { id: loanId },
      data: {
        status: 'REJECTED',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        notes: 'Rejected: member exceeds eligibility limit or has outstanding loan.',
      },
    })
    revalidatePath('/dashboard/loans')
    return
  }

  const interest = loan.amount * ((loan.interestRate || LOAN_POLICY.interestRatePercent) / 100)
  const totalRepayable = loan.amount + interest

  await prisma.loan.update({
    where: { id: loanId },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      approvedBy: session.user.id,
      approvedAt: new Date(),
      totalRepayable,
      monthlyPayment: totalRepayable / loan.duration,
      balance: approved ? totalRepayable : 0,
      notes: approved
        ? `Loan approved for disbursement to ${loan.disbursementBankName || 'member bank'} (${loan.disbursementAccountNumber || 'N/A'}). Repayment to be deducted monthly by Finance Department in tranches.`
        : 'Loan request declined after review.',
    },
  })

  if (approved) {
    await prisma.user.update({
      where: { id: loan.userId },
      data: {
        loanBalance: { increment: totalRepayable },
      },
    })

    await prisma.transaction.create({
      data: {
        userId: loan.userId,
        type: 'LOAN_DISBURSEMENT',
        amount: loan.amount,
        status: 'COMPLETED',
        reference: `TRX-LOAN-${loan.id.slice(-6).toUpperCase()}`,
        description: `Loan approved: ${loan.purpose}`,
      },
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/loans')
  revalidatePath('/dashboard/transactions')
}

export default async function LoansPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const [pendingLoans, recentLoans] = await Promise.all([
    prisma.loan.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            balance: true,
            loanBalance: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
          },
        },
      },
    }),
    prisma.loan.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      orderBy: { approvedAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ])

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Loan Requests</h1>
        <p className="mt-1 text-gray-500">Review and decide pending cooperative facility requests.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Pending Requests" value={pendingLoans.length.toString()} tone="amber" />
        <MetricCard
          label="Pending Exposure"
          value={formatCurrency(pendingLoans.reduce((sum, loan) => sum + loan.amount, 0))}
          tone="blue"
        />
        <MetricCard label="Recently Decided" value={recentLoans.length.toString()} tone="green" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Pending Queue</h2>
        </div>

        {pendingLoans.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">No pending loan requests.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pendingLoans.map((loan) => {
              const maxEligible = loan.user?.balance ? loan.user.balance * LOAN_POLICY.maxSavingsMultiplier : 0
              const hasOutstandingLoan = (loan.user?.loanBalance || 0) > 0
              const canApprove = !hasOutstandingLoan && loan.amount <= maxEligible
              return (
                <div key={loan.id} className="px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{loan.user?.name || 'Unknown Member'}</p>
                      <p className="text-sm text-gray-600">{loan.user?.email}</p>
                      <p className="mt-1 text-sm text-gray-500">Purpose: {loan.purpose}</p>
                      <p className="text-sm text-gray-500">Duration: {loan.duration} months · Rate: {loan.interestRate}%</p>
                      <p className="text-sm text-gray-500">Submitted: {formatDateTime(loan.createdAt)}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Member max eligibility: {formatCurrency(maxEligible)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Disbursement account: {loan.disbursementBankName || loan.user?.bankName || 'N/A'} · {loan.disbursementAccountNumber || loan.user?.bankAccountNumber || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Account name: {loan.disbursementAccountName || loan.user?.bankAccountName || 'N/A'}
                      </p>
                      {hasOutstandingLoan && (
                        <p className="mt-1 text-xs font-semibold text-red-600">
                          Member has outstanding loan. New loan must not be approved.
                        </p>
                      )}
                      <p className="mt-2 text-sm font-medium text-gray-800">
                        Request Amount: <span className="text-gray-900">{formatCurrency(loan.amount)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <form action={reviewLoan}>
                        <input type="hidden" name="loanId" value={loan.id} />
                        <input type="hidden" name="action" value="approve" />
                        <button
                          type="submit"
                          disabled={!canApprove}
                          className="rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          Approve
                        </button>
                      </form>

                      <form action={reviewLoan}>
                        <input type="hidden" name="loanId" value={loan.id} />
                        <input type="hidden" name="action" value="reject" />
                        <button
                          type="submit"
                          className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Decisions</h2>
        </div>

        {recentLoans.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">No reviewed loan requests yet.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentLoans.map((loan) => (
              <div key={loan.id} className="flex flex-col gap-2 px-6 py-4 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{loan.user?.name || 'Unknown Member'}</p>
                  <p className="text-gray-500">{formatCurrency(loan.amount)} · {loan.duration} months</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">{loan.approvedAt ? formatDateTime(loan.approvedAt) : '-'}</span>
                  <StatusBadge status={loan.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'blue' | 'green' }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
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
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}
