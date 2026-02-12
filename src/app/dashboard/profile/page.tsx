import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function updateBankProfile(formData: FormData) {
  'use server'

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'MEMBER') {
    redirect('/dashboard')
  }

  const bankName = String(formData.get('bankName') || '').trim()
  const bankAccountNumber = String(formData.get('bankAccountNumber') || '').trim()
  const bankAccountName = String(formData.get('bankAccountName') || '').trim()

  if (!bankName || !bankAccountName || bankAccountNumber.length < 10) {
    return
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      bankName,
      bankAccountNumber,
      bankAccountName,
    },
  })

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/apply-loan')
  revalidatePath('/dashboard/withdrawals')
  revalidatePath('/dashboard/delete-account')
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.email) {
    redirect('/login')
  }
  if (session.user.role !== 'MEMBER') {
    redirect('/dashboard')
  }

  const member = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      staffId: true,
      department: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountName: true,
    },
  })

  if (!member) redirect('/login')

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-gray-500">
          Update your bank account details. These details are used for loan disbursement and withdrawal payouts.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Member Details</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2">
          <p><span className="font-medium text-gray-800">Name:</span> {member.name || 'N/A'}</p>
          <p><span className="font-medium text-gray-800">Email:</span> {member.email}</p>
          <p><span className="font-medium text-gray-800">Staff ID:</span> {member.staffId || 'N/A'}</p>
          <p><span className="font-medium text-gray-800">Department:</span> {member.department || 'N/A'}</p>
          <p><span className="font-medium text-gray-800">Phone:</span> {member.phone || 'N/A'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Bank Account</h2>
        <form action={updateBankProfile} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Bank Name</label>
            <input
              name="bankName"
              type="text"
              defaultValue={member.bankName || ''}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Account Number</label>
            <input
              name="bankAccountNumber"
              type="text"
              defaultValue={member.bankAccountNumber || ''}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Account Name</label>
            <input
              name="bankAccountName"
              type="text"
              defaultValue={member.bankAccountName || ''}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Save Bank Details
          </button>
        </form>
      </div>
    </div>
  )
}
