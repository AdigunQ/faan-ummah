import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'

async function updateMemberRecord(formData: FormData) {
  'use server'

  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const memberId = String(formData.get('memberId') || '')
  const monthlyContribution = Number(formData.get('monthlyContribution') || 0)
  const balance = Number(formData.get('balance') || 0)
  const loanBalance = Number(formData.get('loanBalance') || 0)
  const status = String(formData.get('status') || 'ACTIVE')
  const voucherEnabled = String(formData.get('voucherEnabled') || 'true') === 'true'

  if (!memberId) return
  if (!Number.isFinite(monthlyContribution) || monthlyContribution < 0) return
  if (!Number.isFinite(balance) || balance < 0) return
  if (!Number.isFinite(loanBalance) || loanBalance < 0) return
  if (!['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'CLOSED'].includes(status)) return

  await prisma.user.update({
    where: { id: memberId },
    data: {
      monthlyContribution,
      balance,
      loanBalance,
      status: status as 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'CLOSED',
      voucherEnabled,
      closureDate: status === 'CLOSED' ? new Date() : null,
    },
  })

  revalidatePath(`/dashboard/directory/${memberId}`)
  revalidatePath('/dashboard/directory')
  revalidatePath('/dashboard')
}

export default async function MemberProfileEditorPage({
  params,
}: {
  params: { memberId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  const member = await prisma.user.findUnique({
    where: { id: params.memberId },
    select: {
      id: true,
      name: true,
      email: true,
      staffId: true,
      phone: true,
      department: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountName: true,
      monthlyContribution: true,
      balance: true,
      totalContributions: true,
      loanBalance: true,
      status: true,
      voucherEnabled: true,
    },
  })

  if (!member) redirect('/dashboard/directory')

  return (
    <div className="animate-fadeIn space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Member Profile (Admin Edit)</h1>
          <p className="mt-1 text-gray-500">Open any member profile and manually correct savings/loan records.</p>
        </div>
        <Link
          href="/dashboard/directory"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Directory
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{member.name || 'Unnamed Member'}</h2>
        <p className="mt-1 text-sm text-gray-500">{member.email}</p>
        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2">
          <p><span className="font-medium text-gray-800">Staff ID:</span> {member.staffId || 'N/A'}</p>
          <p><span className="font-medium text-gray-800">Department:</span> {member.department || 'N/A'}</p>
          <p><span className="font-medium text-gray-800">Phone:</span> {member.phone || 'N/A'}</p>
          <p><span className="font-medium text-gray-800">Bank:</span> {member.bankName || 'N/A'} / {member.bankAccountNumber || 'N/A'}</p>
          <p><span className="font-medium text-gray-800">Account Name:</span> {member.bankAccountName || 'N/A'}</p>
          <p><span className="font-medium text-gray-800">Current Savings:</span> {formatCurrency(member.balance)}</p>
          <p><span className="font-medium text-gray-800">Current Loan Balance:</span> {formatCurrency(member.loanBalance)}</p>
          <p><span className="font-medium text-gray-800">Total Contributions:</span> {formatCurrency(member.totalContributions)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Manual Correction</h2>
        <form action={updateMemberRecord} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <input type="hidden" name="memberId" value={member.id} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Monthly Savings Amount</label>
            <input
              type="number"
              min={0}
              step={1}
              name="monthlyContribution"
              defaultValue={member.monthlyContribution || 0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Savings Balance</label>
            <input
              type="number"
              min={0}
              step={1}
              name="balance"
              defaultValue={member.balance}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Loan Status Amount (Outstanding)</label>
            <input
              type="number"
              min={0}
              step={1}
              name="loanBalance"
              defaultValue={member.loanBalance}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Account Status</label>
            <select
              name="status"
              defaultValue={member.status}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            >
              <option value="PENDING">PENDING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="REJECTED">REJECTED</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Include in Voucher</label>
            <select
              name="voucherEnabled"
              defaultValue={member.voucherEnabled ? 'true' : 'false'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Save Manual Update
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
