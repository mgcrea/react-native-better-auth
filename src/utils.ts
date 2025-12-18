let debugEnabled = false;

/**
 * Enable or disable debug logging
 */
export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

/**
 * Check if debug logging is enabled
 */
export function isDebugEnabled(): boolean {
  return debugEnabled;
}

/**
 * Log a debug message with optional data
 */
export function log(message: string, data?: Record<string, unknown>): void {
  if (!debugEnabled) return;

  const prefix = "[react-native-better-auth]";
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}
