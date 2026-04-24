const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'crisislink_secret_2025');
  if (!secret) {
    throw new Error('JWT_SECRET is required in production.');
  }
  return secret;
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    getSecret(),
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch (e) {
    return null;
  }
}

function getTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

function getUserFromRequest(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

module.exports = { generateToken, verifyToken, getTokenFromRequest, getUserFromRequest };
