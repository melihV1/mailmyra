import { PRICING } from '@mailmyra/core';
import { Prisma } from '@prisma/client';

import { prisma } from '../db';
import type { Mailer } from '../mail';
import { emailChangeVerifyEmail, emailChangedNoticeEmail, resetEmail, verifyEmail } from '../mail';
import {
  checkPasswordPolicy,
  hashPassword,
  verifyPassword,
  verifyPasswordAgainstMaybeHash,
} from './password';
import { clearAttempts, consumeAttempt } from './rate-limit';
import { createSession, revokeAllSessionsForUser } from './session';
import { hashToken, newSessionToken } from './token';

/**
 * Kayıt · giriş · doğrulama · sıfırlama.
 *
 * HTTP burada yok: akışlar saf girdi alır, sonuç döner, e-postayı verilen
 * `Mailer`a yazar. Route handler'lar bunların ince sargısı — böylece bütün
 * davranış gerçek veritabanına karşı, sunucu ayağa kaldırılmadan test
 * ediliyor (`test-db/auth-flows.test.ts`).
 */

/** Linklerin tabanı. Prod: `https://app.mailmyra.com`. */
function appUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // spec §6: 24 saat
const RESET_TTL_MS = 60 * 60 * 1000; // spec §6: 1 saat
const TRIAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün kartsız deneme
const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000; // doğrulama ile aynı süre

// Amaç adres doğrulamak değil — gerçek doğrulama zaten gönderilen e-posta.
// Bu yalnız bariz yazım hatasını formda yakalar.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function issueEmailToken(
  userId: string,
  type: 'verify' | 'reset',
  ttlMs: number,
): Promise<string> {
  const token = newSessionToken();
  await prisma.emailToken.create({
    data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

// ─── Kayıt ───────────────────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  orgName: string;
  /** Kabul edilen şartlar sürümü — `LegalAcceptance` kanıt kaydına gider. */
  termsVersion: string;
  ip: string;
}

export type RegisterResult =
  | { ok: true; sessionToken: string; verificationMailSent: boolean }
  | { ok: false; reason: 'invalid_email' | 'weak_password' | 'email_taken' };

export async function register(input: RegisterInput, mailer: Mailer): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  if (!EMAIL_SHAPE.test(email)) return { ok: false, reason: 'invalid_email' };

  const policy = checkPasswordPolicy(input.password);
  if (!policy.ok) return { ok: false, reason: 'weak_password' };

  const passwordHash = await hashPassword(input.password);

  let userId: string;
  try {
    // Kullanıcı, org'u, üyelik ve kabul kaydı tek transaction'da: yarısı
    // yazılmış bir kayıt (org'suz kullanıcı) panelde açılamayan hesap demek.
    userId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, passwordHash } });
      const org = await tx.organization.create({
        data: {
          name: input.orgName.trim() || 'Workspace',
          entitlementState: 'trial',
          // Deneme 5 koltukla başlar (karar: 2026-08-11) — iş sabiti tek
          // kaynakta: core/pricing. Şemadaki default(1) güvenlik tabanı.
          entitledSeats: PRICING.trialSeats,
          trialEndsAt: new Date(Date.now() + TRIAL_MS),
        },
      });
      await tx.membership.create({ data: { userId: user.id, orgId: org.id, role: 'owner' } });
      await tx.legalAcceptance.create({
        data: { userId: user.id, orgId: org.id, docType: 'terms', version: input.termsVersion, ip: input.ip },
      });
      return user.id;
    });
  } catch (error) {
    // Mükerrer e-posta: collation harf duyarsız olduğu için "Ali@" de çarpar.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, reason: 'email_taken' };
    }
    throw error;
  }

  const token = await issueEmailToken(userId, 'verify', VERIFY_TTL_MS);
  // Hesap yukarıda commit'lendi; mail arızası onu geri alamaz. Eskiden
  // buradaki fırlatma 500 oluyordu ve oturum da açılmıyordu — tekrar deneyen
  // kullanıcı email_taken duvarına çarpıyordu. Kaçış yolu paneldeki doğrulama
  // şeridi + "yeniden gönder"; arıza yine de log'a düşer, sessiz kalınmaz.
  let verificationMailSent = true;
  try {
    await mailer.send({
      to: email,
      ...verifyEmail({ actionUrl: `${appUrl()}/verify-email?token=${token}` }),
    });
  } catch (error) {
    verificationMailSent = false;
    console.error('[mail] doğrulama maili gönderilemedi:', error);
  }

  const session = await createSession(userId, { ip: input.ip });
  return { ok: true, sessionToken: session.token, verificationMailSent };
}

