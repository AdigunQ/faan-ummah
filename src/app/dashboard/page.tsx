import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { MemberDashboard } from '@/components/dashboard/member-dashboard'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Get user data
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      loans: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!user) {
    redirect('/login')
  }

  if (session.user.role === 'ADMIN') {
    // Get admin stats
    const [
      totalMembers,
      totalSavings,
      activeLoans,
      pendingMembers,
      pendingPayments,
      pendingLoans,
      recentTransactions,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'MEMBER' } }),
      prisma.user.aggregate({
        where: { role: 'MEMBER' },
        _sum: { balance: true },
      }),
      prisma.loan.count({
        where: { status: 'APPROVED', balance: { gt: 0 } },
      }),
      prisma.user.count({ where: { role: 'MEMBER', status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.loan.count({ where: { status: 'PENDING' } }),
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
    ])

    const stats = {
      totalMembers,
      totalSavings: totalSavings._sum.balance || 0,
      activeLoans,
      pendingApprovals: pendingMembers + pendingPayments + pendingLoans,
      pendingMembers,
      pendingPayments,
      pendingLoans,
    }

    return <AdminDashboard stats={stats} recentTransactions={recentTransactions} />
  }

  // Member dashboard data
  const loanEligibility = user.totalContributions * 3

  return (
    <MemberDashboard
      user={user}
      loanEligibility={loanEligibility}
      recentPayments={user.payments}
      recentLoans={user.loans}
    />
  )
}
