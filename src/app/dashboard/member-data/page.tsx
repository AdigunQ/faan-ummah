import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function MemberDataPage({ searchParams }: { searchParams: { period?: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  const months = await prisma.memberDataMonth.findMany({
    orderBy: { period: 'asc' },
    select: { period: true, label: true, rowCount: true, uploadedAt: true },
  })

  const selectedPeriod =
    (searchParams.period && months.some((m) => m.period === searchParams.period) && searchParams.period) ||
    months.at(-1)?.period ||
    null

  const selected = selectedPeriod
    ? await prisma.memberDataMonth.findUnique({
        where: { period: selectedPeriod },
        select: { period: true, label: true, rowCount: true, uploadedAt: true, columns: true, rows: true },
      })
    : null

  const columns = selected && Array.isArray(selected.columns) ? (selected.columns as string[]) : []
  const rows = selected && Array.isArray(selected.rows) ? (selected.rows as Array<Record<string, unknown>>) : []

  return (
    <div className="animate-fadeIn space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Member Data</h1>
          <p className="mt-1 text-gray-500">Monthly snapshots uploaded from Excel (Oct 2025 → Feb 2026).</p>
        </div>

        <Link
          href="/dashboard/import-members"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Upload / Import
        </Link>
      </div>

      {months.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">No month data has been uploaded yet.</p>
          <p className="mt-1 text-sm text-gray-500">Go to “Upload / Import” to upload Oct 2025 → Feb 2026.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {months.map((month) => {
              const active = month.period === selectedPeriod
              return (
                <Link
                  key={month.period}
                  href={`/dashboard/member-data?period=${encodeURIComponent(month.period)}`}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    active ? 'bg-gray-900 text-white' : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {month.label}
                </Link>
              )
            })}
          </div>

          {selected ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">{selected.label}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selected.rowCount.toLocaleString()} rows • Last upload: {new Date(selected.uploadedAt).toLocaleString()}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="px-6 py-3">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rows.map((row, idx) => (
                      <tr key={idx}>
                        {columns.map((col) => (
                          <td key={col} className="px-6 py-3 text-gray-800">
                            {formatCell(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-700">Select a month to view its table.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString()
  return String(value)
}

