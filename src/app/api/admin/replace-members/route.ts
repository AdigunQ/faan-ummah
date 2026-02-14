import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import bcrypt from 'bcryptjs'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

type SavingsRow = {
  staffId: string
  name: string
  thriftTotal: number
}

type SpecialRow = {
  staffId: string
  name: string
  thriftSavings: number
  specialSaving: number
  phone?: string
}

type ImportMember = {
  staffId: string
  name: string
  monthlySavings: number
  specialSavings: number
  phone?: string
  savingsSheetTotal?: number
  warnings: string[]
}

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

function findHeaderRow(rows: any[][], requiredHeaders: string[]): { headerIndex: number; indexByHeader: Record<string, number> } {
  for (let i = 0; i < Math.min(rows.length, 25); i += 1) {
    const row = rows[i] || []
    const indexByHeader: Record<string, number> = {}
    row.forEach((cell, idx) => {
      const key = normalizeHeader(cell)
      if (key) indexByHeader[key] = idx
    })

    const hasAll = requiredHeaders.every((header) => indexByHeader[normalizeHeader(header)] !== undefined)
    if (hasAll) {
      return { headerIndex: i, indexByHeader }
    }
  }

  return { headerIndex: -1, indexByHeader: {} }
}

function parseSavingsWorkbook(buffer: Buffer): Map<string, SavingsRow> {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const firstSheet = wb.SheetNames[0]
  const ws = wb.Sheets[firstSheet]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) as any[][]

  const { headerIndex, indexByHeader } = findHeaderRow(rows, ['staff id', 'name', 'thrift savings'])
  if (headerIndex < 0) {
    throw new Error('Savings.xlsx: could not find the header row containing Staff ID, Name, and Thrift Savings.')
  }

  const staffIdIdx = indexByHeader['staff id']
  const nameIdx = indexByHeader['name']
  const thriftIdx = indexByHeader['thrift savings']

  const out = new Map<string, SavingsRow>()
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] || []
    const staffId = toText(row[staffIdIdx])
    if (!staffId) continue
    const name = toText(row[nameIdx]) || 'Unnamed Member'
    const thriftTotal = toNumber(row[thriftIdx])
    out.set(staffId, { staffId, name, thriftTotal })
  }
  return out
}

function findSpecialSheetName(wb: XLSX.WorkBook): string | undefined {
  const preferred = wb.SheetNames.find((name) => normalizeHeader(name) === 'feb 2026')
  if (preferred) return preferred

  // fallback: find a sheet with the expected headers.
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) as any[][]
    const { headerIndex } = findHeaderRow(rows, ['staff id', 'name', 'thrift savings', 'special saving'])
    if (headerIndex >= 0) return name
  }

  return undefined
}

function parseSpecialWorkbook(buffer: Buffer): Map<string, SpecialRow> {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = findSpecialSheetName(wb)
  if (!sheetName) {
    throw new Error('Special Saving.xlsx: could not find a sheet containing Staff ID, Name, Thrift Savings, and Special Saving.')
  }

  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) as any[][]

  const { headerIndex, indexByHeader } = findHeaderRow(rows, ['staff id', 'name', 'thrift savings', 'special saving'])
  if (headerIndex < 0) {
    throw new Error(`Special Saving.xlsx: could not find the header row in sheet "${sheetName}".`)
  }

  const staffIdIdx = indexByHeader['staff id']
  const nameIdx = indexByHeader['name']
  const thriftIdx = indexByHeader['thrift savings']
  const specialIdx = indexByHeader['special saving']
  const phoneIdx = indexByHeader['phone']

  const out = new Map<string, SpecialRow>()
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] || []
    const staffId = toText(row[staffIdIdx])
    if (!staffId) continue
    const name = toText(row[nameIdx]) || 'Unnamed Member'
    const thriftSavings = toNumber(row[thriftIdx])
    const specialSaving = toNumber(row[specialIdx])
    const phone = phoneIdx !== undefined ? toText(row[phoneIdx]) : ''
    out.set(staffId, { staffId, name, thriftSavings, specialSaving, phone: phone || undefined })
  }
  return out
}

function buildEmail(staffId: string): string {
  const domain = (process.env.MEMBER_EMAIL_DOMAIN || 'faan-ummah.coop').trim().replace(/^@/, '')
  const local = staffId.trim().replace(/[^a-zA-Z0-9._-]/g, '')
  if (!local) {
    throw new Error(`Invalid Staff ID for email generation: "${staffId}"`)
  }
  return `${local.toLowerCase()}@${domain.toLowerCase()}`
}

