import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import ImportMembersClient from './import-members-client'
import MonthlyMemberDataClient from './monthly-member-data-client'

export default async function ImportMembersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="animate-fadeIn space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Excel Imports</h1>
        <p className="mt-1 text-gray-500">Upload monthly member data, or replace all members from a spreadsheet.</p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Monthly Member Data (Oct 2025 → Feb 2026)</h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload each month separately. We keep the exact month-specific columns and store the data so you can view it in the
            Member Data tab.
          </p>
        </div>
        <MonthlyMemberDataClient />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Replace Members (Danger Zone)</h2>
          <p className="mt-1 text-sm text-gray-500">
            This will delete every current member and replace them with the members from your uploaded Excel file.
          </p>
        </div>
        <ImportMembersClient />
      </section>
    </div>
  )
}
