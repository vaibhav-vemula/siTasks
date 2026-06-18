type Level = 'info' | 'warn' | 'error' | 'debug'

const ICONS: Record<Level, string> = {
  info:  'ℹ️ ',
  warn:  '⚠️ ',
  error: '❌',
  debug: '🔍',
}

function log(level: Level, feature: string, message: string, data?: unknown) {
  const prefix = `${ICONS[level]} [${feature}]`
  if (data !== undefined) {
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}`, data)
  } else {
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}`)
  }
}

export const logger = {
  info:  (feature: string, msg: string, data?: unknown) => log('info',  feature, msg, data),
  warn:  (feature: string, msg: string, data?: unknown) => log('warn',  feature, msg, data),
  error: (feature: string, msg: string, data?: unknown) => log('error', feature, msg, data),
  debug: (feature: string, msg: string, data?: unknown) => log('debug', feature, msg, data),
}
