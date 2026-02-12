import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { generateReference } from '@/lib/utils'

function canUsePartialWithdrawal(status: string, partialWithdrawalUsed: boolean) {
  return status === 'ACTIVE' && !partialWithdrawalUsed
}

async function submitWithdrawalRequest(formData: FormData) {
  'use server'

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'MEMBER') {
    redirect('/dashboard')
  }

  const reason = String(formData.get('reason') || '').trim()
  const requestedAmount = Number(formData.get('requestedAmount') || 0)
  const useProfileBank = String(formData.get('useProfileBank') || 'yes') === 'yes'
  const payoutBankName = String(formData.get('payoutBankName') || '').trim()
  const payoutAccountNumber = String(formData.get('payoutAccountNumber') || '').trim()
  const payoutAccountName = String(formData.get('payoutAccountName') || '').trim()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      status: true,
      balance: true,
      partialWithdrawalUsed: true,
      loanBalance: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountName: true,
    },
  })

  if (!user) return

  if (!canUsePartialWithdrawal(user.status, user.partialWithdrawalUsed)) {
    return
  }

  const existingPartial = await prisma.withdrawal.findFirst({
    where: {
      userId: user.id,
      type: 'PARTIAL',
      status: { in: ['PENDING', 'APPROVED'] },
    },
    select: { id: true },
  })
  if (existingPartial) {
    return
  }

  const maxAllowed = user.balance * 0.7
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > maxAllowed) {
    return
  }

  const resolvedBank = useProfileBank
    ? {
        bankName: user.bankName,
        accountNumber: user.bankAccountNumber,
        accountName: user.bankAccountName,
      }
    : {
        bankName: payoutBankName,
        accountNumber: payoutAccountNumber,
        accountName: payoutAccountName,
      }

  if (
    !resolvedBank.bankName ||
    !resolvedBank.accountNumber ||
    !resolvedBank.accountName ||
    resolvedBank.accountNumber.length < 10
  ) {
    return
  }

  await prisma.withdrawal.create({
    data: {
      userId: user.id,
      type: 'PARTIAL',
      requestedAmount,
      maxAllowedAtRequest: maxAllowed,
      reason: reason || 'Partial withdrawal request from member portal.',
      status: 'PENDING',
      useProfileBank,
      payoutBankName: resolvedBank.bankName,
      payoutAccountNumber: resolvedBank.accountNumber,
      payoutAccountName: resolvedBank.accountName,
    },
  })

  revalidatePath('/dashboard/withdrawals')
}

