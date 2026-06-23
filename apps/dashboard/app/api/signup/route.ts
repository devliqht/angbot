import { prisma } from "@project/database";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";

// POST /api/signup — create an email+password account.
// (Google sign-in does not use this; it goes through /api/auth.)
export async function POST(req: Request) {
	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
	}

	const { email, password, name } = (body ?? {}) as {
		email?: unknown;
		password?: unknown;
		name?: unknown;
	};

	if (typeof email !== "string" || !email.includes("@")) {
		return NextResponse.json(
			{ error: "a valid email is required" },
			{ status: 400 },
		);
	}
	if (typeof password !== "string" || password.length < 8) {
		return NextResponse.json(
			{ error: "password must be at least 8 characters" },
			{ status: 400 },
		);
	}

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		return NextResponse.json(
			{ error: "email already registered" },
			{ status: 409 },
		);
	}

	const user = await prisma.user.create({
		data: {
			email,
			name: typeof name === "string" && name.trim() ? name.trim() : null,
			passwordHash: await hashPassword(password),
		},
		select: { id: true, email: true, name: true },
	});

	return NextResponse.json({ user }, { status: 201 });
}
