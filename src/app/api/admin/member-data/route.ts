import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

type ColumnType = 'text' | 'number' | 'date' | 'staffId'

type ColumnDef = {
  key: string
  required: boolean
  type: ColumnType
  candidates: string[]
}

type MonthDef = {
  period: string // YYYY-MM
  label: string
  sheetHints: string[]
  columns: ColumnDef[]
}

const MONTH_DEFS: MonthDef[] = [
  {
    period: '2025-10',
    label: 'Oct 2025',
    sheetHints: ['oct 2025', 'october 2025'],
    columns: [
      {
        key: 'Employee No.',
        required: true,
        type: 'staffId',
        candidates: ['employee no.', 'employee no', 'employee number', 'employee id', 'staff id'],
      },
      {
        key: 'Employee Name',
        required: true,
        type: 'text',
        candidates: ['employee name', 'name', 'full name'],
      },
      {
        key: 'Amount',
        required: true,
        type: 'number',
        candidates: ['amount', 'total', 'thrift savings'],
      },
    ],
  },
  {
    period: '2025-11',
    label: 'Nov 2025',
    sheetHints: ['nov 2025', 'november 2025'],
    columns: [
      { key: 'S/N', required: false, type: 'number', candidates: ['s/n', 'sn', 's no', 'sno', 'serial no', 'serial'] },
      {
        key: 'Staff ID',
        required: true,
        type: 'staffId',
        candidates: ['staff id', 'employee no.', 'employee no', 'employee number', 'employee id'],
      },
      { key: 'Name', required: true, type: 'text', candidates: ['name', 'employee name', 'full name'] },
      {
        key: 'Thrift Savings',
        required: true,
        type: 'number',
        candidates: ['thrift savings', 'monthly savings', 'savings (monthly)', 'monthly contribution'],
      },
      {
        key: 'Special Saving',
        required: false,
        type: 'number',
        candidates: ['special saving', 'special savings', 'special (monthly)'],
      },
      { key: 'Charges', required: false, type: 'number', candidates: ['charges', 'monthly charges'] },
      { key: 'New Member', required: false, type: 'number', candidates: ['new member', 'new member fee'] },
      { key: 'Total', required: false, type: 'number', candidates: ['total'] },
      { key: 'Month Joined', required: false, type: 'date', candidates: ['month joined', 'joined', 'join date', 'date joined'] },
      { key: 'Phone', required: false, type: 'text', candidates: ['phone', 'phone number', 'mobile', 'whatsapp'] },
    ],
  },
  {
    period: '2025-12',
    label: 'Dec 2025',
    sheetHints: ['dec 2025', 'december 2025'],
    columns: [
      {
        key: 'Staff ID',
        required: true,
        type: 'staffId',
        candidates: ['staff id', 'employee no.', 'employee no', 'employee number', 'employee id'],
      },
      { key: 'Name', required: true, type: 'text', candidates: ['name', 'employee name', 'full name'] },
      {
        key: 'Thrift Savings',
        required: true,
        type: 'number',
        candidates: ['thrift savings', 'monthly savings', 'savings (monthly)', 'monthly contribution'],
      },
      {
        key: 'Special Saving',
        required: false,
        type: 'number',
        candidates: ['special saving', 'special savings', 'special (monthly)'],
      },
      { key: 'Charges', required: false, type: 'number', candidates: ['charges', 'monthly charges'] },
      { key: 'New Member', required: false, type: 'number', candidates: ['new member', 'new member fee'] },
      { key: 'Total', required: false, type: 'number', candidates: ['total'] },
      { key: 'Month Joined', required: false, type: 'date', candidates: ['month joined', 'joined', 'join date', 'date joined'] },
      { key: 'Phone', required: false, type: 'text', candidates: ['phone', 'phone number', 'mobile', 'whatsapp'] },
    ],
  },
  {
    period: '2026-01',
    label: 'Jan 2026',
    sheetHints: ['jan 2026', 'january 2026'],
    columns: [
      { key: 'S/N', required: false, type: 'number', candidates: ['s/n', 'sn', 's no', 'sno', 'serial no', 'serial'] },
      {
        key: 'Staff ID',
        required: true,
        type: 'staffId',
        candidates: ['staff id', 'employee no.', 'employee no', 'employee number', 'employee id'],
      },
      { key: 'Name', required: true, type: 'text', candidates: ['name', 'employee name', 'full name'] },
      {
        key: 'Thrift Savings',
        required: true,
        type: 'number',
        candidates: ['thrift savings', 'monthly savings', 'savings (monthly)', 'monthly contribution'],
      },
      {
        key: 'Special Saving',
        required: false,
        type: 'number',
        candidates: ['special saving', 'special savings', 'special (monthly)'],
      },
      { key: 'Charges', required: false, type: 'number', candidates: ['charges', 'monthly charges'] },
      { key: 'New Member', required: false, type: 'number', candidates: ['new member', 'new member fee'] },
      { key: 'Total', required: false, type: 'number', candidates: ['total'] },
      { key: 'Month Joined', required: false, type: 'date', candidates: ['month joined', 'joined', 'join date', 'date joined'] },
      { key: 'Phone', required: false, type: 'text', candidates: ['phone', 'phone number', 'mobile', 'whatsapp'] },
    ],
  },
  {
    period: '2026-02',
    label: 'Feb 2026',
    sheetHints: ['feb 2026', 'february 2026'],
    columns: [
      { key: 'S/N', required: false, type: 'number', candidates: ['s/n', 'sn', 's no', 'sno', 'serial no', 'serial'] },
      {
        key: 'Staff ID',
        required: true,
        type: 'staffId',
        candidates: ['staff id', 'employee no.', 'employee no', 'employee number', 'employee id'],
      },
      { key: 'Name', required: true, type: 'text', candidates: ['name', 'employee name', 'full name'] },
      {
        key: 'Thrift Savings',
        required: true,
        type: 'number',
        candidates: ['thrift savings', 'monthly savings', 'savings (monthly)', 'monthly contribution'],
      },
      {
        key: 'Special Saving',
        required: false,
        type: 'number',
        candidates: ['special saving', 'special savings', 'special (monthly)'],
      },
      { key: 'Monthly Charges', required: false, type: 'number', candidates: ['monthly charges', 'charges'] },
      { key: 'New Member FEE', required: false, type: 'number', candidates: ['new member fee', 'new member', 'new member fee'] },
      { key: 'Total', required: false, type: 'number', candidates: ['total'] },
      { key: 'Month Joined', required: false, type: 'date', candidates: ['month joined', 'joined', 'join date', 'date joined'] },
      { key: 'Phone', required: false, type: 'text', candidates: ['phone', 'phone number', 'mobile', 'whatsapp'] },
    ],
  },
]

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
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

