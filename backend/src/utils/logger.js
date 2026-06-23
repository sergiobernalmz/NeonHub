const { Logtail } = require("@logtail/node");

const SOURCE_TOKEN = process.env.BETTER_STACK_SOURCE_TOKEN;
const logtail = SOURCE_TOKEN ? new Logtail(SOURCE_TOKEN) : null;

const logger = {
  info: (message, context = {}) => {
    console.log(`[INFO] ${message}`, Object.keys(context).length ? context : "");
    if (logtail) {
      logtail.info(message, context);
    }
  },

  error: (message, context = {}) => {
    const logContext = context instanceof Error
      ? { message: context.message, stack: context.stack, ...context }
      : context;

    console.error(`[ERROR] ${message}`, logContext);
    if (logtail) {
      logtail.error(message, logContext);
    }
  },

  warn: (message, context = {}) => {
    console.warn(`[WARN] ${message}`, context);
    if (logtail) {
      logtail.warn(message, context);
    }
  },

  debug: (message, context = {}) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, context);
    }
    if (logtail) {
      logtail.debug(message, context);
    }
  },

  stream: {
    write: (message) => {
      const cleanMessage = message.trim();
      logger.info(cleanMessage, { type: 'http' });
    }
  }
};

module.exports = logger;
