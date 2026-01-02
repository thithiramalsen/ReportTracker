const util = require('util');

function maskSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    if (/password|pwd|secret|token/i.test(k)) copy[k] = '[REDACTED]';
    else if (typeof obj[k] === 'object') copy[k] = maskSensitive(obj[k]);
    else copy[k] = obj[k];
  }
  return copy;
}

module.exports = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip, query } = req;
  const body = maskSensitive(req.body);
  console.log(`[REQ] ${method} ${originalUrl} - IP:${ip} - Query:${util.inspect(query, { depth: 1 })} - Body:${util.inspect(body, { depth: 1 })}`);

  const onFinish = () => {
    const ms = Date.now() - start;
    console.log(`[RES] ${method} ${originalUrl} - ${res.statusCode} ${res.statusMessage || ''} - ${ms}ms`);
  };

  res.on('finish', onFinish);
  res.on('close', onFinish);
  next();
};
