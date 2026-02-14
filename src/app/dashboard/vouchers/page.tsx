import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { buildVoucherDataset } from '@/lib/vouchers'

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

  const dataset = await buildVoucherDataset(searchParams?.period)

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Generate Report</h1>
        <p className="mt-1 text-gray-500">
          Admin voucher table for monthly salary deductions. CSV export follows the uploaded spreadsheet format.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <form className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Voucher Period</label>
            <input
              type="month"
              name="period"
              defaultValue={dataset.period}
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
            href={`/api/vouchers/export?period=${dataset.period}`}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Generate CSV
          </Link>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <MetricCard label="Members" value={dataset.rows.length.toString()} tone="blue" />
        <MetricCard label="New Members" value={dataset.totals.newMembers.toString()} tone="green" />
        <MetricCard label="Old Members" value={dataset.totals.oldMembers.toString()} tone="amber" />
        <MetricCard label="Fees Total" value={formatCurrency(dataset.totals.fees)} tone="purple" />
        <MetricCard label="Total Savings" value={formatCurrency(dataset.totals.totalSavings)} tone="slate" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Voucher Preview</h2>
        </div>

        {dataset.rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">No active members available for voucher export.</div>
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
        )}
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
