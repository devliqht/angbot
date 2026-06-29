import { beforeEach, expect, mock, spyOn, test } from "bun:test";

interface MockSession {
	user?: {
		id: string;
	};
}

let sessionResult: MockSession | null = { user: { id: "user_123" } };

mock.module("@/auth", () => ({
	auth: () => sessionResult,
}));

interface MockUser {
	id: string;
	name: string;
	email: string;
	passwordHash: string | null;
	image: string | null;
}

let mockUser: MockUser | null = {
	id: "user_123",
	name: "Original Name",
	email: "user@example.com",
	passwordHash: "scrypt$salt$originalhash",
	image: "/uploads/avatars/old-avatar.png",
};

let prismaUpdates: Record<string, unknown> | null = null;

mock.module("@project/database", () => ({
	prisma: {
		user: {
			findUnique: ({ where }: { where: { id: string } }) => {
				if (mockUser && where.id === mockUser.id) return mockUser;
				return null;
			},
			update: ({
				where,
				data,
			}: {
				where: { id: string };
				data: Record<string, unknown>;
			}) => {
				prismaUpdates = data;
				return {
					id: where.id,
					name: data.name ?? mockUser?.name,
					email: mockUser?.email,
					image: data.image ?? mockUser?.image,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
			},
		},
	},
}));

let verifiedPassword = true;
mock.module("@/lib/password", () => ({
	hashPassword: async (password: string) => `scrypt$newsalt$${password}hash`,
	verifyPassword: async () => verifiedPassword,
}));

let mkdirCalled = false;
let unlinkCalled: string | null = null;
mock.module("node:fs/promises", () => ({
	mkdir: async () => {
		mkdirCalled = true;
	},
	unlink: async (path: string) => {
		unlinkCalled = path;
	},
}));

// Mock Bun.write globally using spyOn
let bunWriteCalled: string | null = null;
spyOn(Bun, "write").mockImplementation(async (path, _content) => {
	bunWriteCalled = String(path);
	return 100;
});

const { POST } = await import("./route");

beforeEach(() => {
	sessionResult = { user: { id: "user_123" } };
	mockUser = {
		id: "user_123",
		name: "Original Name",
		email: "user@example.com",
		passwordHash: "scrypt$salt$originalhash",
		image: "/uploads/avatars/old-avatar.png",
	};
	prismaUpdates = null;
	verifiedPassword = true;
	mkdirCalled = false;
	unlinkCalled = null;
	bunWriteCalled = null;
});

const call = (fields: Record<string, string | File>) => {
	const fd = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		if (value instanceof File) {
			fd.append(key, value, value.name);
		} else {
			fd.append(key, value);
		}
	}
	return POST(
		new Request("http://test/api/user/profile", {
			method: "POST",
			body: fd,
		}),
	);
};

test("401 when unauthorized", async () => {
	sessionResult = null;
	const res = await call({ name: "New Name" });
	expect(res.status).toBe(401);
});

test("400 when invalid name is provided", async () => {
	const res = await call({ name: "   " });
	expect(res.status).toBe(400);
	expect(await res.json()).toEqual({ error: "Name cannot be empty" });
});

test("updates name successfully", async () => {
	const res = await call({ name: "New Name" });
	expect(res.status).toBe(200);
	const data = await res.json();
	expect(data.user.name).toBe("New Name");
	expect(prismaUpdates).toEqual({ name: "New Name" });
});

test("updates password successfully when current password matches", async () => {
	verifiedPassword = true;
	const res = await call({
		currentPassword: "correctPass",
		newPassword: "newSecurePassword123",
	});
	expect(res.status).toBe(200);
	expect(prismaUpdates?.passwordHash).toBe(
		"scrypt$newsalt$newSecurePassword123hash",
	);
});

test("400 when current password is wrong", async () => {
	verifiedPassword = false;
	const res = await call({
		currentPassword: "wrongPass",
		newPassword: "newSecurePassword123",
	});
	expect(res.status).toBe(400);
	expect(await res.json()).toEqual({ error: "Incorrect current password" });
});

test("400 when new password is too short", async () => {
	const res = await call({
		currentPassword: "correctPass",
		newPassword: "short",
	});
	expect(res.status).toBe(400);
	expect(await res.json()).toEqual({
		error: "New password must be at least 8 characters long",
	});
});

test("updates avatar image successfully and cleans up old file", async () => {
	const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", {
		type: "image/png",
	});
	const res = await call({ avatar: file });
	expect(res.status).toBe(200);

	const json = await res.json();
	expect(json.user.image).toContain("/uploads/avatars/user_123-");
	expect(mkdirCalled).toBe(true);
	expect(bunWriteCalled).toContain("user_123-");
	expect(unlinkCalled).toContain("old-avatar.png");
	expect(prismaUpdates?.image).toContain("/uploads/avatars/user_123-");
});

test("400 when avatar file has invalid mime type", async () => {
	const file = new File([new Uint8Array([1, 2, 3])], "doc.pdf", {
		type: "application/pdf",
	});
	const res = await call({ avatar: file });
	expect(res.status).toBe(400);
	expect(await res.json()).toEqual({
		error: "Invalid image format. Supported formats: JPEG, PNG, WEBP, GIF.",
	});
});