function mergeRows(savingsRows: Map<string, SavingsRow>, specialRows: Map<string, SpecialRow>): ImportMember[] {
  const staffIds = new Set<string>()
  savingsRows.forEach((_value, key) => staffIds.add(key))
  specialRows.forEach((_value, key) => staffIds.add(key))
  const list = Array.from(staffIds)
  list.sort((a, b) => a.localeCompare(b))

  return list.map((staffId) => {
    const savings = savingsRows.get(staffId)
    const special = specialRows.get(staffId)

    const name = special?.name || savings?.name || 'Unnamed Member'
    const monthlySavings = special?.thriftSavings ?? 0
    const specialSavings = special?.specialSaving ?? 0
    const savingsSheetTotal = savings?.thriftTotal
    const warnings: string[] = []

    if (!special) warnings.push('Missing in Special Saving.xlsx')
    if (!savings) warnings.push('Missing in Savings.xlsx')

    if (savingsSheetTotal !== undefined) {
      const expectedOldTotal = monthlySavings + specialSavings + 100
      if (Math.abs(expectedOldTotal - savingsSheetTotal) > 0.01) {
        warnings.push(`Total mismatch vs Savings.xlsx (expected ₦${expectedOldTotal.toLocaleString()} got ₦${savingsSheetTotal.toLocaleString()})`)
      }
    }

    return {
      staffId,
      name,
      monthlySavings,
      specialSavings,
      phone: special?.phone,
      savingsSheetTotal,
      warnings,
    }
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const mode = String(formData.get('mode') || 'preview')
  const savingsFile = formData.get('savings')
  const specialFile = formData.get('special')

  if (!(savingsFile instanceof File) || !(specialFile instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Both Savings.xlsx and Special Saving.xlsx are required.' }, { status: 400 })
  }

  const savingsBuffer = Buffer.from(await savingsFile.arrayBuffer())
  const specialBuffer = Buffer.from(await specialFile.arrayBuffer())

  const savingsRows = parseSavingsWorkbook(savingsBuffer)
  const specialRows = parseSpecialWorkbook(specialBuffer)
  const merged = mergeRows(savingsRows, specialRows)

  const duplicates = merged.filter((m) => !m.staffId).length
  if (duplicates > 0) {
    return NextResponse.json({ ok: false, error: 'One or more rows are missing Staff ID.' }, { status: 400 })
  }

  const withSpecial = merged.filter((m) => m.specialSavings > 0).length
  const mismatches = merged.filter((m) => m.warnings.some((w) => w.startsWith('Total mismatch'))).length
  const missingInSpecial = merged.filter((m) => m.warnings.includes('Missing in Special Saving.xlsx')).length
  const missingInSavings = merged.filter((m) => m.warnings.includes('Missing in Savings.xlsx')).length

  if (mode !== 'replace') {
    return NextResponse.json({
      ok: true,
      mode: 'preview',
      counts: {
        mergedMembers: merged.length,
        savingsRows: savingsRows.size,
        specialRows: specialRows.size,
        withSpecialSavings: withSpecial,
        missingInSpecial,
        missingInSavings,
        mismatchedTotals: mismatches,
      },
      sample: merged.slice(0, 8),
    })
  }

  const confirm = String(formData.get('confirm') || '')
  if (confirm !== 'REPLACE MEMBERS') {
    return NextResponse.json({ ok: false, error: 'Confirmation text must be exactly: REPLACE MEMBERS' }, { status: 400 })
  }

  const passwordPlain = (process.env.DEFAULT_MEMBER_PASSWORD || 'member123').trim() || 'member123'
  const passwordHash = await bcrypt.hash(passwordPlain, 10)
  const createdAt = new Date('2025-01-01T00:00:00.000Z') // ensure everyone is treated as an OLD member for voucher fees

  const data = merged.map((member) => ({
    email: buildEmail(member.staffId),
    name: member.name,
    staffId: member.staffId,
    password: passwordHash,
    role: 'MEMBER' as const,
    status: 'ACTIVE' as const,
    phone: member.phone || null,
    department: null,
    monthlyContribution: member.monthlySavings,
    specialContribution: member.specialSavings,
    balance: 0,
    specialBalance: 0,
    voucherEnabled: true,
    createdAt,
  }))

  // hard-fail on duplicate emails or staff IDs before deleting anything
  const staffIdSet = new Set<string>()
  const emailSet = new Set<string>()
  for (const row of data) {
    if (staffIdSet.has(row.staffId || '')) throw new Error(`Duplicate Staff ID detected: ${row.staffId}`)
    staffIdSet.add(row.staffId || '')
    if (emailSet.has(row.email)) throw new Error(`Duplicate generated email detected: ${row.email}`)
    emailSet.add(row.email)
  }

  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.user.deleteMany({ where: { role: 'MEMBER' } })
    const created = await tx.user.createMany({ data })
    return { deletedMembers: deleted.count, createdMembers: created.count }
  })

  return NextResponse.json({
    ok: true,
    mode: 'replace',
    ...result,
    defaultMemberLogin: {
      emailPattern: `<staffId>@${(process.env.MEMBER_EMAIL_DOMAIN || 'faan-ummah.coop').trim().replace(/^@/, '')}`,
      password: passwordPlain,
    },
  })
}
