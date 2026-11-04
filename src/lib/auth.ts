import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validations';

const INSECURE_FALLBACK_SECRETS = [
  'your-32-character-secret-key-here',
  'nexus-default-super-secret-key-32charsmin!',
  'nexus-dev-super-secret-key-min-32-chars-long!',
];

/**
 * Resolves and validates the NextAuth secret key.
 *
 * - In production: Strict validation. Requires NEXTAUTH_SECRET to be defined,
 *   at least 32 characters, and not a predictable placeholder or fallback.
 *   Throws a fatal configuration Error if invalid to prevent insecure deployments.
 * - In development / test: Allows a safe local default if NEXTAUTH_SECRET is omitted
 *   in the local environment, preserving seamless developer experience.
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!secret || secret.trim().length === 0) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: NEXTAUTH_SECRET is required in production environments. ' +
        'Please set a secure 32+ character key (e.g., using `openssl rand -base64 32`).'
      );
    }

    if (secret.trim().length < 32) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: NEXTAUTH_SECRET must be at least 32 characters long for production security.'
      );
    }

    if (INSECURE_FALLBACK_SECRETS.includes(secret.trim())) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: Insecure placeholder detected for NEXTAUTH_SECRET in production. ' +
        'Replace with a unique, cryptographically random secret.'
      );
    }

    return secret;
  }

  // Development and test mode fallback
  return secret || 'nexus-dev-super-secret-key-min-32-chars-long!';
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 Gün
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) {
          throw new Error('Geçersiz giriş bilgileri');
        }

        const user = await prisma.user.findUnique({
          where: { email: validated.data.email.toLowerCase() },
        });

        if (!user || !user.passwordHash) {
          throw new Error('E-posta veya şifre hatalı');
        }

        if (user.status === 'SUSPENDED') {
          throw new Error('Hesabınız askıya alınmıştır. Lütfen destekle iletişime geçin.');
        }

        const isValidPassword = await bcrypt.compare(
          validated.data.password,
          user.passwordHash
        );

        if (!isValidPassword) {
          throw new Error('E-posta veya şifre hatalı');
        }

        // Giriş logu oluştur
        try {
          await prisma.activityLog.create({
            data: {
              userId: user.id,
              action: 'LOGIN',
              details: 'Başarılı kullanıcı girişi yapıldı.',
            },
          });
        } catch {
          // Log hatası girişi engellememeli
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }

      // Profil güncellemesinde token'ı yenile
      if (trigger === 'update' && session?.name) {
        token.name = session.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
      }
      return session;
    },
  },
  secret: getAuthSecret(),
};

import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
export { handleApiError, AuthError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError('Yetkisiz erişim: Lütfen giriş yapınız.');
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Yetersiz yetki: Bu işlem için Yönetici (Admin) rolü gereklidir.');
  }
  return user;
}
