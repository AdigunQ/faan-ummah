import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'

export default async function DirectoryPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const members = await prisma.user.findMany({
    where: { role: 'MEMBER', status: { not: 'PENDING' } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      staffId: true,
      email: true,
      status: true,
      monthlyContribution: true,
      specialContribution: true,
      balance: true,
      specialBalance: true,
    },
  })

  const activeCount = members.filter((member) => member.status === 'ACTIVE').length
  const otherCount = Math.max(0, members.length - activeCount)

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Update Member</h1>
        <p className="mt-1 text-gray-500">Click a member to update their savings, special savings, or loan records.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Approved Members" value={members.length.toString()} tone="blue" />
        <MetricCard label="Active Members" value={activeCount.toString()} tone="green" />
        <MetricCard label="Other Status" value={otherCount.toString()} tone="amber" />
        <MetricCard
          label="Total Savings"
          value={formatCurrency(members.reduce((sum, member) => sum + member.balance + (member.specialBalance || 0), 0))}
          tone="purple"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px]">
          <thead className="bg-gray-50">
            <tr>
              <HeadCell label="Member" />
              <HeadCell label="Staff ID" />
              <HeadCell label="Monthly Savings" />
              <HeadCell label="Special Savings" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/directory/${member.id}`}
                    className="font-semibold text-gray-900 underline-offset-2 hover:underline"
                  >
                    {member.name || 'Unnamed Member'}
                  </Link>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">{member.staffId || 'N/A'}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {formatCurrency(member.monthlyContribution || 0)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {formatCurrency(member.specialContribution || 0)}
                </td>
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
