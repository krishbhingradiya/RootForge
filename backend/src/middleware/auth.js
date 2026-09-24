import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-enterprise-jwt-key-2026-solution-builder';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify and load live user role from database (Authoritative Source of Truth)
    try {
      const liveUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
          emailVerified: true
        }
      });

      if (!liveUser) {
        return res.status(401).json({ error: 'User account no longer exists. Please sign in again.' });
      }

      // Populate req.user with authoritative live database state
      req.user = {
        id: liveUser.id,
        email: liveUser.email,
        name: liveUser.name,
        role: liveUser.role,
        organizationId: liveUser.organizationId,
        emailVerified: liveUser.emailVerified
      };
    } catch (dbErr) {
      // In transient DB disconnects, gracefully fallback to valid verified JWT payload
      req.user = decoded;
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
      });
    }
    next();
  };
};

export const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

