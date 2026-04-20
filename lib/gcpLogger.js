let logger = null;

try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const { Logging } = require('@google-cloud/logging');
    const logging = new Logging();
    logger = logging.log('crisislink-events');
    console.log('[GCP Logger] Cloud Logging enabled');
  }
} catch (e) {
  // Graceful fallback — no GCP credentials
}

async function logEvent(severity = 'INFO', message, metadata = {}) {
  try {
    if (logger) {
      const entry = logger.entry({ severity }, {
        message,
        ...metadata,
        timestamp: new Date().toISOString(),
        service: 'crisislink',
      });
      await logger.write(entry);
    } else {
      const ts = new Date().toISOString().slice(11, 19);
      console.log(`[${ts}] [${severity}] ${message}`, Object.keys(metadata).length ? metadata : '');
    }
  } catch (e) {
    console.log(`[${severity}] ${message}`, metadata);
  }
}

module.exports = { logEvent };
