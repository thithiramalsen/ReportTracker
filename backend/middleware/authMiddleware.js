const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = {};

authMiddleware.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user info
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

authMiddleware.requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'No user info' });
  if (req.user.role !== role) return res.status(403).json({ message: 'Forbidden' });
  next();
};

module.exports = authMiddleware;
