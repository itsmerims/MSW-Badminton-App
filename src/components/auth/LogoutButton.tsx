'use client'

import { signOut } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const handleLogout = async () => {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <Button onClick={handleLogout} variant="outline" size="sm">
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </Button>
  )
}
