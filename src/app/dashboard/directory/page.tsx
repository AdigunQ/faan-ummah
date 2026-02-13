import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

type SearchParams = {
  saved?: string
}

async function updateMemberLedger(formData: FormData) {
  'use server'

  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const userId = String(formData.get('userId') || '')
  const monthlyContribution = Number(formData.get('monthlyContribution') || 0)
  const specialContribution = Number(formData.get('specialContribution') || 0)
  const balance = Number(formData.get('balance') || 0)
  const specialBalance = Number(formData.get('specialBalance') || 0)
  const loanBalance = Number(formData.get('loanBalance') || 0)

  if (!userId) return
  if (!Number.isFinite(monthlyContribution) || monthlyContribution < 0) return
  if (!Number.isFinite(specialContribution) || specialContribution < 0) return
  if (!Number.isFinite(balance) || balance < 0) return
  if (!Number.isFinite(specialBalance) || specialBalance < 0) return
  if (!Number.isFinite(loanBalance) || loanBalance < 0) return

  await prisma.user.update({
    where: { id: userId },
    data: {
      monthlyContribution,
      specialContribution,
      balance,
      specialBalance,
      loanBalance,
    },
  })

  revalidatePath('/dashboard/directory')
  revalidatePath('/dashboard')
  redirect(`/dashboard/directory?saved=${encodeURIComponent(userId)}#member-${encodeURIComponent(userId)}`)
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
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
      phone: true,
      department: true,
      bankName: true,
      bankAccountNumber: true,
      status: true,
      monthlyContribution: true,
      specialContribution: true,
      balance: true,
      specialBalance: true,
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
  const otherCount = Math.max(0, members.length - activeCount)
  const savedMember = searchParams?.saved ? members.find((m) => m.id === searchParams.saved) : undefined
  const savedMemberId = searchParams?.saved || ''

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Update Member</h1>
        <p className="mt-1 text-gray-500">Search members and manually correct their savings or loan records.</p>
      </div>

      {searchParams?.saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Saved changes{savedMember?.name ? ` for ${savedMember.name}` : ''}.
        </div>
      )}

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
        <table className="w-full min-w-[1220px]">
          <thead className="bg-gray-50">
            <tr>
              <HeadCell label="Member" />
              <HeadCell label="Staff ID" />
              <HeadCell label="Department" />
              <HeadCell label="Contact" />
              <HeadCell label="Bank Details" />
              <HeadCell label="Status" />
              <HeadCell label="Savings (Monthly)" />
              <HeadCell label="Special (Monthly)" />
              <HeadCell label="Savings Balance" />
              <HeadCell label="Special Balance" />
              <HeadCell label="Loan Balance" />
              <HeadCell label="Activity" />
              <HeadCell label="Joined" />
              <HeadCell label="Manual Update" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((member) => {
              const justSaved = member.id === savedMemberId

              return (
                <tr key={member.id} id={`member-${member.id}`} className="hover:bg-gray-50">
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
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {formatCurrency(member.specialContribution || 0)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">{formatCurrency(member.balance)}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {formatCurrency(member.specialBalance || 0)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">
                  {formatCurrency(member.loanBalance)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {member._count.payments} payments · {member._count.loans} loans
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(member.createdAt)}</td>
                <td className="px-6 py-4">
                  <form action={updateMemberLedger} className="grid w-[420px] grid-cols-2 gap-2">
                    <input type="hidden" name="userId" value={member.id} />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      name="monthlyContribution"
                      defaultValue={member.monthlyContribution || 0}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                      title="Monthly savings"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      name="specialContribution"
                      defaultValue={member.specialContribution || 0}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                      title="Monthly special savings"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      name="balance"
                      defaultValue={member.balance}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                      title="Savings balance"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      name="specialBalance"
                      defaultValue={member.specialBalance || 0}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                      title="Special savings balance"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      name="loanBalance"
                      defaultValue={member.loanBalance}
                      className="col-span-2 rounded border border-gray-300 px-2 py-1 text-xs"
                      title="Loan balance"
                    />
                    <button
                      type="submit"
                      className={cn(
                        'col-span-2 rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors',
                        justSaved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-900 hover:bg-black'
                      )}
                    >
                      Save
                    </button>
                    {justSaved && (
                      <div className="col-span-2 text-xs font-medium text-emerald-700">Saved.</div>
                    )}
                  </form>
                </td>
              </tr>
              )
            })}
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
