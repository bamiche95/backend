import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const JWT_EXPIRY = '7d'; // 7 days token expiry

export function generateToken(user) {
  // Create a token payload (avoid sensitive info like password)
  const payload = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    type: user.type,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
