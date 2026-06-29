import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@project/database";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userId = session.user.id;

	let formData: FormData;
	try {
		formData = await req.formData();
	} catch {
		return NextResponse.json(
			{ error: "Request body must be multipart/form-data" },
			{ status: 400 },
		);
	}

	const name = formData.get("name");
	const currentPassword = formData.get("currentPassword");
	const newPassword = formData.get("newPassword");
	const avatar = formData.get("avatar");

	// Fetch user from DB
	const user = await prisma.user.findUnique({
		where: { id: userId },
	});

	if (!user) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	const dataToUpdate: {
		name?: string;
		passwordHash?: string;
		image?: string;
	} = {};

	// 1. Handle Name Change
	if (name !== null) {
		if (typeof name !== "string") {
			return NextResponse.json(
				{ error: "Invalid name format" },
				{ status: 400 },
			);
		}
		const trimmedName = name.trim();
		if (!trimmedName) {
			return NextResponse.json(
				{ error: "Name cannot be empty" },
				{ status: 400 },
			);
		}
		dataToUpdate.name = trimmedName;
	}

	// 2. Handle Password Change
	if (newPassword !== null) {
		if (typeof newPassword !== "string") {
			return NextResponse.json(
				{ error: "Invalid password format" },
				{ status: 400 },
			);
		}
		if (newPassword.length < 8) {
			return NextResponse.json(
				{ error: "New password must be at least 8 characters long" },
				{ status: 400 },
			);
		}

		// If user has a password set, require verifying current password
		if (user.passwordHash) {
			if (typeof currentPassword !== "string" || !currentPassword) {
				return NextResponse.json(
					{ error: "Current password is required to set a new password" },
					{ status: 400 },
				);
			}

			const isPasswordValid = await verifyPassword(
				currentPassword,
				user.passwordHash,
			);
			if (!isPasswordValid) {
				return NextResponse.json(
					{ error: "Incorrect current password" },
					{ status: 400 },
				);
			}
		}

		// Hash new password
		dataToUpdate.passwordHash = await hashPassword(newPassword);
	}

	// 3. Handle Avatar Image Change
	if (avatar !== null && avatar instanceof File) {
		const validMimeTypes = [
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/gif",
		];
		if (!validMimeTypes.includes(avatar.type)) {
			return NextResponse.json(
				{
					error:
						"Invalid image format. Supported formats: JPEG, PNG, WEBP, GIF.",
				},
				{ status: 400 },
			);
		}

		const maxSize = 5 * 1024 * 1024; // 5MB
		if (avatar.size > maxSize) {
			return NextResponse.json(
				{ error: "Image size exceeds 5MB limit" },
				{ status: 400 },
			);
		}

		const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
		try {
			await mkdir(uploadDir, { recursive: true });
		} catch (err) {
			console.error("Failed to create upload directory:", err);
		}

		const extension = avatar.name.split(".").pop() || "png";
		const filename = `${userId}-${Date.now()}.${extension}`;
		const filePath = join(uploadDir, filename);

		try {
			const arrayBuffer = await avatar.arrayBuffer();
			await Bun.write(filePath, arrayBuffer);
			dataToUpdate.image = `/uploads/avatars/${filename}`;

			// Clean up old avatar file if it was locally stored
			if (user.image?.startsWith("/uploads/avatars/")) {
				const oldFilename = user.image.replace("/uploads/avatars/", "");
				const oldFilePath = join(uploadDir, oldFilename);
				try {
					await unlink(oldFilePath);
				} catch (err) {
					console.error("Failed to delete old avatar file:", err);
				}
			}
		} catch (err) {
			console.error("Failed to save avatar image file:", err);
			return NextResponse.json(
				{ error: "Failed to save avatar image file" },
				{ status: 500 },
			);
		}
	}

	// 4. Update Database
	if (Object.keys(dataToUpdate).length === 0) {
		return NextResponse.json(
			{ message: "No updates were provided" },
			{ status: 200 },
		);
	}

	try {
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: dataToUpdate,
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		return NextResponse.json({
			message: "Profile updated successfully",
			user: updatedUser,
		});
	} catch (err) {
		console.error("Failed to update user profile:", err);
		return NextResponse.json(
			{ error: "Failed to update user profile in the database" },
			{ status: 500 },
		);
	}
}
