import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { config } from '../config';
import { sendSuccess, sendCreated } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

function signToken(id: string, role: string): string {
  return jwt.sign({ id, role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function attachTokenCookie(res: Response, token: string): void {
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: config.JWT_COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterInput;

  const existing = await User.findOne({ email: body.email });
  if (existing) throw new AppError('Email already in use', 409);

  const user = await User.create(body);
  const token = signToken(user.id as string, user.role);
  attachTokenCookie(res, token);

  sendCreated(res, { user, token });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;

  const user = await User.findOne({ email, isActive: true }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user.id as string, user.role);
  attachTokenCookie(res, token);

  sendSuccess(res, { user: user.toJSON(), token });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
  sendSuccess(res, null);
}

export async function getMe(req: Request, res: Response): Promise<void> {
  sendSuccess(res, { user: req.user });
}
