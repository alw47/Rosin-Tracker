import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { db } from './db';
import { users, userSessions, type User, type UserSession } from '@shared/schema';
import { eq, and, gte, lt } from 'drizzle-orm';

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export class AuthService {
  // Password utilities
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Secure token generation
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Account lockout management
  static async isAccountLocked(user: User): Promise<boolean> {
    return user.lockedUntil !== null && new Date() < user.lockedUntil;
  }

  static async incrementFailedAttempts(userId: number): Promise<void> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0]) return;

    const attempts = (user[0].failedLoginAttempts || 0) + 1;
    const updates: any = { failedLoginAttempts: attempts };

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updates.lockedUntil = new Date(Date.now() + LOCKOUT_TIME);
    }

    await db.update(users).set(updates).where(eq(users.id, userId));
  }

  static async resetFailedAttempts(userId: number): Promise<void> {
    await db.update(users).set({
      failedLoginAttempts: 0,
      lockedUntil: null
    }).where(eq(users.id, userId));
  }

  // User management
  static async createUser(email: string, password: string): Promise<User> {
    const passwordHash = await this.hashPassword(password);
    const emailVerificationToken = this.generateSecureToken();
    const emailVerificationExpiry = new Date(Date.now() + TOKEN_EXPIRY);

    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      emailVerificationToken,
      emailVerificationExpiry,
      isEmailVerified: false,
      twoFactorEnabled: false,
      failedLoginAttempts: 0
    }).returning();

    return user;
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user || null;
  }

  static async findUserById(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  }

  // Session management
  static async createSession(userId: number, ipAddress?: string, userAgent?: string): Promise<UserSession> {
    const sessionId = uuidv4();
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    const [session] = await db.insert(userSessions).values({
      id: sessionId,
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent
    }).returning();

    return session;
  }

  static async findValidSession(token: string): Promise<{ session: UserSession; user: User } | null> {
    const [sessionWithUser] = await db
      .select({
        session: userSessions,
        user: users
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          eq(userSessions.token, token),
          gte(userSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    return sessionWithUser || null;
  }

  static async deleteSession(token: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.token, token));
  }

  static async deleteAllUserSessions(userId: number): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.userId, userId));
  }

  static async cleanupExpiredSessions(): Promise<void> {
    await db.delete(userSessions).where(lt(userSessions.expiresAt, new Date()));
  }

  // 2FA Management
  static async setup2FA(userId: number): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.findUserById(userId);
    if (!user) throw new Error('User not found');

    const secret = speakeasy.generateSecret({
      name: `Rosin Tracker (${user.email})`,
      issuer: 'Rosin Tracker'
    });

    // Store the secret temporarily (not enabled until verified)
    await db.update(users).set({
      twoFactorSecret: secret.base32
    }).where(eq(users.id, userId));

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCodeUrl
    };
  }

  static async verify2FASetup(userId: number, code: string): Promise<boolean> {
    const user = await this.findUserById(userId);
    if (!user || !user.twoFactorSecret) return false;

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (verified) {
      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      await db.update(users).set({
        twoFactorEnabled: true,
        backupCodes
      }).where(eq(users.id, userId));

      return true;
    }

    return false;
  }

  static async verify2FA(userId: number, code: string): Promise<boolean> {
    const user = await this.findUserById(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) return false;

    // Check TOTP code
    const totpValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (totpValid) return true;

    // Check backup codes
    if (user.backupCodes && user.backupCodes.includes(code.toUpperCase())) {
      // Remove used backup code
      const updatedCodes = user.backupCodes.filter(c => c !== code.toUpperCase());
      await db.update(users).set({
        backupCodes: updatedCodes
      }).where(eq(users.id, userId));

      return true;
    }

    return false;
  }

  static async disable2FA(userId: number, code: string): Promise<boolean> {
    const isValid = await this.verify2FA(userId, code);
    if (!isValid) return false;

    await db.update(users).set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null
    }).where(eq(users.id, userId));

    return true;
  }

  // Email verification
  static async verifyEmail(token: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.emailVerificationToken, token),
          gte(users.emailVerificationExpiry!, new Date())
        )
      )
      .limit(1);

    if (!user) return false;

    await db.update(users).set({
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null
    }).where(eq(users.id, user.id));

    return true;
  }

  // Password reset
  static async initiatePasswordReset(email: string): Promise<string | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return null;

    const resetToken = this.generateSecureToken();
    const resetExpiry = new Date(Date.now() + TOKEN_EXPIRY);

    await db.update(users).set({
      passwordResetToken: resetToken,
      passwordResetExpiry: resetExpiry
    }).where(eq(users.id, user.id));

    return resetToken;
  }

  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          gte(users.passwordResetExpiry!, new Date())
        )
      )
      .limit(1);

    if (!user) return false;

    const passwordHash = await this.hashPassword(newPassword);

    await db.update(users).set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      failedLoginAttempts: 0,
      lockedUntil: null
    }).where(eq(users.id, user.id));

    // Delete all existing sessions
    await this.deleteAllUserSessions(user.id);

    return true;
  }

  // Update user login timestamp
  static async updateLastLogin(userId: number): Promise<void> {
    await db.update(users).set({
      lastLoginAt: new Date()
    }).where(eq(users.id, userId));
  }

  // Check if email/username is available
  static async isEmailAvailable(email: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return !user;
  }
}