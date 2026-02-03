export interface User {
  id: string
  name: string | null
  email: string
  role: 'ADMIN' | 'MEMBER'
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'
  phone: string | null
  department: string | null
  monthlyContribution: number
  balance: number
  totalContributions: number
  loanBalance: number
  image: string | null
  createdAt: Date
}

export interface Payment {
  id: string
  userId: string
  type: 'CONTRIBUTION' | 'LOAN_REPAYMENT' | 'SAVINGS' | 'REGISTRATION'
  amount: number
  date: Date
  proofImage: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  notes: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
  user?: User
}

export interface Loan {
  id: string
  userId: string
  amount: number
  purpose: string
  duration: number
  interestRate: number
  monthlyPayment: number | null
  totalRepayable: number | null
  balance: number
  notes: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  approvedBy: string | null
  approvedAt: Date | null
  createdAt: Date
  user?: User
  repayments?: Repayment[]
}

export interface Repayment {
  id: string
  loanId: string
  amount: number
  date: Date
  createdAt: Date
}

export interface Transaction {
  id: string
  userId: string
  type: 'CONTRIBUTION' | 'LOAN_DISBURSEMENT' | 'LOAN_REPAYMENT' | 'REGISTRATION' | 'SAVINGS' | 'WITHDRAWAL'
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  reference: string
  description: string | null
  createdAt: Date
  user?: User
}

export interface DashboardStats {
  totalMembers: number
  totalSavings: number
  activeLoans: number
  pendingApprovals: number
  totalLoanDisbursed: number
  monthlyContributions: number
}

export interface LoanCalculatorResult {
  principal: number
  interest: number
  totalRepayable: number
  monthlyPayment: number
  duration: number
}
