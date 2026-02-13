'use server'

import { getServerSession } from 'next-auth/next'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function canUsePartialWithdrawal(status: string, partialWithdrawalUsed: boolean) {
  return status === 'ACTIVE' && !partialWithdrawalUsed
}

export async function submitWithdrawalRequest(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const source = String(formData.get('source') || 'MONTHLY_SAVINGS')
  const requestedAmount = Number(formData.get('requestedAmount') || 0)
  const reason = String(formData.get('reason') || '').trim()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) return { error: 'User not found' }

  // Logic for Monthly vs Special
  let maxAllowed = 0
  if (source === 'MONTHLY_SAVINGS') {
    if (!canUsePartialWithdrawal(user.status, user.partialWithdrawalUsed)) {
      return { error: 'Partial withdrawal limit reached for Monthly Savings.' }
    }
    maxAllowed = user.balance * 0.7
  } else {
    // Special Savings - 100% allowed
    maxAllowed = user.specialBalance
  }

  if (requestedAmount <= 0 || requestedAmount > maxAllowed) {
    return { error: `Invalid amount. Max allowed: ${maxAllowed}` }
  }

  // Check pending requests
  const pending = await prisma.withdrawal.findFirst({
    where: { userId: user.id, status: 'PENDING' }
  })
  if (pending) return { error: 'You already have a pending request.' }

  await prisma.withdrawal.create({
    data: {
      userId: user.id,
      type: 'PARTIAL', // We treat both as partial for now logic-wise
      source: source as 'MONTHLY_SAVINGS' | 'SPECIAL_SAVINGS',
      requestedAmount,
      maxAllowedAtRequest: maxAllowed,
      reason,
      status: 'PENDING',
      useProfileBank: true,
      payoutBankName: user.bankName,
      payoutAccountNumber: user.bankAccountNumber,
      payoutAccountName: user.bankAccountName,
    },
  })

  revalidatePath('/dashboard/withdrawals')
  return { success: true }
}
