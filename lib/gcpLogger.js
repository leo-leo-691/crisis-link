let logger = null;
 
const initLogger = async () => {
  if (logger !== null) return logger;
  
  // Only attempt GCP logging if the explicit credentials path is set
  // This prevents errors when only using Gemini API keys
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    logger = false; // Mark as explicitly disabled
    return null;
  }

  try {
    const { Logging } = await import('@google-cloud/logging');
    const logging = new Logging();
    // Test instantiation - this is where the credentials error usually happens
    logger = logging.log('crisislink-events');
    console.log('[GCP Logger] Cloud Logging initialized');
  } catch (e) {
    console.warn('[GCP Logger] Initialization failed (likely missing credentials). Falling back to console.');
    logger = false; // Disable to prevent further attempts
  }
  return logger || null;
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