async function reviewWithdrawalRequest(formData: FormData) {
  'use server'

  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const withdrawalId = String(formData.get('withdrawalId') || '')
  const action = String(formData.get('action') || '')
  if (!withdrawalId || !['approve', 'reject'].includes(action)) {
    return
  }

  const request = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          status: true,
          balance: true,
          partialWithdrawalUsed: true,
          loanBalance: true,
          loans: {
            where: { status: 'APPROVED', balance: { gt: 0 } },
            select: { id: true },
          },
        },
      },
    },
  })

  if (!request || request.status !== 'PENDING') return

  const reviewedBy = session.user.name || session.user.email || 'Admin'
  const shouldApprove = action === 'approve'

  if (!shouldApprove) {
    await prisma.withdrawal.update({
      where: { id: request.id },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
      },
    })

    revalidatePath('/dashboard/withdrawals')
    return
  }

  const outstandingLoans = request.user.loanBalance > 0 || request.user.loans.length > 0

  if (request.type === 'PARTIAL') {
    const priorApprovedPartial = await prisma.withdrawal.findFirst({
      where: {
        userId: request.userId,
        type: 'PARTIAL',
        status: 'APPROVED',
        id: { not: request.id },
      },
      select: { id: true },
    })

    const maxAllowed = request.user.balance * 0.7
    const approvedAmount = Math.min(request.requestedAmount, maxAllowed)
    if (
      !canUsePartialWithdrawal(request.user.status, request.user.partialWithdrawalUsed) ||
      priorApprovedPartial ||
      approvedAmount <= 0
    ) {
      return
    }

    await prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          approvedAmount,
          reviewedBy,
          reviewedAt: new Date(),
          maxAllowedAtRequest: request.maxAllowedAtRequest ?? maxAllowed,
        },
      })

      await tx.user.update({
        where: { id: request.userId },
        data: {
          balance: { decrement: approvedAmount },
          partialWithdrawalUsed: true,
        },
      })

      await tx.transaction.create({
        data: {
          userId: request.userId,
          type: 'WITHDRAWAL',
          amount: approvedAmount,
          status: 'COMPLETED',
          reference: generateReference(),
          description: `Approved partial savings withdrawal (${formatCurrency(approvedAmount)}) to ${request.payoutBankName || 'member payout bank'}.`,
        },
      })
    })
  } else {
    if (outstandingLoans) {
      await prisma.withdrawal.update({
        where: { id: request.id },
        data: {
          status: 'REJECTED',
          reviewedBy,
          reviewedAt: new Date(),
          reason: `${request.reason || 'Full discontinuation request'} (Rejected: outstanding loan balance detected.)`,
        },
      })
      revalidatePath('/dashboard/withdrawals')
      return
    }

    const closureDate = new Date()
    closureDate.setMonth(closureDate.getMonth() + 3)

    await prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          approvedAmount: request.user.balance,
          reviewedBy,
          reviewedAt: closureDate,
          closureDate,
        },
      })

      await tx.user.update({
        where: { id: request.userId },
        data: {
          status: 'CLOSED',
          closureDate,
          voucherEnabled: false,
        },
      })

      const firstDayOfNextMonth = new Date(closureDate.getFullYear(), closureDate.getMonth() + 1, 1)
      await tx.voucher.updateMany({
        where: {
          userId: request.userId,
          status: { in: ['GENERATED', 'SENT'] },
          effectiveStartDate: { gte: firstDayOfNextMonth },
        },
        data: {
          status: 'REMOVED',
          notes: 'Removed from next monthly voucher report after account closure.',
        },
      })

      await tx.transaction.create({
        data: {
          userId: request.userId,
          type: 'WITHDRAWAL',
          amount: request.user.balance,
          status: 'PENDING',
          reference: generateReference(),
          description: `Full membership discontinuation approved. Settlement scheduled within 3 months to ${request.payoutBankName || 'member payout bank'}.`,
        },
      })
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/withdrawals')
  revalidatePath('/dashboard/transactions')
}

