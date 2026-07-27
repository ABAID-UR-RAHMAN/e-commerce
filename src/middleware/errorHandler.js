// src/middleware/errorHandler.js

function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500 
    ? 'Internal Server Error' 
    : err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = { errorHandler };
