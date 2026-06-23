import { beforeEach, expect, mock, test } from "bun:test";

// In-memory stand-in for the user table. Reset before each test so cases
// stay independent. ponytail: plain object, not a fake Prisma — swap for a
// real test schema only if you need to exercise real constraints.
type Row = { id: string; email: string; name: string | null };
let users: Row[] = [];

mock.module("@project/database", () => ({
	prisma: {
		user: {
			findUnique: ({ where }: { where: { email: string } }) =>
				users.find((u) => u.email === where.email) ?? null,
			create: ({ data }: { data: { email: string; name: string | null } }) => {
				const row: Row = {
					id: `u_${users.length + 1}`,
					email: data.email,
					name: data.name,
				};
				users.push(row);
				return row;
			},
		},
	},
}));

// Avoid the real scrypt cost in tests.
mock.module("@/lib/password", () => ({
	hashPassword: () => "hashed",
}));

// Import AFTER the mocks are registered (static imports would bind the real
// modules first).
const { POST } = await import("./route");

const call = (body: unknown, raw?: string) =>
	POST(
		new Request("http://test/api/signup", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: raw ?? JSON.stringify(body),
		}),
	);

beforeEach(() => {
	users = [];
});

test("400 on non-JSON body", async () => {
	const res = await call(undefined, "not json");
	expect(res.status).toBe(400);
});

test("400 when email missing @", async () => {
	const res = await call({ email: "nope", password: "longenough" });
	expect(res.status).toBe(400);
	expect(await res.json()).toEqual({ error: "a valid email is required" });
});

test("400 when password under 8 chars", async () => {
	const res = await call({ email: "a@b.com", password: "short" });
	expect(res.status).toBe(400);
	expect(await res.json()).toEqual({
		error: "password must be at least 8 characters",
	});
});

test("201 creates user and never returns the hash", async () => {
	const res = await call({
		email: "a@b.com",
		password: "longenough",
		name: "  Ada  ",
	});
	expect(res.status).toBe(201);
	const json = (await res.json()) as { user: Row };
	expect(json.user).toEqual({ id: "u_1", email: "a@b.com", name: "Ada" });
	expect(JSON.stringify(json)).not.toContain("hashed");
	expect(JSON.stringify(json)).not.toContain("password");
});

test("409 on duplicate email", async () => {
	await call({ email: "dup@b.com", password: "longenough" });
	const res = await call({ email: "dup@b.com", password: "longenough" });
	expect(res.status).toBe(409);
	expect(await res.json()).toEqual({ error: "email already registered" });
});

test("blank name becomes null", async () => {
	const res = await call({ email: "c@d.com", password: "longenough", name: "   " });
	const json = (await res.json()) as { user: Row };
	expect(json.user.name).toBeNull();
});
