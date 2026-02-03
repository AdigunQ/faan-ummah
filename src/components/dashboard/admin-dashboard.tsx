'use client'

import Link from 'next/link'
import {
  Users,
  DollarSign,
  HandCoins,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface AdminDashboardProps {
  stats: {
    totalMembers: number
    totalSavings: number
    activeLoans: number
    pendingApprovals: number
    pendingMembers: number
    pendingPayments: number
    pendingLoans: number
  }
  recentTransactions: any[]
}

export function AdminDashboard({ stats, recentTransactions }: AdminDashboardProps) {
  return (
    <div className="animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of cooperative activities</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Members"
          value={stats.totalMembers.toString()}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Savings"
          value={formatCurrency(stats.totalSavings)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Active Loans"
          value={stats.activeLoans.toString()}
          icon={HandCoins}
          color="purple"
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals.toString()}
          icon={AlertTriangle}
          color="orange"
          alert={stats.pendingApprovals > 0}
        />
      </div>

      {/* Quick Actions */}
      {stats.pendingApprovals > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Actions Required
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.pendingMembers > 0 && (
              <Link
                href="/dashboard/members"
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingMembers}</p>
                  <p className="text-gray-600">Member Approvals</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </Link>
            )}
            {stats.pendingPayments > 0 && (
              <Link
                href="/dashboard/payments"
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
                  <p className="text-gray-600">Payment Verifications</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </Link>
            )}
            {stats.pendingLoans > 0 && (
              <Link
                href="/dashboard/loans"
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingLoans}</p>
                  <p className="text-gray-600">Loan Requests</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.user?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                    {transaction.type.toLowerCase().replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={transaction.status} />
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No recent transactions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
  alert,
}: {
  title: string
  value: string
  icon: any
  color: 'blue' | 'green' | 'purple' | 'orange'
  alert?: boolean
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
        </div>
        {alert && (
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
      {status.toLowerCase()}
    </span>
  )
}
