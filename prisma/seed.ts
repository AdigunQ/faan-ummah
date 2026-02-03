import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@coop.com' },
    update: {},
    create: {
      email: 'admin@coop.com',
      name: 'Administrator',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      department: 'Administration',
      phone: '+2348000000000',
    },
  })

  console.log('✅ Admin user created:', admin.email)
  
  // Create sample member
  const memberPassword = await bcrypt.hash('member123', 10)
  
  const member = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: {
      email: 'member@example.com',
      name: 'John Doe',
      password: memberPassword,
      role: 'MEMBER',
      status: 'ACTIVE',
      department: 'Operations',
      phone: '+2348012345678',
      monthlyContribution: 20000,
      balance: 100000,
      totalContributions: 100000,
    },
  })

  console.log('✅ Sample member created:', member.email)
  console.log('\n🎉 Database seeded successfully!')
  console.log('\nLogin credentials:')
  console.log('Admin: admin@coop.com / admin123')
  console.log('Member: member@example.com / member123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
