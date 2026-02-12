import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function DirectoryPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const members = await prisma.user.findMany({
    where: { role: 'MEMBER' },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      staffId: true,
      email: true,
      phone: true,
      department: true,
      bankName: true,
      bankAccountNumber: true,
      status: true,
      monthlyContribution: true,
      balance: true,
      totalContributions: true,
      loanBalance: true,
      createdAt: true,
      _count: {
        select: {
          payments: true,
          loans: true,
        },
      },
    },
  })

  const activeCount = members.filter((member) => member.status === 'ACTIVE').length
  const pendingCount = members.filter((member) => member.status === 'PENDING').length

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Member Directory</h1>
        <p className="mt-1 text-gray-500">Complete member profiles, balances, and contribution activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Total Members" value={members.length.toString()} tone="blue" />
        <MetricCard label="Active Members" value={activeCount.toString()} tone="green" />
        <MetricCard label="Pending Members" value={pendingCount.toString()} tone="amber" />
        <MetricCard
          label="Total Savings"
          value={formatCurrency(members.reduce((sum, member) => sum + member.balance, 0))}
          tone="purple"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px]">
          <thead className="bg-gray-50">
            <tr>
              <HeadCell label="Member" />
              <HeadCell label="Staff ID" />
              <HeadCell label="Department" />
              <HeadCell label="Contact" />
              <HeadCell label="Bank Details" />
              <HeadCell label="Status" />
              <HeadCell label="Monthly Contribution" />
              <HeadCell label="Savings" />
              <HeadCell label="Loan Balance" />
              <HeadCell label="Activity" />
              <HeadCell label="Joined" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-900">{member.name || 'Unnamed Member'}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">{member.staffId || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{member.department || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{member.phone || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {member.bankName || 'N/A'} · {member.bankAccountNumber || 'N/A'}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={member.status} />
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {formatCurrency(member.monthlyContribution || 0)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">{formatCurrency(member.balance)}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {formatCurrency(member.loanBalance)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {member._count.payments} payments · {member._count.loans} loans
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(member.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'blue' | 'green' | 'amber' | 'purple'
}) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-green-200 bg-green-50 text-green-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    purple: 'border-purple-200 bg-purple-50 text-purple-800',
  }

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

function HeadCell({ label }: { label: string }) {
  return <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</th>
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    ACTIVE: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    REJECTED: 'bg-red-100 text-red-800',
    SUSPENDED: 'bg-gray-200 text-gray-800',
  }

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}
