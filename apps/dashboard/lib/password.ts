import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// node:crypto scrypt — strong, zero-dependency, and works under both Node and
// Bun. Stored format: `scrypt$<saltHex>$<hashHex>`.
const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const dk = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
	return `scrypt$${salt.toString("hex")}$${dk.toString("hex")}`;
}

export async function verifyPassword(
	password: string,
	stored: string,
): Promise<boolean> {
	const [scheme, saltHex, hashHex] = stored.split("$");
	if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
	const salt = Buffer.from(saltHex, "hex");
	const expected = Buffer.from(hashHex, "hex");
	const dk = (await scryptAsync(password, salt, expected.length)) as Buffer;
	// constant-time compare; lengths must match for timingSafeEqual
	return expected.length === dk.length && timingSafeEqual(expected, dk);
}
