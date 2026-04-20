const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'crisislink_secret_2025';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
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