function toText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeStaffId(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value)).padStart(6, '0')
  }
  const raw = toText(value)
  const cleaned = raw.replace(/\s+/g, '')
  if (/^\d+$/.test(cleaned) && cleaned.length > 0 && cleaned.length < 6) {
    return cleaned.padStart(6, '0')
  }
  return cleaned
}

function excelSerialToUtcDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569)
  return new Date(utcDays * 86400 * 1000)
}

function parseJoinDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value
  if (typeof value === 'number' && Number.isFinite(value) && value > 30000) {
    const date = excelSerialToUtcDate(value)
    return Number.isNaN(date.valueOf()) ? null : date
  }
  const raw = toText(value)
  if (!raw) return null

  const cleaned = raw
    .toLowerCase()
    .replace(/^0ctober/, 'october')
    .replace(/^0ct/, 'oct')
    .replace(/\s+/g, ' ')
    .trim()

  const parsed = new Date(cleaned)
  if (!Number.isNaN(parsed.valueOf())) {
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
  }
  return null
}

function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function findColumnIndex(indexByHeader: Record<string, number>, candidates: string[]): number | undefined {
  for (const candidate of candidates) {
    const key = normalizeHeader(candidate)
    const idx = indexByHeader[key]
    if (idx !== undefined) return idx
  }
  return undefined
}

function detectHeaderRow(rows: any[][], requiredColumns: ColumnDef[]): { headerIndex: number; indexByHeader: Record<string, number> } | null {
  for (let i = 0; i < Math.min(rows.length, 25); i += 1) {
    const row = rows[i] || []
    const indexByHeader: Record<string, number> = {}
    row.forEach((cell, idx) => {
      const key = normalizeHeader(cell)
      if (key) indexByHeader[key] = idx
    })

    const missingRequired = requiredColumns.some((col) => col.required && findColumnIndex(indexByHeader, col.candidates) === undefined)
    if (!missingRequired) {
      return { headerIndex: i, indexByHeader }
    }
  }

  return null
}