// ─── Giriş ───────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
  ip: string;
  userAgent?: string;
}

export type LoginResult =
  | { ok: true; sessionToken: string }
  | { ok: false; reason: 'invalid_credentials' }
  | { ok: false; reason: 'rate_limited'; retryAfterSeconds: number };

export async function login(input: LoginInput): Promise<LoginResult> {
  const email = normalizeEmail(input.email);

  // Sayaç ip+email üzerinden: yalnız e-posta olsaydı saldırgan hedefini
  // kilitleyebilirdi, yalnız IP olsaydı ofisteki herkes birbirini kilitlerdi.
  // Sayaç şifre kontrolünden ÖNCE — reddedilen denemede scrypt hiç koşmaz.
  const key = `login:${input.ip}|${email}`;
  const budget = await consumeAttempt(key);
  if (!budget.allowed) {
    return { ok: false, reason: 'rate_limited', retryAfterSeconds: budget.retryAfterSeconds };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Kullanıcı yokken de aynı iş yanar — süre farkı "bu e-posta kayıtlı mı"
  // sorusunu yanıtlamasın (bkz. password.ts).
  const valid = await verifyPasswordAgainstMaybeHash(input.password, user?.passwordHash);
  if (!user || !valid) return { ok: false, reason: 'invalid_credentials' };

  await clearAttempts(key);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const session = await createSession(user.id, { ip: input.ip, userAgent: input.userAgent });
  return { ok: true, sessionToken: session.token };
}

// ─── E-posta doğrulama ───────────────────────────────────────────────────

export type TokenResult = { ok: true } | { ok: false; reason: 'invalid_token' };

export async function verifyEmailToken(token: string): Promise<TokenResult> {
  const record = await prisma.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== 'verify' || record.usedAt || record.expiresAt <= new Date()) {
    // Tek sebep, tek cevap: "süresi geçti" ile "hiç yoktu"yu ayırt ettirmek
    // token tahmin eden birine ilerleme bildirimi olurdu.
    return { ok: false, reason: 'invalid_token' };
  }

  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return { ok: true };
}

export type ResendResult =
  | { ok: true }
  | { ok: false; reason: 'already_verified' }
  | { ok: false; reason: 'rate_limited'; retryAfterSeconds: number };

/**
 * Doğrulama e-postasını yeniden gönderir — paneldeki "doğrula" şeridinin
 * düğmesi. Oturum gerektirir (uç `userId`yi oturumdan alır) ama kendi
 * hesabına sınırsız gönderim SMTP itibarımızı yakar; sayaç kullanıcı başına.
 */
export async function resendVerification(userId: string, mailer: Mailer): Promise<ResendResult> {
  const budget = await consumeAttempt(`verify-resend:${userId}`, { limit: 3 });
  if (!budget.allowed) {
    return { ok: false, reason: 'rate_limited', retryAfterSeconds: budget.retryAfterSeconds };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) return { ok: false, reason: 'already_verified' };

  const token = await issueEmailToken(userId, 'verify', VERIFY_TTL_MS);
  await mailer.send({
    to: user.email,
    ...verifyEmail({ actionUrl: `${appUrl()}/verify-email?token=${token}` }),
  });
  return { ok: true };
}

// ─── E-posta adresi değişimi ─────────────────────────────────────────────

export type EmailChangeRequestResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_email' | 'email_taken' | 'invalid_credentials' };

/**
 * Hesap sayfasından: "adresimi değiştir". Doğrulama YENİ adrese gider —
 * eski adres onaya kadar hiç değişmez (bkz. `confirmEmailChange`).
 */
