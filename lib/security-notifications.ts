/**
 * Security Notification System — Real-time alerts for security events
 */

export type SecurityNotificationType =
  | 'new_login'
  | 'failed_login'
  | 'password_changed'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'record_accessed'
  | 'record_downloaded'
  | 'session_terminated'
  | 'suspicious_activity'
  | 'breach_detected'
  | 'account_locked'
  | 'ip_blocked'

export interface SecurityNotification {
  id: string
  userId: string
  type: SecurityNotificationType
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: string
  read: boolean
  metadata?: Record<string, any>
}

// In-memory notification store (per user)
const notifications = new Map<string, SecurityNotification[]>()
const MAX_NOTIFICATIONS = 100

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

/**
 * Create and store a security notification
 */
export function createNotification(
  userId: string,
  type: SecurityNotificationType,
  metadata?: Record<string, any>
): SecurityNotification {
  const templates: Record<SecurityNotificationType, { title: string; message: string; severity: SecurityNotification['severity'] }> = {
    new_login: { title: '🔑 New Login Detected', message: `New sign-in from ${metadata?.device || 'unknown device'} at ${metadata?.location || 'unknown location'}`, severity: 'info' },
    failed_login: { title: '⚠️ Failed Login Attempt', message: `${metadata?.attempts || 1} failed login attempt(s) from ${metadata?.ip || 'unknown IP'}`, severity: 'warning' },
    password_changed: { title: '🔐 Password Changed', message: 'Your password was successfully changed. If you did not do this, contact support immediately.', severity: 'info' },
    '2fa_enabled': { title: '🛡️ 2FA Enabled', message: 'Two-factor authentication has been enabled on your account.', severity: 'info' },
    '2fa_disabled': { title: '⚠️ 2FA Disabled', message: 'Two-factor authentication has been disabled. Your account is now less secure.', severity: 'warning' },
    record_accessed: { title: '📋 Record Accessed', message: `Medical record "${metadata?.recordName || 'Unknown'}" was accessed.`, severity: 'info' },
    record_downloaded: { title: '📥 Record Downloaded', message: `Medical record "${metadata?.recordName || 'Unknown'}" was downloaded.`, severity: 'warning' },
    session_terminated: { title: '🔒 Session Terminated', message: `A session was terminated from ${metadata?.device || 'another device'}.`, severity: 'warning' },
    suspicious_activity: { title: '🚨 Suspicious Activity', message: metadata?.reason || 'Unusual activity detected on your account.', severity: 'critical' },
    breach_detected: { title: '💀 Data Breach Alert', message: 'Your email was found in a known data breach. Change your password immediately.', severity: 'critical' },
    account_locked: { title: '🔒 Account Locked', message: 'Your account has been temporarily locked due to multiple failed login attempts.', severity: 'critical' },
    ip_blocked: { title: '🚫 IP Blocked', message: `Access from IP ${metadata?.ip || 'unknown'} has been blocked due to suspicious activity.`, severity: 'critical' },
  }

  const template = templates[type]
  const notification: SecurityNotification = {
    id: generateId(),
    userId,
    type,
    title: template.title,
    message: template.message,
    severity: template.severity,
    timestamp: new Date().toISOString(),
    read: false,
    metadata,
  }

  // Store
  const userNotifications = notifications.get(userId) || []
  userNotifications.unshift(notification)
  if (userNotifications.length > MAX_NOTIFICATIONS) userNotifications.pop()
  notifications.set(userId, userNotifications)

  // Log critical notifications
  if (notification.severity === 'critical') {
    console.warn(`🚨 [SECURITY ALERT] ${notification.title} — User: ${userId}`)
  }

  return notification
}

/**
 * Get notifications for a user
 */
export function getNotifications(userId: string, unreadOnly: boolean = false): SecurityNotification[] {
  const userNotifications = notifications.get(userId) || []
  return unreadOnly ? userNotifications.filter((n) => !n.read) : userNotifications
}

/**
 * Mark notification as read
 */
export function markAsRead(userId: string, notificationId: string): boolean {
  const userNotifications = notifications.get(userId) || []
  const notification = userNotifications.find((n) => n.id === notificationId)
  if (notification) {
    notification.read = true
    return true
  }
  return false
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(userId: string): number {
  const userNotifications = notifications.get(userId) || []
  let count = 0
  for (const n of userNotifications) {
    if (!n.read) { n.read = true; count++ }
  }
  return count
}

/**
 * Get unread count
 */
export function getUnreadCount(userId: string): number {
  return (notifications.get(userId) || []).filter((n) => !n.read).length
}

/**
 * Delete notification
 */
export function deleteNotification(userId: string, notificationId: string): boolean {
  const userNotifications = notifications.get(userId) || []
  const index = userNotifications.findIndex((n) => n.id === notificationId)
  if (index !== -1) {
    userNotifications.splice(index, 1)
    return true
  }
  return false
}
