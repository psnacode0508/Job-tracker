export const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl || req.url;
  console.log(`[${timestamp}] ${req.method} ${path}`);
  next();
};

export default logger;
