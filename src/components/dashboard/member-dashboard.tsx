'use client'

import Link from 'next/link'
import {
  Wallet,
  HandCoins,
  PiggyBank,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { LOAN_POLICY } from '@/lib/constants'

interface MemberDashboardProps {
  user: {
    id: string
    name: string | null
    email: string
    status: string
    balance: number
    specialBalance: number
    totalContributions: number
    loanBalance: number
    monthlyContribution: number | null
  }
  loanEligibility: number
  recentPayments: any[]
  recentLoans: any[]
}

export function MemberDashboard({
  user,
  loanEligibility,
  recentPayments,
  recentLoans,
}: MemberDashboardProps) {
  const isPending = user.status === 'PENDING'

  if (isPending) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-8 text-center shadow-sm animate-fadeIn">
        <Clock className="mx-auto mb-4 h-14 w-14 text-amber-700" />
        <h1 className="text-2xl font-bold text-amber-900">Account Pending Approval</h1>
        <p className="mx-auto mt-2 max-w-lg text-amber-800">
          Your account is awaiting admin approval. You will receive access to all member tools immediately after review.
        </p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-7 animate-fadeIn">
      <div className="pointer-events-none absolute -right-16 top-0 h-44 w-44 rounded-full bg-blue-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-emerald-300/25 blur-3xl" />

      <div className="relative mb-8 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Member Portfolio</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Welcome back, {user.name?.split(' ')[0] || 'Member'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">Track savings, repayments, and loan readiness in one place.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <Sparkles className="h-4 w-4" />
            Financial health: strong
          </div>
        </div>
      </div>

      <div className="relative mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Monthly Savings" value={formatCurrency(user.balance)} icon={PiggyBank} tone="emerald" />
        <StatCard title="Special Savings" value={formatCurrency(user.specialBalance)} icon={Wallet} tone="violet" />
        <StatCard title="Active Loan" value={formatCurrency(user.loanBalance)} icon={HandCoins} tone="amber" />
        <StatCard
          title="Loan Eligibility"
          value={formatCurrency(loanEligibility)}
          icon={TrendingUp}
          tone="blue"
          subtitle="2x Monthly Savings"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickActionCard
          href="/dashboard/pay"
          title="Make Payment"
          description="Contribution or loan repayment"
          icon={Wallet}
        />
        <QuickActionCard
          href="/dashboard/apply-loan"
          title="Apply for Loan"
          description={`Eligible up to ${formatCurrency(loanEligibility)}`}
          icon={HandCoins}
          disabled={loanEligibility < LOAN_POLICY.minAmount || user.loanBalance > 0}
        />
        <QuickActionCard
          href="/dashboard/history"
          title="Transaction History"
          description="Review past activity"
          icon={PiggyBank}
        />
      </div>

      {user.monthlyContribution && (
        <div className="mb-8 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-900">Monthly Plan</h3>
              <p className="mt-1 text-sm text-blue-800">
                Target contribution: <span className="font-semibold">{formatCurrency(user.monthlyContribution)}</span>
              </p>
            </div>
            <Link
              href="/dashboard/pay"
              className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Pay now
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">Recent Payments</h2>
            <Link href="/dashboard/history" className="text-xs font-semibold text-blue-700 hover:text-blue-800">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {recentPayments.length === 0 ? (
              <EmptyState icon={AlertCircle} text="No payments yet" />
            ) : (
              recentPayments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold capitalize text-slate-900">
                      {payment.type.toLowerCase().replace('_', ' ')}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(payment.date || payment.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                    <StatusPill status={payment.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">Loan History</h2>
            <Link href="/dashboard/my-loans" className="text-xs font-semibold text-blue-700 hover:text-blue-800">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {recentLoans.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500">
                <CheckCircle className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                <p className="text-sm">No loans yet</p>
                <Link href="/dashboard/apply-loan" className="mt-2 inline-block text-xs font-semibold text-blue-700 hover:text-blue-800">
                  Apply for your first loan
                </Link>
              </div>
            ) : (
              recentLoans.slice(0, 5).map((loan) => (
                <div key={loan.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold capitalize text-slate-900">{loan.purpose}</p>
                    <p className="text-xs text-slate-500">{loan.duration} months</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(loan.amount)}</p>
                    <StatusPill status={loan.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
  subtitle,
}: {
  title: string
  value: string
  icon: any
  tone: 'emerald' | 'amber' | 'blue' | 'violet'
  subtitle?: string
}) {
  const tones = {
    emerald: 'border-emerald-200/70 bg-emerald-50/70 text-emerald-700',
    amber: 'border-amber-200/70 bg-amber-50/70 text-amber-700',
    blue: 'border-blue-200/70 bg-blue-50/70 text-blue-700',
    violet: 'border-violet-200/70 bg-violet-50/70 text-violet-700',
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="rounded-xl bg-white/85 p-2.5 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function QuickActionCard({
  href,
  title,
  description,
  icon: Icon,
  disabled,
}: {
  href: string
  title: string
  description: string
  icon: any
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-5 opacity-60">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white p-2.5 shadow-sm">
            <Icon className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">Increase savings to unlock</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white/90 px-4 py-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-slate-100 p-2.5">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-700" />
      </div>
    </Link>
  )
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="px-5 py-8 text-center text-slate-500">
      <Icon className="mx-auto mb-2 h-10 w-10 text-slate-300" />
      <p className="text-sm">{text}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const styleMap: Record<string, string> = {
    APPROVED: 'border-emerald-200 bg-emerald-100 text-emerald-900',
    PENDING: 'border-amber-200 bg-amber-100 text-amber-900',
    COMPLETED: 'border-blue-200 bg-blue-100 text-blue-900',
    REJECTED: 'border-rose-200 bg-rose-100 text-rose-900',
    FAILED: 'border-rose-200 bg-rose-100 text-rose-900',
  }

  return (
    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styleMap[status] || 'border-slate-200 bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  )
}
