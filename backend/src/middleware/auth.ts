import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, UserRole } from '../models';
import { AppError } from './errorHandler';

interface JwtPayload {
  id: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Prefer httpOnly cookie; fall back to Bearer token for API / testing clients
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.jwt;
  const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const token = cookieToken ?? headerToken;

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }

  const user = await User.findOne({ _id: payload.id, isActive: true });
  if (!user) {
    return next(new AppError('User not found or deactivated', 401));
  }

  req.user = user;
  next();
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Role '${req.user.role}' does not have permission for this action`,
          403
        )
      );
    }
    next();
  };
}
