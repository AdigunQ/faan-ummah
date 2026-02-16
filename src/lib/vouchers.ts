import { prisma } from '@/lib/prisma'

export const VOUCHER_TITLE = 'LIST OF NAIA MULTIPUPOSE COOPERATIVES MEMBERS'
export const VOUCHER_CUTOFF_DAY = 15

export type VoucherRow = {
  serial: number
  staffId: string
  name: string
  monthlySavings: number
  specialSavings: number
  memberFee: number
  totalSavings: number
  memberType: 'NEW' | 'OLD'
}

export type VoucherDataset = {
  period: string
  start: Date
  end: Date
  rows: VoucherRow[]
  totals: {
    monthlySavings: number
    specialSavings: number
    fees: number
    totalSavings: number
    newMembers: number
    oldMembers: number
  }
}

export function resolveVoucherPeriod(periodInput?: string) {
  const fallback = new Date()
  const value = (periodInput || '').trim()
  const valid = /^\d{4}-\d{2}$/.test(value)
  const [year, month] = (valid ? value : `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}`)
    .split('-')
    .map(Number)

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const period = `${year}-${String(month).padStart(2, '0')}`

  return { period, start, end }
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function firstVoucherPeriodForCreatedAt(createdAt: Date): string {
  let year = createdAt.getUTCFullYear()
  let monthIndex = createdAt.getUTCMonth() // 0-11
  const day = createdAt.getUTCDate()

  // Rule: voucher prepared by the 15th. If registration is after 15th,
  // first voucher is next month.
  if (day > VOUCHER_CUTOFF_DAY) {
    monthIndex += 1
    if (monthIndex >= 12) {
      monthIndex = 0
      year += 1
    }
  }

  return `${year}-${pad2(monthIndex + 1)}`
}

export function isIncludedInVoucherPeriod(createdAt: Date, voucherPeriod: string): boolean {
  return firstVoucherPeriodForCreatedAt(createdAt) <= voucherPeriod
}

function createdMonthPeriod(createdAt: Date): string {
  return `${createdAt.getUTCFullYear()}-${pad2(createdAt.getUTCMonth() + 1)}`
}

export async function buildVoucherDataset(periodInput?: string): Promise<VoucherDataset> {
  const { period, start, end } = resolveVoucherPeriod(periodInput)

  const members = await prisma.user.findMany({
    where: {
      role: 'MEMBER',
      status: 'ACTIVE',
      voucherEnabled: true,
      OR: [{ monthlyContribution: { gt: 0 } }, { specialContribution: { gt: 0 } }],
    },
    select: {
      name: true,
      staffId: true,
      monthlyContribution: true,
      specialContribution: true,
      createdAt: true,
    },
    orderBy: [{ staffId: 'asc' }, { name: 'asc' }],
  })

  // Admin expectation: once a member is added, they appear immediately in
  // Member Data / Generate Report for the selected month.
  const rows: VoucherRow[] = members.map((member, index) => {
    const isNewMember = createdMonthPeriod(member.createdAt) === period
    const memberFee = isNewMember ? 1000 : 100
    const monthlySavings = member.monthlyContribution || 0
    const specialSavings = member.specialContribution || 0

    return {
      serial: index + 1,
      staffId: member.staffId || 'N/A',
      name: member.name || 'Unnamed Member',
      monthlySavings,
      specialSavings,
      memberFee,
      totalSavings: monthlySavings + specialSavings + memberFee,
      memberType: isNewMember ? 'NEW' : 'OLD',
    }
  })

  const totals = rows.reduce(
    (acc, row) => {
      acc.monthlySavings += row.monthlySavings
      acc.specialSavings += row.specialSavings
      acc.fees += row.memberFee
      acc.totalSavings += row.totalSavings
      if (row.memberType === 'NEW') acc.newMembers += 1
      else acc.oldMembers += 1
      return acc
    },
    { monthlySavings: 0, specialSavings: 0, fees: 0, totalSavings: 0, newMembers: 0, oldMembers: 0 }
  )

  return { period, start, end, rows, totals }
}

function escapeCsv(value: string | number): string {
  const raw = String(value ?? '')
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function buildVoucherCsv(dataset: VoucherDataset): string {
  const lines = [
    ['', '', VOUCHER_TITLE, ''],
    ['S/N', 'Staff ID', 'Name', 'Thrift Savings'],
    ...dataset.rows.map((row) => [row.serial, row.staffId, row.name, row.totalSavings]),
  ]

  return lines
    .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
    .join('\n')
}