function pickSheet(wb: XLSX.WorkBook, def: MonthDef): { sheetName: string; rows: any[][]; headerIndex: number; indexByHeader: Record<string, number> } {
  const hintSet = new Set(def.sheetHints.map((h) => normalizeHeader(h)))

  for (const sheetName of wb.SheetNames) {
    if (hintSet.has(normalizeHeader(sheetName))) {
      const ws = wb.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) as any[][]
      const header = detectHeaderRow(rows, def.columns)
      if (!header) break
      return { sheetName, rows, headerIndex: header.headerIndex, indexByHeader: header.indexByHeader }
    }
  }

  // Fallback: find any sheet that matches the required columns
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) as any[][]
    const header = detectHeaderRow(rows, def.columns)
    if (!header) continue
    return { sheetName, rows, headerIndex: header.headerIndex, indexByHeader: header.indexByHeader }
  }

  throw new Error(`Excel import: could not find a sheet matching ${def.label}.`)
}

function coerceCell(value: unknown, col: ColumnDef): unknown {
  if (value === null || value === undefined) return ''

  switch (col.type) {
    case 'number':
      return toNumber(value)
    case 'date': {
      const parsed = parseJoinDate(value)
      return parsed ? isoDateOnly(parsed) : toText(value)
    }
    case 'staffId':
      return normalizeStaffId(value)
    default:
      return toText(value)
  }
}

function parseMonthWorkbook(buffer: Buffer, def: MonthDef): { sheetName: string; columns: string[]; rows: Array<Record<string, unknown>> } {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const chosen = pickSheet(wb, def)

  const indices = def.columns.map((col) => ({
    col,
    index: findColumnIndex(chosen.indexByHeader, col.candidates),
  }))

  const missing = indices.filter((entry) => entry.col.required && entry.index === undefined).map((entry) => entry.col.key)
  if (missing.length > 0) {
    throw new Error(`Excel import (${def.label}): missing required column(s): ${missing.join(', ')}`)
  }

  const staffCol = indices.find((entry) => entry.col.type === 'staffId')?.index
  if (staffCol === undefined) {
    throw new Error(`Excel import (${def.label}): could not determine Staff ID column.`)
  }

  const rows: Array<Record<string, unknown>> = []
  for (let i = chosen.headerIndex + 1; i < chosen.rows.length; i += 1) {
    const rawRow = chosen.rows[i] || []
    const staffId = normalizeStaffId(rawRow[staffCol])
    if (!staffId) continue

    const record: Record<string, unknown> = {}
    for (const entry of indices) {
      record[entry.col.key] = entry.index === undefined ? '' : coerceCell(rawRow[entry.index], entry.col)
    }
    rows.push(record)
  }

  return {
    sheetName: chosen.sheetName,
    columns: def.columns.map((c) => c.key),
    rows,
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const months = await prisma.memberDataMonth.findMany({
    orderBy: { period: 'asc' },
    select: { period: true, label: true, rowCount: true, uploadedAt: true },
  })

  return NextResponse.json({ ok: true, months })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const period = String(formData.get('period') || '').trim()
  const file = formData.get('file')

  if (!period) {
    return NextResponse.json({ ok: false, error: 'Missing period.' }, { status: 400 })
  }

  const def = MONTH_DEFS.find((m) => m.period === period)
  if (!def) {
    return NextResponse.json({ ok: false, error: `Unsupported period: ${period}` }, { status: 400 })
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Please upload the Excel file.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = parseMonthWorkbook(buffer, def)

  const saved = await prisma.memberDataMonth.upsert({
    where: { period: def.period },
    create: {
      period: def.period,
      label: def.label,
      rowCount: parsed.rows.length,
      columns: parsed.columns as any,
      rows: parsed.rows as any,
      uploadedById: session.user.id,
      uploadedAt: new Date(),
    },
    update: {
      label: def.label,
      rowCount: parsed.rows.length,
      columns: parsed.columns as any,
      rows: parsed.rows as any,
      uploadedById: session.user.id,
      uploadedAt: new Date(),
    },
    select: { period: true, label: true, rowCount: true, uploadedAt: true, columns: true, rows: true },
  })

  const rows = Array.isArray(saved.rows) ? (saved.rows as Array<Record<string, unknown>>) : []
  const columns = Array.isArray(saved.columns) ? (saved.columns as string[]) : []

  return NextResponse.json({
    ok: true,
    sheetName: parsed.sheetName,
    month: {
      period: saved.period,
      label: saved.label,
      rowCount: saved.rowCount,
      uploadedAt: saved.uploadedAt,
      columns,
      sampleRows: rows.slice(0, 10),
    },
  })
}
