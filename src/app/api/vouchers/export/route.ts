import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildVoucherCsv, buildVoucherDataset, resolveVoucherPeriod } from '@/lib/vouchers'

function escapeCsv(value: unknown): string {
  const raw = String(value ?? '')
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

function buildMonthCsv(columns: string[], rows: Array<Record<string, unknown>>): string {
  const lines = [columns, ...rows.map((row) => columns.map((col) => row[col] ?? ''))]
  return lines
    .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
    .join('\n')
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
    select: { columns: true, rows: true },
  })

  if (uploadedMonth) {
    const columns = Array.isArray(uploadedMonth.columns) ? (uploadedMonth.columns as string[]) : []
    const rows = Array.isArray(uploadedMonth.rows) ? (uploadedMonth.rows as Array<Record<string, unknown>>) : []
    const csv = buildMonthCsv(columns, rows)
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
  const csv = buildVoucherCsv(dataset)
  const filename = `monthly-deduction-${dataset.period}.csv`

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
