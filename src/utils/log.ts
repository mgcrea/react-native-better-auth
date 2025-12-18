let debugEnabled = false;

export function setDebugEnabled(enabled: boolean) {
  debugEnabled = enabled;
}

export function log(message: string, data?: Record<string, unknown>) {
  if (debugEnabled) {
    console.log(`[better-auth] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
}
