'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { FileText, LayoutDashboard, LogOut, Menu, Settings, Shield, Users } from 'lucide-react'
import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/health-updates', label: 'Health Updates', icon: FileText },
    { href: '/admin/security', label: 'Security', icon: Shield },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ]

  const handleLogoutAdmin = async () => {
    await logout()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:flex w-64 bg-primary text-primary-foreground flex-col">
        <div className="p-6 border-b border-primary-foreground/20">
          <h2 className="text-xl font-bold">Admin Portal</h2>
          <p className="text-xs opacity-75 mt-1">Health Updates Manager</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`w-full justify-start text-primary-foreground ${
                    isActive ? 'bg-primary-foreground/20' : 'hover:bg-primary-foreground/10'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-primary-foreground/20">
          <Button
            onClick={() => void handleLogoutAdmin()}
            variant="ghost"
            className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 bg-primary text-primary-foreground p-4 z-40 flex items-center justify-between">
        <h2 className="font-bold">Admin Panel</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bottom-0 bg-primary text-primary-foreground p-4 z-30 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-primary-foreground">
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
