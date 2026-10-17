// src/middleware/logger.js

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status < 400 ? '🟢' : status < 500 ? '🟡' : '🔴';
    console.log(
      `[${timestamp}] ${statusEmoji} ${req.method} ${req.originalUrl} -> ${status} (${duration}ms)`
    );
  });

  next();
};

module.exports = requestLogger;
