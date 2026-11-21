import jwt from 'jsonwebtoken';

export const generateToken = (userId, role) => {
  const jwtSecret = process.env.JWT_SECRET || 'dev_telehealth_secret_key_change_in_prod';
  return jwt.sign({ id: userId, role }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};
