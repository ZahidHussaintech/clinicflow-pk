import jwt from 'jsonwebtoken';

export function requireClinicAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required. Please sign in.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.clinicId = decoded.clinicId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
}
