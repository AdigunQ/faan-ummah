import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function GET(req: Request) {
  try {
    const secret = process.env.ADMIN_MAINTENANCE_SECRET?.trim()
    if (!secret) {
      return NextResponse.json({
        success: false,
        error: 'Maintenance endpoint disabled',
      }, { status: 503 })
    }

    const requestSecret = req.headers.get('x-admin-secret')?.trim()
    if (!requestSecret || requestSecret !== secret) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 })
    }

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
