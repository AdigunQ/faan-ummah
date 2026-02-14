'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

type MonthDef = {
  period: string
  label: string
  columns: string[]
}

const MONTHS: MonthDef[] = [
  { period: '2025-10', label: 'Oct 2025', columns: ['Employee No.', 'Employee Name', 'Amount'] },
  {
    period: '2025-11',
    label: 'Nov 2025',
    columns: ['S/N', 'Staff ID', 'Name', 'Thrift Savings', 'Special Saving', 'Charges', 'New Member', 'Total', 'Month Joined', 'Phone'],
  },
  {
    period: '2025-12',
    label: 'Dec 2025',
    columns: ['Staff ID', 'Name', 'Thrift Savings', 'Special Saving', 'Charges', 'New Member', 'Total', 'Month Joined', 'Phone'],
  },
  {
    period: '2026-01',
    label: 'Jan 2026',
    columns: ['S/N', 'Staff ID', 'Name', 'Thrift Savings', 'Special Saving', 'Charges', 'New Member', 'Total', 'Month Joined', 'Phone'],
  },
  {
    period: '2026-02',
    label: 'Feb 2026',
    columns: ['S/N', 'Staff ID', 'Name', 'Thrift Savings', 'Special Saving', 'Monthly Charges', 'New Member FEE', 'Total', 'Month Joined', 'Phone'],
  },
]

type MonthListItem = {
  period: string
  label: string
  rowCount: number
  uploadedAt: string
}

type ListResponse = {
  ok: boolean
  error?: string
  months?: MonthListItem[]
}

type UploadResponse = {
  ok: boolean
  error?: string
  sheetName?: string
  month?: {
    period: string
    label: string
    rowCount: number
    uploadedAt: string
    columns: string[]
    sampleRows: Array<Record<string, unknown>>
  }
}

export default function MonthlyMemberDataClient() {
  const [period, setPeriod] = useState(MONTHS[0].period)
  const [file, setFile] = useState<File | null>(null)
  const [months, setMonths] = useState<MonthListItem[]>([])
  const [lastUpload, setLastUpload] = useState<UploadResponse['month'] | null>(null)
  const [sheetName, setSheetName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const selected = useMemo(() => MONTHS.find((m) => m.period === period) || MONTHS[0], [period])
  const monthByPeriod = useMemo(() => new Map(months.map((m) => [m.period, m])), [months])

  async function refreshMonths() {
    try {
      const res = await fetch('/api/admin/member-data', { method: 'GET' })
      const json = (await res.json()) as ListResponse
      if (!res.ok || !json.ok) return
      setMonths(json.months || [])
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refreshMonths()
  }, [])

  async function uploadMonth() {
    if (!file) {
      toast.error('Please choose an Excel file.')
      return
    }

    setIsLoading(true)
    setLastUpload(null)
    setSheetName(null)
    try {
      const formData = new FormData()
      formData.append('period', period)
      formData.append('file', file)

      const res = await fetch('/api/admin/member-data', {
        method: 'POST',
        body: formData,
      })

      const json = (await res.json()) as UploadResponse
      if (!res.ok || !json.ok) {
        toast.error(json.error || 'Upload failed')
        return
      }

      setLastUpload(json.month || null)
      setSheetName(json.sheetName || null)
      toast.success(`Saved ${selected.label} (${json.month?.rowCount ?? 0} rows).`)
      await refreshMonths()
    } catch (err: any) {
      toast.error(err?.message || 'Unexpected error')
    } finally {
      setIsLoading(false)
    }
  }

  const existing = monthByPeriod.get(period)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-[240px]">
            <label className="mb-2 block text-sm font-semibold text-gray-900">Month</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            >
              {MONTHS.map((m) => (
                <option key={m.period} value={m.period}>
                  {m.label}
                </option>
              ))}
            </select>
            {existing && (
              <p className="mt-2 text-xs text-gray-500">
                Already uploaded: {existing.rowCount.toLocaleString()} rows • {new Date(existing.uploadedAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-gray-900">Excel File (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm"
            />
            <p className="mt-2 text-xs text-gray-500">
              Expected columns for {selected.label}: {selected.columns.join(', ')}.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={uploadMonth}
              disabled={!file || isLoading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Uploading…' : 'Upload & Save'}
            </button>
            <Link
              href={`/dashboard/member-data?period=${encodeURIComponent(period)}`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              View
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Uploaded Months</h3>
          <p className="mt-1 text-sm text-gray-500">This shows what is currently saved in the database.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-3">Month</th>
                <th className="px-6 py-3">Rows</th>
                <th className="px-6 py-3">Last Upload</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {MONTHS.map((m) => {
                const item = monthByPeriod.get(m.period)
                return (
                  <tr key={m.period}>
                    <td className="px-6 py-3 font-medium text-gray-900">{m.label}</td>
                    <td className="px-6 py-3 text-gray-700">{item ? item.rowCount.toLocaleString() : '—'}</td>
                    <td className="px-6 py-3 text-gray-700">{item ? new Date(item.uploadedAt).toLocaleString() : '—'}</td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/dashboard/member-data?period=${encodeURIComponent(m.period)}`}
                        className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {lastUpload && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Latest Upload Preview</h3>
            <p className="mt-1 text-sm text-gray-500">
              {lastUpload.label} • {lastUpload.rowCount.toLocaleString()} rows{sheetName ? ` • Source sheet: ${sheetName}` : ''}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  {lastUpload.columns.map((col) => (
                    <th key={col} className="px-6 py-3">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lastUpload.sampleRows.map((row, idx) => (
                  <tr key={idx}>
                    {lastUpload.columns.map((col) => (
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
      )}
    </div>
  )
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString()
  return String(value)
}

