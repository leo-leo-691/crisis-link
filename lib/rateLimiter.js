const rateLimitMap = new Map();

function isRateLimited(ip, limit = 5, windowMs = 60000) {
  const current = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetAt: current + windowMs });
    return false;
  }
  
  const data = rateLimitMap.get(ip);
  if (current > data.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: current + windowMs });
    return false;
  }
  
  if (data.count >= limit) {
    return true;
  }
  
  data.count += 1;
  return false;
}

module.exports = { isRateLimited };
