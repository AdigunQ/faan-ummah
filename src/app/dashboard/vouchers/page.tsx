import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { buildVoucherDataset, resolveVoucherPeriod } from '@/lib/vouchers'

type SearchParams = {
  period?: string
}

export default async function VouchersPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  const resolved = resolveVoucherPeriod(searchParams?.period)

  const uploadedMonth = await prisma.memberDataMonth.findUnique({
    where: { period: resolved.period },
    select: {
      period: true,
      label: true,
      rowCount: true,
      uploadedAt: true,
      columns: true,
      rows: true,
    },
  })

  const uploadedColumns = uploadedMonth && Array.isArray(uploadedMonth.columns) ? (uploadedMonth.columns as string[]) : []
  const uploadedRows = uploadedMonth && Array.isArray(uploadedMonth.rows)
    ? (uploadedMonth.rows as Array<Record<string, unknown>>)
    : []

  const dataset = uploadedMonth ? null : await buildVoucherDataset(resolved.period)
  const uploadedTotals = uploadedMonth ? computeUploadedTotals(uploadedRows, uploadedColumns) : null

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Generate Report</h1>
        <p className="mt-1 text-gray-500">
          Monthly salary deduction report. If you uploaded a month in Member Data, this page uses that uploaded table.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <form className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Report Period</label>
            <input
              type="month"
              name="period"
              defaultValue={resolved.period}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Load Period
          </button>
          <Link
            href={`/api/vouchers/export?period=${resolved.period}`}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Generate CSV
          </Link>
          <Link
            href={`/dashboard/member-data?period=${resolved.period}`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            View Member Data
          </Link>
        </form>
      </div>

      {uploadedMonth ? (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <p className="font-semibold">Using uploaded Member Data for {uploadedMonth.label}</p>
            <p className="mt-1 text-sm">
              {uploadedMonth.rowCount.toLocaleString()} rows • Uploaded {new Date(uploadedMonth.uploadedAt).toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <MetricCard label="Rows" value={uploadedRows.length.toString()} tone="blue" />
            <MetricCard label="New Members" value={uploadedTotals?.newMembers ?? '—'} tone="green" />
            <MetricCard label="Old Members" value={uploadedTotals?.oldMembers ?? '—'} tone="amber" />
            <MetricCard label="Fees Total" value={uploadedTotals ? formatCurrency(uploadedTotals.feesTotal) : '—'} tone="purple" />
            <MetricCard label="Total" value={uploadedTotals ? formatCurrency(uploadedTotals.total) : '—'} tone="slate" />
          </div>
        </>
      ) : dataset ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <MetricCard label="Members" value={dataset.rows.length.toString()} tone="blue" />
          <MetricCard label="New Members" value={dataset.totals.newMembers.toString()} tone="green" />
          <MetricCard label="Old Members" value={dataset.totals.oldMembers.toString()} tone="amber" />
          <MetricCard label="Fees Total" value={formatCurrency(dataset.totals.fees)} tone="purple" />
          <MetricCard label="Total Savings" value={formatCurrency(dataset.totals.totalSavings)} tone="slate" />
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Report Preview</h2>
        </div>

        {uploadedMonth ? (
          uploadedRows.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500">No rows found in the uploaded sheet for this month.</div>
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
          )
        ) : dataset && dataset.rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">No active members available for report generation.</div>
        ) : dataset ? (
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
                {dataset.rows.map((row) => (
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
                          row.memberType === 'NEW'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
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
        ) : (
          <div className="px-6 py-10 text-center text-gray-500">
            No report data available. Upload this month in <span className="font-semibold">Member Data</span> first.
          </div>
        )}
      </div>
    </div>
  )
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const cleaned = String(value ?? '')
    .replace(/,/g, '')
    .trim()
  if (!cleaned) return 0
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function sumColumn(rows: Array<Record<string, unknown>>, key: string): number {
  return rows.reduce((sum, row) => sum + toNumber(row[key]), 0)
}

function computeUploadedTotals(rows: Array<Record<string, unknown>>, columns: string[]) {
  const hasNewMember = columns.includes('New Member') || columns.includes('New Member FEE')

  const charges = sumColumn(rows, 'Charges') + sumColumn(rows, 'Monthly Charges')
  const newMember = sumColumn(rows, 'New Member') + sumColumn(rows, 'New Member FEE')
  const feesTotal = charges + newMember

  const total =
    columns.includes('Total')
      ? sumColumn(rows, 'Total')
      : columns.includes('Amount')
        ? sumColumn(rows, 'Amount')
        : sumColumn(rows, 'Thrift Savings') + sumColumn(rows, 'Special Saving') + feesTotal

  const newMembers = hasNewMember
    ? rows.filter((row) => toNumber(row['New Member']) > 0 || toNumber(row['New Member FEE']) > 0).length
    : null

  const oldMembers = hasNewMember && newMembers !== null ? rows.length - newMembers : null

  return {
    feesTotal,
    total,
    newMembers: newMembers === null ? '—' : String(newMembers),
    oldMembers: oldMembers === null ? '—' : String(oldMembers),
  }
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
