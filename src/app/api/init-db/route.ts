import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function GET() {
  try {
    // Run db push
    execSync('npx prisma db push --accept-data-loss', {
      cwd: process.cwd(),
      stdio: 'pipe',
    })
    
    // Run seed
    execSync('npm run db:seed', {
      cwd: process.cwd(),
      stdio: 'pipe',
    })
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
