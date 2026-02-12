import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { firstVoucherPeriodForCreatedAt } from '@/lib/vouchers'

type AnalyticsRow = {
  month: string
  registrations: number
  feeAmount: number
  savingsAmount: number
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  const now = new Date()
  const months = Array.from({ length: 6 }, (_, index) => {
    const offset = 5 - index
    return new Date(now.getFullYear(), now.getMonth() - offset, 1)
  })

  const analytics = await Promise.all(
    months.map(async (startDate): Promise<AnalyticsRow> => {
      const start = monthStart(startDate)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
      const period = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`

      const [registrations, activeMembers] = await Promise.all([
        prisma.user.count({
          where: {
            role: 'MEMBER',
            createdAt: { gte: start, lt: end },
          },
        }),
        prisma.user.findMany({
          where: {
            role: 'MEMBER',
            status: { in: ['ACTIVE', 'PENDING'] },
            voucherEnabled: true,
            monthlyContribution: { gt: 0 },
            createdAt: { lt: end },
          },
          select: { createdAt: true, monthlyContribution: true },
        }),
      ])

      const includedThisMonth = activeMembers.filter(
        (member) => firstVoucherPeriodForCreatedAt(member.createdAt) <= period
      )
      const newMembers = includedThisMonth.filter(
        (member) => firstVoucherPeriodForCreatedAt(member.createdAt) === period
      ).length
      const oldMembers = Math.max(0, includedThisMonth.length - newMembers)
      const feeAmount = newMembers * 1000 + oldMembers * 100
      const savingsAmount = includedThisMonth.reduce((sum, member) => sum + (member.monthlyContribution || 0), 0)

      return {
        month: start.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }),
        registrations,
        feeAmount,
        savingsAmount,
      }
    })
  )

  const totalRegistrations = analytics.reduce((sum, row) => sum + row.registrations, 0)
  const totalFees = analytics.reduce((sum, row) => sum + row.feeAmount, 0)
  const totalSavings = analytics.reduce((sum, row) => sum + row.savingsAmount, 0)

  const maxReg = Math.max(1, ...analytics.map((row) => row.registrations))
  const maxFee = Math.max(1, ...analytics.map((row) => row.feeAmount))

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-1 text-gray-500">Member registration trend and monthly membership fee tracking.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="6-Month Registrations" value={String(totalRegistrations)} tone="blue" />
        <MetricCard label="6-Month Fee Tracking" value={formatCurrency(totalFees)} tone="green" />
        <MetricCard label="6-Month Savings Basis" value={formatCurrency(totalSavings)} tone="amber" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Member Registration Graph (Last 6 Months)</h2>
        <div className="mt-6 grid grid-cols-1 gap-3">
          {analytics.map((row) => {
            const width = `${Math.max(8, (row.registrations / maxReg) * 100)}%`
            return (
              <div key={`reg-${row.month}`}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{row.month}</span>
                  <span className="text-gray-500">{row.registrations} registrations</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100">
                  <div className="h-3 rounded-full bg-blue-500" style={{ width }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Fee Tracking Amount (Last 6 Months)</h2>
        <div className="mt-6 grid grid-cols-1 gap-3">
          {analytics.map((row) => {
            const width = `${Math.max(8, (row.feeAmount / maxFee) * 100)}%`
            return (
              <div key={`fee-${row.month}`}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{row.month}</span>
                  <span className="text-gray-500">{formatCurrency(row.feeAmount)}</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100">
                  <div className="h-3 rounded-full bg-emerald-500" style={{ width }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Month</th>
              <th className="px-6 py-3">Registrations</th>
              <th className="px-6 py-3">Fee Amount</th>
              <th className="px-6 py-3">Savings Basis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {analytics.map((row) => (
              <tr key={row.month}>
                <td className="px-6 py-3 font-medium text-gray-900">{row.month}</td>
                <td className="px-6 py-3 text-gray-700">{row.registrations}</td>
                <td className="px-6 py-3 text-gray-800">{formatCurrency(row.feeAmount)}</td>
                <td className="px-6 py-3 text-gray-800">{formatCurrency(row.savingsAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
