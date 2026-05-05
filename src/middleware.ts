import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|mswlogo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
