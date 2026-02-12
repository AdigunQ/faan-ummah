import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { firstVoucherPeriodForCreatedAt } from '@/lib/vouchers'
import { Activity, BadgeCheck, Banknote, CreditCard, Users } from 'lucide-react'

type TrendRow = {
  period: string
  label: string
  registrations: number
  voucherFees: number
  voucherSavingsBasis: number
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function formatPeriod(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function periodLabel(date: Date): string {
  return date.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' })
}

function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0)
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  const now = new Date()
  const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - (5 - index), 1))

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const upcomingVoucherPeriod = formatPeriod(nextMonth)

  const [memberStats, memberStatusCounts, pendingQueue, outstandingLoanAgg, upcomingVoucherMembers] =
    await Promise.all([
      prisma.user.aggregate({
        where: { role: 'MEMBER', status: 'ACTIVE' },
        _count: { _all: true },
        _sum: { balance: true, totalContributions: true, loanBalance: true },
      }),
      prisma.user.groupBy({
        by: ['status'],
        where: { role: 'MEMBER' },
        _count: { _all: true },
      }),
      Promise.all([
        prisma.user.count({ where: { role: 'MEMBER', status: 'PENDING' } }),
        prisma.payment.count({ where: { status: 'PENDING' } }),
        prisma.loan.count({ where: { status: 'PENDING' } }),
        prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      ]),
      prisma.loan.aggregate({
        where: { status: 'APPROVED', balance: { gt: 0 } },
        _count: { _all: true },
        _sum: { balance: true },
      }),
      prisma.user.findMany({
        where: {
          role: 'MEMBER',
          status: 'ACTIVE',
          voucherEnabled: true,
          monthlyContribution: { gt: 0 },
        },
        select: { createdAt: true, monthlyContribution: true },
      }),
    ])

  const totalMembers = memberStats._count._all || 0
  const totalSavingsPool = memberStats._sum.balance || 0
  const lifetimeContributions = memberStats._sum.totalContributions || 0
  const totalLoanBalanceMirror = memberStats._sum.loanBalance || 0
  const outstandingLoansCount = outstandingLoanAgg._count._all || 0
  const outstandingLoanBalance = outstandingLoanAgg._sum.balance || 0

  const statusCountMap = new Map(memberStatusCounts.map((row) => [row.status, row._count._all]))
  const activeMembers = statusCountMap.get('ACTIVE') || 0
  const pendingMembers = statusCountMap.get('PENDING') || 0
  const closedMembers = statusCountMap.get('CLOSED') || 0

  const [pendingMembersQueue, pendingPayments, pendingLoans, pendingWithdrawals] = pendingQueue

  const trends = await Promise.all(
    months.map(async (startDate): Promise<TrendRow> => {
      const start = monthStart(startDate)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
      const period = formatPeriod(start)

      const [registrations, eligibleMembers] = await Promise.all([
        prisma.user.count({
          where: {
            role: 'MEMBER',
            createdAt: { gte: start, lt: end },
          },
        }),
        prisma.user.findMany({
          where: {
            role: 'MEMBER',
            status: 'ACTIVE',
            voucherEnabled: true,
            monthlyContribution: { gt: 0 },
            createdAt: { lt: end },
          },
          select: { createdAt: true, monthlyContribution: true },
        }),
      ])

      const included = eligibleMembers.filter((member) => firstVoucherPeriodForCreatedAt(member.createdAt) <= period)
      const newCount = included.filter((member) => firstVoucherPeriodForCreatedAt(member.createdAt) === period).length
      const oldCount = Math.max(0, included.length - newCount)

      const voucherFees = newCount * 1000 + oldCount * 100
      const voucherSavingsBasis = included.reduce((acc, member) => acc + (member.monthlyContribution || 0), 0)

      return {
        period,
        label: periodLabel(start),
        registrations,
        voucherFees,
        voucherSavingsBasis,
      }
    })
  )

  const sixMonthRegistrations = sum(trends.map((row) => row.registrations))
  const sixMonthFees = sum(trends.map((row) => row.voucherFees))
  const sixMonthSavingsBasis = sum(trends.map((row) => row.voucherSavingsBasis))

  const regMax = Math.max(1, ...trends.map((row) => row.registrations))
  const feeMax = Math.max(1, ...trends.map((row) => row.voucherFees))
  const savingsMax = Math.max(1, ...trends.map((row) => row.voucherSavingsBasis))

  const upcomingIncluded = upcomingVoucherMembers.filter((member) =>
    firstVoucherPeriodForCreatedAt(member.createdAt) <= upcomingVoucherPeriod
  )
  const upcomingNewCount = upcomingIncluded.filter(
    (member) => firstVoucherPeriodForCreatedAt(member.createdAt) === upcomingVoucherPeriod
  ).length
  const upcomingOldCount = Math.max(0, upcomingIncluded.length - upcomingNewCount)
  const upcomingFees = upcomingNewCount * 1000 + upcomingOldCount * 100
  const upcomingSavingsBasis = upcomingIncluded.reduce((acc, member) => acc + (member.monthlyContribution || 0), 0)
  const upcomingThriftTotal = upcomingSavingsBasis + upcomingFees

  return (
    <div className="animate-fadeIn space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Admin Analytics</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Cooperative Command Center</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">
              High-signal numbers only: members, savings pool, loan book, and voucher revenue. Updated from live database.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeaderKpi label="Approved members" value={totalMembers.toLocaleString('en-NG')} icon={<Users className="h-4 w-4" />} />
            <HeaderKpi label="Savings Pool" value={formatCurrency(totalSavingsPool)} icon={<Banknote className="h-4 w-4" />} />
            <HeaderKpi label="Outstanding Loans" value={formatCurrency(outstandingLoanBalance)} icon={<CreditCard className="h-4 w-4" />} />
            <HeaderKpi label="Fees (6M)" value={formatCurrency(sixMonthFees)} icon={<BadgeCheck className="h-4 w-4" />} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <SignalPill label="Active members" value={activeMembers.toLocaleString('en-NG')} />
          <SignalPill label="Pending approvals" value={pendingMembers.toLocaleString('en-NG')} />
          <SignalPill label="Closed accounts" value={closedMembers.toLocaleString('en-NG')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <KpiCard
          title="Savings Performance"
          subtitle="Lifetime member savings and contributions."
          icon={<Banknote className="h-5 w-5" />}
          metrics={[
            { label: 'Savings pool (current balances)', value: formatCurrency(totalSavingsPool) },
            { label: 'Lifetime contributions posted', value: formatCurrency(lifetimeContributions) },
          ]}
        />
        <KpiCard
          title="Loan Book"
          subtitle="Outstanding balance across approved loans."
          icon={<CreditCard className="h-5 w-5" />}
          metrics={[
            { label: 'Active loans (approved with balance)', value: outstandingLoansCount.toLocaleString('en-NG') },
            { label: 'Outstanding balance', value: formatCurrency(outstandingLoanBalance) },
            { label: 'User mirror (loanBalance sum)', value: formatCurrency(totalLoanBalanceMirror) },
          ]}
        />
        <KpiCard
          title="Operational Queue"
          subtitle="Pending actions waiting for admin."
          icon={<Activity className="h-5 w-5" />}
          metrics={[
            { label: 'Members awaiting approval', value: pendingMembersQueue.toLocaleString('en-NG') },
            { label: 'Payments awaiting verification', value: pendingPayments.toLocaleString('en-NG') },
            { label: 'Loan requests awaiting approval', value: pendingLoans.toLocaleString('en-NG') },
            { label: 'Withdrawal requests awaiting review', value: pendingWithdrawals.toLocaleString('en-NG') },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Voucher Snapshot</h2>
              <p className="mt-1 text-sm text-slate-500">
                Period: <span className="font-medium text-slate-700">{upcomingVoucherPeriod}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Thrift Total</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(upcomingThriftTotal)}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SoftMetric label="Members" value={upcomingIncluded.length.toLocaleString('en-NG')} />
            <SoftMetric label="New / Old" value={`${upcomingNewCount} / ${upcomingOldCount}`} />
            <SoftMetric label="Fees" value={formatCurrency(upcomingFees)} />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Savings basis</span>
              <span className="font-semibold text-slate-900">{formatCurrency(upcomingSavingsBasis)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Membership fees</span>
              <span className="font-semibold text-slate-900">{formatCurrency(upcomingFees)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">6-Month Pulse</h2>
          <p className="mt-1 text-sm text-slate-500">Registrations, voucher fees, and deduction basis (savings).</p>

          <div className="mt-5 grid grid-cols-1 gap-4">
            <TrendBars
              title="Member registrations"
              subtitle={`${sixMonthRegistrations.toLocaleString('en-NG')} in the last 6 months`}
              rows={trends.map((row) => ({ label: row.label, value: row.registrations }))}
              max={regMax}
              tone="blue"
              valueFormatter={(v) => `${v}`}
            />
            <TrendBars
              title="Voucher fees"
              subtitle={`${formatCurrency(sixMonthFees)} total`}
              rows={trends.map((row) => ({ label: row.label, value: row.voucherFees }))}
              max={feeMax}
              tone="emerald"
              valueFormatter={(v) => formatCurrency(v)}
            />
            <TrendBars
              title="Savings deduction basis"
              subtitle={`${formatCurrency(sixMonthSavingsBasis)} total`}
              rows={trends.map((row) => ({ label: row.label, value: row.voucherSavingsBasis }))}
              max={savingsMax}
              tone="amber"
              valueFormatter={(v) => formatCurrency(v)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Trend Detail (Last 6 Months)</h2>
          <p className="mt-1 text-sm text-slate-500">Useful when reconciling expected voucher deductions with payroll outcomes.</p>
        </div>

        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3">Month</th>
              <th className="px-6 py-3">Registrations</th>
              <th className="px-6 py-3">Voucher Fees</th>
              <th className="px-6 py-3">Savings Basis</th>
              <th className="px-6 py-3">Voucher Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {trends.map((row) => (
              <tr key={row.period} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-900">{row.label}</td>
                <td className="px-6 py-3 text-slate-700">{row.registrations.toLocaleString('en-NG')}</td>
                <td className="px-6 py-3 text-slate-900">{formatCurrency(row.voucherFees)}</td>
                <td className="px-6 py-3 text-slate-900">{formatCurrency(row.voucherSavingsBasis)}</td>
                <td className="px-6 py-3 font-semibold text-slate-900">
                  {formatCurrency(row.voucherFees + row.voucherSavingsBasis)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HeaderKpi({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-200">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div className="mt-2 text-lg font-bold tracking-tight text-white">{value}</div>
    </div>
  )
}

function SignalPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
      <span className="font-medium text-slate-200">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  )
}

function KpiCard({
  title,
  subtitle,
  icon,
  metrics,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  metrics: { label: string; value: string }[]
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
          {icon}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-baseline justify-between gap-4">
            <div className="text-sm text-slate-500">{metric.label}</div>
            <div className="text-sm font-semibold text-slate-900">{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SoftMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  )
}

function TrendBars({
  title,
  subtitle,
  rows,
  max,
  tone,
  valueFormatter,
}: {
  title: string
  subtitle: string
  rows: { label: string; value: number }[]
  max: number
  tone: 'amber' | 'blue' | 'emerald'
  valueFormatter: (value: number) => string
}) {
  const toneStyles = {
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        {rows.map((row) => {
          const width = `${Math.max(6, (row.value / max) * 100)}%`
          return (
            <div key={`${title}-${row.label}`}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-600">{row.label}</span>
                <span className="text-slate-600">{valueFormatter(row.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200/70">
                <div className={`h-2 rounded-full ${toneStyles[tone]}`} style={{ width }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