export default async function WithdrawalsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.user.id) {
    redirect('/login')
  }

  if (session.user.role === 'ADMIN') {
    const [pendingRequests, recentRequests] = await Promise.all([
      prisma.withdrawal.findMany({
        where: { status: 'PENDING' },
        orderBy: { requestedAt: 'asc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              staffId: true,
              department: true,
              balance: true,
              loanBalance: true,
              bankName: true,
              bankAccountNumber: true,
              bankAccountName: true,
            },
          },
        },
      }),
      prisma.withdrawal.findMany({
        where: { status: { in: ['APPROVED', 'REJECTED'] } },
        orderBy: { reviewedAt: 'desc' },
        take: 10,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ])

    return (
      <div className="animate-fadeIn space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Withdrawal Requests</h1>
          <p className="mt-1 text-gray-500">
            Review partial withdrawals and full membership discontinuation requests.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard label="Pending Requests" value={pendingRequests.length.toString()} tone="amber" />
          <MetricCard
            label="Pending Value"
            value={formatCurrency(pendingRequests.reduce((sum, row) => sum + row.requestedAmount, 0))}
            tone="blue"
          />
          <MetricCard label="Recently Reviewed" value={recentRequests.length.toString()} tone="green" />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Pending Review Queue</h2>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500">No withdrawal requests pending review.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingRequests.map((request) => {
                const hasOutstandingLoan = (request.user?.loanBalance || 0) > 0
                return (
                  <div key={request.id} className="px-6 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{request.user?.name || 'Unknown Member'}</p>
                        <p className="text-sm text-gray-600">
                          {request.user?.email} · Staff ID: {request.user?.staffId || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Department: {request.user?.department || 'N/A'} · Current savings:{' '}
                          {formatCurrency(request.user?.balance || 0)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Request type: {request.type === 'PARTIAL' ? 'Partial Withdrawal' : 'Full Discontinuation'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Requested amount: {formatCurrency(request.requestedAmount)}
                          {request.maxAllowedAtRequest
                            ? ` (Max allowed at request: ${formatCurrency(request.maxAllowedAtRequest)})`
                            : ''}
                        </p>
                        <p className="text-sm text-gray-500">Requested: {formatDateTime(request.requestedAt)}</p>
                        <p className="text-sm text-gray-500">
                          Payout account: {request.payoutBankName || request.user?.bankName || 'N/A'} / {request.payoutAccountNumber || request.user?.bankAccountNumber || 'N/A'} / {request.payoutAccountName || request.user?.bankAccountName || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Outstanding loan balance: {formatCurrency(request.user?.loanBalance || 0)}
                        </p>
                        {hasOutstandingLoan && request.type === 'FULL_DISCONTINUATION' && (
                          <p className="text-xs font-semibold text-red-600">
                            Full discontinuation cannot be approved until loan balance is zero.
                          </p>
                        )}
                        {request.reason && <p className="mt-1 text-sm text-gray-500">Reason: {request.reason}</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        <form action={reviewWithdrawalRequest}>
                          <input type="hidden" name="withdrawalId" value={request.id} />
                          <input type="hidden" name="action" value="approve" />
                          <button
                            type="submit"
                            className="rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                          >
                            Approve
                          </button>
                        </form>

                        <form action={reviewWithdrawalRequest}>
                          <input type="hidden" name="withdrawalId" value={request.id} />
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
          {recentRequests.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500">No reviewed requests yet.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentRequests.map((request) => (
                <div key={request.id} className="flex flex-col gap-2 px-6 py-4 text-sm md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{request.user?.name || 'Unknown Member'}</p>
                    <p className="text-gray-500">
                      {request.type === 'PARTIAL' ? 'Partial Withdrawal' : 'Full Discontinuation'} ·{' '}
                      {formatCurrency(request.approvedAmount ?? request.requestedAmount)}
                    </p>
                    <p className="text-gray-500">Reviewed by: {request.reviewedBy || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">
                      {request.reviewedAt ? formatDateTime(request.reviewedAt) : '-'}
                    </span>
                    <StatusBadge status={request.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const member = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      status: true,
      balance: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountName: true,
      partialWithdrawalUsed: true,
      loanBalance: true,
      withdrawals: {
        orderBy: { requestedAt: 'desc' },
        take: 12,
      },
    },
  })

  if (!member) redirect('/login')

  const maxPartialAmount = member.balance * 0.7
  const partialAllowed = canUsePartialWithdrawal(member.status, member.partialWithdrawalUsed)

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Withdraw Funds</h1>
        <p className="mt-1 text-gray-500">
          Request a withdrawal from your savings account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MetricCard label="Current Savings" value={formatCurrency(member.balance)} tone="blue" />
        <MetricCard label="Available to Withdraw" value={formatCurrency(maxPartialAmount)} tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Request Withdrawal</h2>
          
          {member.loanBalance > 0 && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Outstanding loan detected ({formatCurrency(member.loanBalance)}). Please note withdrawal limits apply.
            </p>
          )}

          <form action={submitWithdrawalRequest} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Amount</label>
              <input
                name="requestedAmount"
                type="number"
                min={1}
                max={Math.floor(maxPartialAmount)}
                step={1}
                placeholder="Enter amount"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Limit: {formatCurrency(maxPartialAmount)}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Payout Account</label>
              <select
                name="useProfileBank"
                defaultValue="yes"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              >
                <option value="yes">Use Saved Bank Account</option>
                <option value="no">Use Different Account</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {member.bankName || 'No bank saved'} • {member.bankAccountNumber ? `****${member.bankAccountNumber.slice(-4)}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                name="payoutBankName"
                type="text"
                placeholder="Bank Name"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
              <input
                name="payoutAccountNumber"
                type="text"
                placeholder="Account No"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
              <input
                name="payoutAccountName"
                type="text"
                placeholder="Account Name"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reason (Optional)</label>
              <textarea
                name="reason"
                rows={2}
                placeholder="Brief reason for withdrawal"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Submit Request
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">History</h2>
          </div>
          {member.withdrawals.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">No requests found.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {member.withdrawals.map((request) => (
                <div key={request.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Withdrawal Request
                      </p>
                      <p className="text-xs text-gray-500">{formatDateTime(request.requestedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(request.approvedAmount ?? request.requestedAmount)}
                      </p>
                      <StatusBadge status={request.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
