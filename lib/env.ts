export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}

export function getJwtSecret(): string {
  return getRequiredEnv('JWT_SECRET')
}

export function getJwtRefreshSecret(): string {
  return getRequiredEnv('JWT_REFRESH_SECRET')
}
