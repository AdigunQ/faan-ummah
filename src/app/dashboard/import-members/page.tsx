import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import ImportMembersClient from './import-members-client'

export default async function ImportMembersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Replace Members (Excel Import)</h1>
        <p className="mt-1 text-gray-500">
          This will delete every current member and replace them with the members from your uploaded Excel file.
        </p>
      </div>

      <ImportMembersClient />
    </div>
  )
}
