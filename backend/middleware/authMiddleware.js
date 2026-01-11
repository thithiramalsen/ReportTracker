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
    // Attach user info (include code and name for convenience)
    const user = await User.findById(decoded.id).select('role code name');
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = { id: user._id, role: user.role, code: user.code, name: user.name };
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