export async function requestEmailChange(
  userId: string,
  input: { newEmail: string; password: string },
  mailer: Mailer,
): Promise<EmailChangeRequestResult> {
  const email = normalizeEmail(input.newEmail);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  // Adres hesabın anahtarı — değişiklik yeniden kimlik doğrulaması ister.
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    return { ok: false, reason: 'invalid_credentials' };
  }
  if (!EMAIL_SHAPE.test(email) || email === user.email) {
    return { ok: false, reason: 'invalid_email' };
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return { ok: false, reason: 'email_taken' };
  }

  const token = newSessionToken();
  await prisma.emailToken.create({
    data: {
      userId,
      type: 'email_change',
      newEmail: email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + EMAIL_CHANGE_TTL_MS),
    },
  });
  await mailer.send({
    to: email,
    ...emailChangeVerifyEmail({ actionUrl: `${appUrl()}/confirm-email-change?token=${token}` }),
  });
  return { ok: true };
}

export type EmailChangeConfirmResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_token' | 'email_taken' };

/**
 * Yeni adresteki linke tıklanınca çalışır. Adres burada gerçekten değişir;
 * eski adrese giden bilgilendirme en iyi çaba — arızası değişikliği geri
 * almaz (bkz. altındaki try/catch).
 */
export async function confirmEmailChange(
  token: string,
  mailer: Mailer,
): Promise<EmailChangeConfirmResult> {
  const record = await prisma.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (
    !record ||
    record.type !== 'email_change' ||
    !record.newEmail ||
    record.usedAt ||
    record.expiresAt <= new Date()
  ) {
    return { ok: false, reason: 'invalid_token' };
  }
  // Yarış: adres istekle onay arasında başkasına gitmiş olabilir.
  const holder = await prisma.user.findUnique({ where: { email: record.newEmail } });
  if (holder && holder.id !== record.userId) return { ok: false, reason: 'email_taken' };

  const before = await prisma.user.findUniqueOrThrow({ where: { id: record.userId } });
  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: record.userId },
      // Yeni adres az önce kanıtlandı — doğrulama damgası tazelenir.
      data: { email: record.newEmail, emailVerifiedAt: new Date() },
    }),
  ]);

  // Eski adresin tek savunma anı. Arıza değişikliği geri almaz, sessiz de kalmaz.
  try {
    await mailer.send({
      to: before.email,
      ...emailChangedNoticeEmail({ actionUrl: appUrl(), newEmail: record.newEmail }),
    });
  } catch (error) {
    console.error('[mail] adres-değişti bilgilendirmesi gönderilemedi:', error);
  }
  return { ok: true };
}

// ─── Şifre sıfırlama ─────────────────────────────────────────────────────

export interface ResetRequestInput {
  email: string;
  ip: string;
}

export type ResetRequestResult =
  | { ok: true }
  | { ok: false; reason: 'rate_limited'; retryAfterSeconds: number };

export async function requestPasswordReset(
  input: ResetRequestInput,
  mailer: Mailer,
): Promise<ResetRequestResult> {
  // Sayaç yalnız IP üzerinden: bu uç, e-posta başına sayılsaydı saldırgan
  // adres listesini tarayarak sayaçtan hiç yemezdi.
  const budget = await consumeAttempt(`reset:${input.ip}`);
  if (!budget.allowed) {
    return { ok: false, reason: 'rate_limited', retryAfterSeconds: budget.retryAfterSeconds };
  }

  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(input.email) } });

  // Hesap yoksa da AYNI cevap — e-posta yalnız gerçek hesaba gider ama
  // dışarıdan bakan ikisini ayırt edemez.
  if (user) {
    const token = await issueEmailToken(user.id, 'reset', RESET_TTL_MS);
    await mailer.send({
      to: user.email,
      ...resetEmail({ actionUrl: `${appUrl()}/reset-password?token=${token}` }),
    });
  }

  return { ok: true };
}

export interface ResetInput {
  token: string;
  newPassword: string;
}

export type ResetResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_token' | 'weak_password' };

export async function resetPassword(input: ResetInput): Promise<ResetResult> {
  const policy = checkPasswordPolicy(input.newPassword);
  if (!policy.ok) return { ok: false, reason: 'weak_password' };

  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
  });
  if (!record || record.type !== 'reset' || record.usedAt || record.expiresAt <= new Date()) {
    return { ok: false, reason: 'invalid_token' };
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
  ]);

  // "Şifremi değiştirdim" çoğu zaman "hesabımda başkası var" demek: bütün
  // açık oturumlar ölür, saldırgan da kapı dışında kalır.
  await revokeAllSessionsForUser(record.userId);

  return { ok: true };
}
