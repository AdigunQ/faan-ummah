import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { buildVoucherDataset, resolveVoucherPeriod } from '@/lib/vouchers'

type SearchParams = {
  period?: string
}

type MonthOption = {
  period: string
  label: string
  rowCount?: number
  uploadedAt?: Date
  isUploaded: boolean
}

export default async function MemberDataPage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  const months = await prisma.memberDataMonth.findMany({
    orderBy: { period: 'asc' },
    select: { period: true, label: true, rowCount: true, uploadedAt: true },
  })

  const selectedPeriod = resolveVoucherPeriod(searchParams?.period).period

  const selectedUploadedMonth = await prisma.memberDataMonth.findUnique({
    where: { period: selectedPeriod },
    select: { period: true, label: true, rowCount: true, uploadedAt: true, columns: true, rows: true },
  })

  const uploadedColumns =
    selectedUploadedMonth && Array.isArray(selectedUploadedMonth.columns)
      ? (selectedUploadedMonth.columns as string[])
      : []

  const uploadedRows =
    selectedUploadedMonth && Array.isArray(selectedUploadedMonth.rows)
      ? (selectedUploadedMonth.rows as Array<Record<string, unknown>>)
      : []

  const liveDataset = await buildVoucherDataset(selectedPeriod)

  const monthOptions: MonthOption[] = months.map((month) => ({
    period: month.period,
    label: month.label,
    rowCount: month.rowCount,
    uploadedAt: month.uploadedAt,
    isUploaded: true,
  }))

  if (!monthOptions.some((month) => month.period === selectedPeriod)) {
    monthOptions.push({
      period: selectedPeriod,
      label: `${selectedPeriod} (Live)` ,
      isUploaded: false,
    })
  }

  monthOptions.sort((a, b) => a.period.localeCompare(b.period))

  return (
    <div className="animate-fadeIn space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Member Data</h1>
          <p className="mt-1 text-gray-500">
            Live member data is always in sync with newly added members. Uploaded snapshots are shown below when available.
          </p>
        </div>

        <Link
          href="/dashboard/import-members"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Upload / Import
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {monthOptions.map((month) => {
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <MetricCard label="Live Members" value={String(liveDataset.rows.length)} tone="blue" />
        <MetricCard label="New Members" value={String(liveDataset.totals.newMembers)} tone="green" />
        <MetricCard label="Old Members" value={String(liveDataset.totals.oldMembers)} tone="amber" />
        <MetricCard label="Fees Total" value={formatCurrency(liveDataset.totals.fees)} tone="purple" />
        <MetricCard label="Total Savings" value={formatCurrency(liveDataset.totals.totalSavings)} tone="slate" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Live Data ({selectedPeriod})</h2>
          <p className="mt-1 text-sm text-gray-500">
            This table updates immediately when you add a new member in Update Member.
          </p>
        </div>

        {liveDataset.rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">No active members in this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3">S/N</th>
                  <th className="px-6 py-3">Staff ID</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Savings</th>
                  <th className="px-6 py-3">Special Savings</th>
                  <th className="px-6 py-3">Member Fee</th>
                  <th className="px-6 py-3">Member Type</th>
                  <th className="px-6 py-3">Total Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {liveDataset.rows.map((row) => (
                  <tr key={`${row.staffId}-${row.serial}`}>
                    <td className="px-6 py-3 text-gray-800">{row.serial}</td>
                    <td className="px-6 py-3 font-medium text-gray-800">{row.staffId}</td>
                    <td className="px-6 py-3 text-gray-900">{row.name}</td>
                    <td className="px-6 py-3 text-gray-800">{formatCurrency(row.monthlySavings)}</td>
                    <td className="px-6 py-3 text-gray-800">{formatCurrency(row.specialSavings)}</td>
                    <td className="px-6 py-3 text-gray-800">{formatCurrency(row.memberFee)}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          row.memberType === 'NEW' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {row.memberType}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-semibold text-gray-900">{formatCurrency(row.totalSavings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUploadedMonth ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Uploaded Snapshot ({selectedUploadedMonth.label})</h2>
            <p className="mt-1 text-sm text-gray-500">
              {selectedUploadedMonth.rowCount.toLocaleString()} rows • Last upload:{' '}
              {new Date(selectedUploadedMonth.uploadedAt).toLocaleString()}
            </p>
          </div>

          {uploadedRows.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500">No rows in uploaded snapshot for this period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    {uploadedColumns.map((col) => (
                      <th key={col} className="px-6 py-3">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {uploadedRows.map((row, idx) => (
                    <tr key={idx}>
                      {uploadedColumns.map((col) => (
                        <td key={col} className="px-6 py-3 text-gray-800">
                          {formatCell(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          No uploaded snapshot for {selectedPeriod}. Live data above is the current source of truth.
        </div>
      )}
    </div>
  )
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString()
  return String(value)
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'amber' | 'blue' | 'green' | 'purple' | 'slate'
}) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-green-200 bg-green-50 text-green-800',
    purple: 'border-purple-200 bg-purple-50 text-purple-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
  }

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}
