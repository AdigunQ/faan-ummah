'use client'

import Link from 'next/link'
import {
  Wallet,
  HandCoins,
  PiggyBank,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency, getLoanEligibility, formatDate } from '@/lib/utils'

interface MemberDashboardProps {
  user: {
    id: string
    name: string | null
    email: string
    status: string
    balance: number
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
      <div className="animate-fadeIn">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-yellow-800 mb-2">Account Pending Approval</h1>
          <p className="text-yellow-700 max-w-md mx-auto">
            Your account is awaiting admin approval. You'll be notified once your application 
            has been reviewed. Thank you for your patience.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name?.split(' ')[0]}</h1>
        <p className="text-gray-500 mt-1">Here's your account overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Savings"
          value={formatCurrency(user.balance)}
          icon={Wallet}
          color="green"
        />
        <StatCard
          title="Active Loan"
          value={formatCurrency(user.loanBalance)}
          icon={HandCoins}
          color="orange"
        />
        <StatCard
          title="Total Contributions"
          value={formatCurrency(user.totalContributions)}
          icon={PiggyBank}
          color="blue"
        />
        <StatCard
          title="Loan Eligibility"
          value={formatCurrency(loanEligibility)}
          icon={TrendingUp}
          color="purple"
          subtitle="Up to 3x your savings"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <QuickActionCard
          href="/dashboard/pay"
          title="Make Payment"
          description="Contribute or repay loan"
          icon={Wallet}
          color="green"
        />
        <QuickActionCard
          href="/dashboard/apply-loan"
          title="Apply for Loan"
          description={`Eligible up to ${formatCurrency(loanEligibility)}`}
          icon={HandCoins}
          color="blue"
          disabled={loanEligibility < 10000}
        />
        <QuickActionCard
          href="/dashboard/history"
          title="View History"
          description="Transaction & loan records"
          icon={PiggyBank}
          color="purple"
        />
      </div>

      {/* Monthly Contribution Info */}
      {user.monthlyContribution && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary-800">Monthly Contribution</h3>
              <p className="text-primary-600">
                Your committed monthly contribution is{' '}
                <span className="font-bold">{formatCurrency(user.monthlyContribution)}</span>
              </p>
            </div>
            <Link
              href="/dashboard/pay"
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Pay Now
            </Link>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
            <Link
              href="/dashboard/history"
              className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentPayments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No payments yet</p>
              </div>
            ) : (
              recentPayments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {payment.type.toLowerCase().replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-500">{formatDate(payment.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      payment.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {payment.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Loans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Loan History</h2>
            <Link
              href="/dashboard/my-loans"
              className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentLoans.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No loans yet</p>
                <Link
                  href="/dashboard/apply-loan"
                  className="text-primary-500 hover:underline text-sm mt-2 inline-block"
                >
                  Apply for your first loan
                </Link>
              </div>
            ) : (
              recentLoans.slice(0, 5).map((loan) => (
                <div key={loan.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {loan.purpose}
                    </p>
                    <p className="text-sm text-gray-500">{loan.duration} months</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(loan.amount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      loan.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      loan.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      loan.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {loan.status.toLowerCase()}
                    </span>
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
  color,
  subtitle,
}: {
  title: string
  value: string
  icon: any
  color: 'blue' | 'green' | 'purple' | 'orange'
  subtitle?: string
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
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
  color,
  disabled,
}: {
  href: string
  title: string
  description: string
  icon: any
  color: 'green' | 'blue' | 'purple'
  disabled?: boolean
}) {
  const colors = {
    green: 'hover:border-green-500 hover:bg-green-50',
    blue: 'hover:border-blue-500 hover:bg-blue-50',
    purple: 'hover:border-purple-500 hover:bg-purple-50',
  }

  const iconColors = {
    green: 'text-green-600 bg-green-100',
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
  }

  if (disabled) {
    return (
      <div className="bg-gray-100 border-2 border-gray-200 rounded-xl p-6 opacity-50 cursor-not-allowed">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${iconColors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">Save more to unlock</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={`block bg-white border-2 border-gray-200 rounded-xl p-6 transition-all ${colors[color]} group`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${iconColors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </Link>
  )
}
