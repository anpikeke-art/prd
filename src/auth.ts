import NextAuth, { type NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Session } from 'next-auth';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database', maxAge: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  pages: { signIn: '/login' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const sessions = await prisma.session.findMany({ where: { userId: user.id }, orderBy: { created_at: 'asc' }, select: { id: true } });
      if (sessions.length > 10) await prisma.session.deleteMany({ where: { id: { in: sessions.slice(0, sessions.length - 10).map((s) => s.id) } } });
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions) as Promise<Session | null>;
}

export default function auth(req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, authOptions);
}
