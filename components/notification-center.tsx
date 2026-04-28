'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'appointment' | 'alert' | 'record' | 'vaccination' | 'news'
  timestamp: Date
  read: boolean
  actionUrl?: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const persistNotifications = (nextNotifications: Notification[]) => {
    setNotifications(nextNotifications)
    setUnreadCount(nextNotifications.filter((n: Notification) => !n.read).length)
    localStorage.setItem('portalNotifications', JSON.stringify(nextNotifications))
  }

  useEffect(() => {
    // Load notifications from localStorage
    const storedNotifications = localStorage.getItem('portalNotifications')
    if (storedNotifications) {
      const parsed = JSON.parse(storedNotifications)
      const withDates = parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }))
      setNotifications(withDates)
      setUnreadCount(withDates.filter((n: Notification) => !n.read).length)
    }

    // Simulate real-time notifications
    const interval = setInterval(() => {
      const randomNotifications: Notification[] = [
        {
          id: `notif_${Date.now()}`,
          title: 'Vaccination Record Updated',
          message: 'Your flu vaccination record has been updated',
          type: 'vaccination',
          timestamp: new Date(),
          read: false
        },
        {
          id: `notif_${Date.now() + 1}`,
          title: 'Health Advisory',
          message: 'New health advisory released by Department of Health',
          type: 'news',
          timestamp: new Date(),
          read: false
        }
      ]

      // Randomly add a notification (5% chance every 30 seconds)
      if (Math.random() < 0.05) {
        const newNotif = randomNotifications[Math.floor(Math.random() * randomNotifications.length)]
        setNotifications(prev => {
          const nextNotifications = [newNotif, ...prev].slice(0, 20)
          setUnreadCount(nextNotifications.filter((n: Notification) => !n.read).length)
          localStorage.setItem('portalNotifications', JSON.stringify(nextNotifications))
          return nextNotifications
        })
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const markAsRead = (id: string) => {
    const nextNotifications = notifications.map(n => n.id === id ? { ...n, read: true } : n)
    persistNotifications(nextNotifications)
  }

  const clearNotification = (id: string) => {
    const nextNotifications = notifications.filter(n => n.id !== id)
    persistNotifications(nextNotifications)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'appointment': return 'bg-primary/10 text-primary'
      case 'alert': return 'bg-destructive/10 text-destructive'
      case 'record': return 'bg-secondary/10 text-secondary'
      case 'vaccination': return 'bg-accent/10 text-accent'
      case 'news': return 'bg-blue-500/10 text-blue-600'
      default: return 'bg-muted'
    }
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-lg shadow-lg z-50"
          role="dialog"
          aria-label="Notifications panel"
          aria-modal="false"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold" id="notifications-title">Notifications</h3>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto" role="list" aria-labelledby="notifications-title">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-3 hover:bg-muted/30 transition-colors cursor-pointer ${
                      !notif.read ? 'bg-muted/10' : ''
                    }`}
                    onClick={() => markAsRead(notif.id)}
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        markAsRead(notif.id)
                      }
                    }}
                    aria-label={`${notif.read ? 'Read' : 'Unread'} notification: ${notif.title}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{notif.title}</h4>
                          <Badge className={`text-xs ${getTypeColor(notif.type)}`}>
                            {notif.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notif.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          clearNotification(notif.id)
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        aria-label={`Remove ${notif.title} notification`}
                      >
                        <X className="w-3 h-3" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-border text-center">
              <Button
                onClick={() => {
                  setNotifications([])
                  setUnreadCount(0)
                  localStorage.removeItem('portalNotifications')
                }}
                variant="ghost"
                size="sm"
                className="text-xs"
                aria-label="Clear all notifications"
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
