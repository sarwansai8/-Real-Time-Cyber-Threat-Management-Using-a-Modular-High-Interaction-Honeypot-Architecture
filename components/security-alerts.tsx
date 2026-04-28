'use client'

import { useState, useEffect } from 'react'
import { Bell, BellRing, Check, Shield, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Notification {
  id: string; type: string; title: string; message: string
  severity: 'info' | 'warning' | 'critical'; timestamp: string; read: boolean
}

export function SecurityAlerts({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    // Load from localStorage or API
    const stored = localStorage.getItem(`security_notifications_${userId || 'default'}`)
    if (stored) {
      try { setNotifications(JSON.parse(stored)) } catch {}
    }

    // Demo notifications
    if (!stored) {
      setNotifications([
        { id: '1', type: 'new_login', title: '🔑 New Login Detected', message: 'New sign-in from Chrome on Windows', severity: 'info', timestamp: new Date().toISOString(), read: false },
        { id: '2', type: 'failed_login', title: '⚠️ Failed Login Attempt', message: '3 failed login attempts detected', severity: 'warning', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
      ])
    }
  }, [userId])

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const severityColor = (s: string) => {
    if (s === 'critical') return 'border-red-500 bg-red-50 dark:bg-red-950/20'
    if (s === 'warning') return 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
    return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-lg hover:bg-accent transition-colors">
        {unreadCount > 0 ? <BellRing className="h-5 w-5 text-orange-500 animate-bounce" /> : <Bell className="h-5 w-5" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-96 max-h-96 overflow-y-auto bg-background border rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="font-semibold text-sm">Security Alerts</span>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-accent rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No security alerts</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 border-b border-l-4 hover:bg-accent/50 transition-colors ${severityColor(n.severity)} ${n.read ? 'opacity-60' : ''}`}
                onClick={() => markAsRead(n.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{n.title}</span>
                      {!n.read && <span className="h-2 w-2 bg-blue-500 rounded-full" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeNotification(n.id) }} className="p-1 hover:bg-destructive/20 rounded">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
