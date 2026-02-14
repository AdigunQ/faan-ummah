import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildVoucherDataset, resolveVoucherPeriod } from '@/lib/vouchers'

function escapeCsv(value: unknown): string {
  const raw = String(value ?? '')
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
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

function buildThreeColumnCsv(rows: Array<{ staffId: string; name: string; thriftSavings: number }>): string {
  const lines: Array<Array<string | number>> = [
    ['Staff ID', 'Name', 'Thrift Savings'],
    ...rows.map((row) => [row.staffId, row.name, row.thriftSavings]),
  ]

  return lines.map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\n')
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const periodInput = searchParams.get('period') || undefined
  const resolved = resolveVoucherPeriod(periodInput)

  const uploadedMonth = await prisma.memberDataMonth.findUnique({
    where: { period: resolved.period },
    select: { rows: true },
  })

  if (uploadedMonth) {
    const rawRows = Array.isArray(uploadedMonth.rows) ? (uploadedMonth.rows as Array<Record<string, unknown>>) : []

    const rows = rawRows
      .map((row) => {
        const staffId = String(row['Staff ID'] ?? row['Employee No.'] ?? '').trim()
        if (!staffId) return null

        const name = String(row['Name'] ?? row['Employee Name'] ?? '').trim()

        const thriftSavings =
          row['Amount'] !== undefined
            ? toNumber(row['Amount'])
            : toNumber(row['Thrift Savings']) +
              toNumber(row['Special Saving']) +
              toNumber(row['Charges']) +
              toNumber(row['Monthly Charges']) +
              toNumber(row['New Member']) +
              toNumber(row['New Member FEE'])

        return {
          staffId,
          name,
          thriftSavings,
        }
      })
      .filter(Boolean) as Array<{ staffId: string; name: string; thriftSavings: number }>

    const csv = buildThreeColumnCsv(rows)
    const filename = `monthly-deduction-${resolved.period}.csv`

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  const dataset = await buildVoucherDataset(resolved.period)
  const csv = buildThreeColumnCsv(
    dataset.rows.map((row) => ({
      staffId: row.staffId,
      name: row.name,
      thriftSavings: row.totalSavings,
    }))
  )
  const filename = `monthly-deduction-${dataset.period}.csv`

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
