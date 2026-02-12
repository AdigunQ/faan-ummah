import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const registerPayloadSchema = z.object({
  name: z.string().trim().min(1),
  staffId: z.string().trim().min(1).regex(/^[a-zA-Z0-9-]+$/),
  email: z.string().trim().min(1).email(),
  phone: z.string().trim().min(1),
  department: z.string().trim().min(1),
  bankName: z.string().trim().min(1),
  bankAccountNumber: z.string().trim().min(10).max(20),
  bankAccountName: z.string().trim().min(2),
  monthlyContribution: z.number().gt(0),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  try {
    const parsed = registerPayloadSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid registration details. Please check all required fields.' },
        { status: 400 }
      )
    }

    const {
      name,
      staffId,
      email,
      phone,
      department,
      bankName,
      bankAccountNumber,
      bankAccountName,
      monthlyContribution,
      password,
    } = parsed.data

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedStaffId = staffId.trim().toUpperCase()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    const existingStaffId = await prisma.user.findUnique({
      where: { staffId: normalizedStaffId },
    })

    if (existingStaffId) {
      return NextResponse.json(
        { error: 'Staff ID already registered' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const now = new Date()
    const effectiveStartDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        staffId: normalizedStaffId,
        phone,
        department,
        bankName,
        bankAccountNumber,
        bankAccountName,
        monthlyContribution,
        password: hashedPassword,
        role: 'MEMBER',
        status: 'PENDING',
        balance: 0,
        totalContributions: 0,
        loanBalance: 0,
      },
    })

    await prisma.voucher.create({
      data: {
        userId: user.id,
        fullName: user.name || 'Unnamed Member',
        staffId: normalizedStaffId,
        department,
        monthlyDeduction: monthlyContribution,
        effectiveStartDate,
        status: 'GENERATED',
        notes: 'Auto-generated at member registration. Queued for Finance inbox.',
      },
    })

    return NextResponse.json(
      { 
        message: 'Registration successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          staffId: user.staffId,
          status: user.status,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
