import { expect, test } from "bun:test";
import { hashPassword, verifyPassword } from "./password";

test("hash + verify round-trips", async () => {
	const hash = await hashPassword("correct horse battery staple");
	expect(hash.startsWith("scrypt$")).toBe(true);
	expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
});

test("verify rejects the wrong password", async () => {
	const hash = await hashPassword("hunter2hunter2");
	expect(await verifyPassword("wrong-password", hash)).toBe(false);
});

test("verify rejects a malformed stored value", async () => {
	expect(await verifyPassword("x", "garbage")).toBe(false);
	expect(await verifyPassword("x", "scrypt$onlyonepart")).toBe(false);
});

test("same password hashes differently (random salt)", async () => {
	const a = await hashPassword("samePassword123");
	const b = await hashPassword("samePassword123");
	expect(a).not.toBe(b);
});
