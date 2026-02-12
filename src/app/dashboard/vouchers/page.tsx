import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { COOPERATIVE_BANK_DETAILS } from '@/lib/constants'

async function markVoucherSent(formData: FormData) {
  'use server'

  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const voucherId = String(formData.get('voucherId') || '')
  if (!voucherId) return

  await prisma.voucher.update({
    where: { id: voucherId },
    data: {
      status: 'SENT',
      sentAt: new Date(),
      notes: 'Sent to Finance inbox for monthly salary deduction processing.',
    },
  })

  revalidatePath('/dashboard/vouchers')
}

export default async function VouchersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const [generatedVouchers, recentFinanceLog] = await Promise.all([
    prisma.voucher.findMany({
      where: { status: 'GENERATED' },
      orderBy: [{ effectiveStartDate: 'asc' }, { generatedAt: 'asc' }],
      include: {
        user: {
          select: {
            status: true,
            voucherEnabled: true,
          },
        },
      },
    }),
    prisma.voucher.findMany({
      where: { status: { in: ['SENT', 'REMOVED'] } },
      orderBy: { generatedAt: 'desc' },
      take: 12,
    }),
  ])

  const queuedVouchers = generatedVouchers.filter(
    (voucher) => voucher.user?.status !== 'CLOSED' && voucher.user?.voucherEnabled !== false
  )

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Finance Voucher Inbox</h1>
        <p className="mt-1 text-gray-500">
          Generated salary-deduction vouchers from member registration and monthly setup.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Cooperative account: {COOPERATIVE_BANK_DETAILS.accountName} ({COOPERATIVE_BANK_DETAILS.accountNumber})
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Queued Vouchers" value={queuedVouchers.length.toString()} tone="blue" />
        <MetricCard
          label="Deduction Total"
          value={formatCurrency(queuedVouchers.reduce((sum, voucher) => sum + voucher.monthlyDeduction, 0))}
          tone="green"
        />
        <MetricCard label="Recent Finance Updates" value={recentFinanceLog.length.toString()} tone="amber" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Pending Voucher Dispatch</h2>
        </div>

        {queuedVouchers.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">No queued vouchers to send.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {queuedVouchers.map((voucher) => (
              <div key={voucher.id} className="px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{voucher.fullName}</p>
                    <p className="text-sm text-gray-600">
                      Staff ID: {voucher.staffId} · Department: {voucher.department}
                    </p>
                    <p className="text-sm text-gray-500">
                      Monthly deduction: {formatCurrency(voucher.monthlyDeduction)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Effective start date: {formatDate(voucher.effectiveStartDate)}
                    </p>
                    <p className="text-xs text-gray-400">Generated: {formatDateTime(voucher.generatedAt)}</p>
                  </div>

                  <form action={markVoucherSent}>
                    <input type="hidden" name="voucherId" value={voucher.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
                    >
                      Send to Finance
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Finance Activity Log</h2>
        </div>

        {recentFinanceLog.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">No voucher updates yet.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentFinanceLog.map((voucher) => (
              <div key={voucher.id} className="flex flex-col gap-2 px-6 py-4 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{voucher.fullName}</p>
                  <p className="text-gray-500">
                    {voucher.staffId} · {formatCurrency(voucher.monthlyDeduction)} · Effective {formatDate(voucher.effectiveStartDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={voucher.status} />
                  <span className="text-gray-500">
                    {voucher.sentAt ? formatDateTime(voucher.sentAt) : formatDateTime(voucher.generatedAt)}
                  </span>
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

function StatusBadge({ status }: { status: 'GENERATED' | 'SENT' | 'REMOVED' }) {
  const styles = {
    GENERATED: 'bg-blue-100 text-blue-800',
    SENT: 'bg-green-100 text-green-800',
    REMOVED: 'bg-slate-100 text-slate-700',
  }

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  )
}
