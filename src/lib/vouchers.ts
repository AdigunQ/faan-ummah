import { prisma } from '@/lib/prisma'

export const VOUCHER_TITLE = 'LIST OF NAIA MULTIPUPOSE COOPERATIVES MEMBERS'

export type VoucherRow = {
  serial: number
  staffId: string
  name: string
  monthlySavings: number
  memberFee: number
  thriftSavings: number
  memberType: 'NEW' | 'OLD'
}

export type VoucherDataset = {
  period: string
  start: Date
  end: Date
  rows: VoucherRow[]
  totals: {
    monthlySavings: number
    fees: number
    thriftSavings: number
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

export async function buildVoucherDataset(periodInput?: string): Promise<VoucherDataset> {
  const { period, start, end } = resolveVoucherPeriod(periodInput)

  const members = await prisma.user.findMany({
    where: {
      role: 'MEMBER',
      status: 'ACTIVE',
      voucherEnabled: true,
      monthlyContribution: { gt: 0 },
    },
    select: {
      name: true,
      staffId: true,
      monthlyContribution: true,
      createdAt: true,
    },
    orderBy: [{ staffId: 'asc' }, { name: 'asc' }],
  })

  const rows: VoucherRow[] = members.map((member, index) => {
    const isNewMember = member.createdAt >= start && member.createdAt < end
    const memberFee = isNewMember ? 1000 : 100
    const monthlySavings = member.monthlyContribution || 0

    return {
      serial: index + 1,
      staffId: member.staffId || 'N/A',
      name: member.name || 'Unnamed Member',
      monthlySavings,
      memberFee,
      thriftSavings: monthlySavings + memberFee,
      memberType: isNewMember ? 'NEW' : 'OLD',
    }
  })

  const totals = rows.reduce(
    (acc, row) => {
      acc.monthlySavings += row.monthlySavings
      acc.fees += row.memberFee
      acc.thriftSavings += row.thriftSavings
      if (row.memberType === 'NEW') acc.newMembers += 1
      else acc.oldMembers += 1
      return acc
    },
    { monthlySavings: 0, fees: 0, thriftSavings: 0, newMembers: 0, oldMembers: 0 }
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
    ...dataset.rows.map((row) => [row.serial, row.staffId, row.name, row.thriftSavings]),
  ]

  return lines
    .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
    .join('\n')
}
