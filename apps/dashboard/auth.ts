import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@project/database";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
	adapter: PrismaAdapter(prisma),
	// JWT sessions are required for the Credentials provider; Google still
	// persists users/accounts through the Prisma adapter.
	session: { strategy: "jwt" },
	providers: [
		// Reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment.
		// allowDangerousEmailAccountLinking lets a Google login attach to an
		// existing same-email credentials account (same person, one account).
		Google({ allowDangerousEmailAccountLinking: true }),
		Discord({ allowDangerousEmailAccountLinking: true }),
		Credentials({
			name: "Email and password",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			authorize: async (credentials) => {
				const email =
					typeof credentials?.email === "string" ? credentials.email : "";
				const password =
					typeof credentials?.password === "string" ? credentials.password : "";
				if (!email || !password) return null;

				const user = await prisma.user.findUnique({ where: { email } });
				if (!user?.passwordHash) return null;
				if (!(await verifyPassword(password, user.passwordHash))) return null;

				return {
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image,
				};
			},
		}),
	],
	callbacks: {
		jwt({ token, user }) {
			if (user?.id) token.id = user.id;
			return token;
		},
		session({ session, token }) {
			if (token.id) session.user.id = token.id as string;
			return session;
		},
	},
});
