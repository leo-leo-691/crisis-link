let logger = null;
 
const initLogger = async () => {
  if (logger) return logger;
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GEMINI_API_KEY) {
      // In some environments, we might not have GCP logging but we still want console fallback
      const { Logging } = await import('@google-cloud/logging');
      const logging = new Logging();
      logger = logging.log('crisislink-events');
      console.log('[GCP Logger] Cloud Logging initialized');
    }
  } catch (e) {
    // Graceful fallback
  }
  return logger;
};
 
export async function logEvent(severity = 'INFO', message, metadata = {}) {
  try {
    const activeLogger = await initLogger();
    if (activeLogger) {
      const entry = activeLogger.entry({ severity }, {
        message,
        ...metadata,
        timestamp: new Date().toISOString(),
        service: 'crisislink',
      });
      // Fire-and-forget to avoid blocking the main request thread
      activeLogger.write(entry).catch((err) => {
        console.error('[GCP Logger] Failed to write entry:', err.message);
      });
    } else {
      const ts = new Date().toISOString().slice(11, 19);
      console.log(`[${ts}] [${severity}] ${message}`, Object.keys(metadata).length ? metadata : '');
    }
  } catch (e) {
    console.log(`[${severity}] ${message}`, metadata);
  }
}

