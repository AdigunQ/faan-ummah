import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const adminPassword = await bcrypt.hash('admin123', 10)
    const memberPassword = await bcrypt.hash('member123', 10)
    
    await prisma.user.upsert({
      where: { email: 'admin@coop.com' },
      update: {},
      create: {
        email: 'admin@coop.com',
        name: 'Administrator',
        password: adminPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    })
    
    await prisma.user.upsert({
      where: { email: 'member@example.com' },
      update: {},
      create: {
        email: 'member@example.com',
        name: 'Sample Member',
        password: memberPassword,
        role: 'MEMBER',
        status: 'ACTIVE',
        monthlyContribution: 10000,
      },
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database seeded successfully',
      users: ['admin@coop.com', 'member@example.com']
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
