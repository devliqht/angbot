# Authentication & Security Guide

The dashboard implements a dual-method authentication system powered by **Auth.js** (NextAuth v5) and relational database integration. It supports **Google OAuth** and standard **Email/Password credentials**.

---

## ⚡ Key Components

### 1. The Auth Adapter
NextAuth config is placed in [apps/dashboard/auth.ts](../apps/dashboard/auth.ts). It uses `@auth/prisma-adapter` mapped to our shared database client (`@project/database`).

Google OAuth users are automatically registered and saved as `User` rows linked to their respective `Account` and `Session` credentials on first login.

### 2. Account Linking
The configuration specifies:
```typescript
Google({ allowDangerousEmailAccountLinking: true })
```
This allows Google OAuth logins to link automatically with existing email-and-password credentials accounts if they share the exact same email address.

### 3. Password Hashing (Zero Dependency)
Password security uses standard Node.js `crypto` with `scrypt` key derivation rather than external binaries like `bcrypt`. The helper methods are located in [apps/dashboard/lib/password.ts](../apps/dashboard/lib/password.ts).

Hashed passwords are stored in the `passwordHash` column of the `User` table using the format:
```
scrypt$<saltHex>$<hashHex>
```

---

## 🔒 Hashing Functions API

### 1. Hashing a Password
Use `hashPassword` during account creation to hash the user's password using a random 16-byte salt:
*   **Signature:** `export async function hashPassword(password: string): Promise<string>`
*   **Example:**
    ```typescript
    import { hashPassword } from "@/lib/password";

    const hash = await hashPassword("mySecurePassword123");
    // Returns e.g. "scrypt$d7f45a0b9e8...$f91b72..."
    ```

### 2. Verifying a Password
Use `verifyPassword` to match an inputted password against a stored hashed key:
*   **Signature:** `export async function verifyPassword(password: string, stored: string): Promise<boolean>`
*   **Example:**
    ```typescript
    import { verifyPassword } from "@/lib/password";

    const isValid = await verifyPassword("mySecurePassword123", user.passwordHash);
    if (!isValid) throw new Error("Invalid password");
    ```

---

## 🌐 Signup Endpoint (`/api/signup`)

The credentials registration route is located at [apps/dashboard/app/api/signup/route.ts](../apps/dashboard/app/api/signup/route.ts).

*   **Endpoint:** `POST /api/signup`
*   **Body (JSON):**
    ```json
    {
      "email": "user@example.com",
      "password": "minimum8characters",
      "name": "User Name"
    }
    ```
*   **Validation Rules:**
    *   `email`: Must be a valid string containing an `@` character.
    *   `password`: Must be a string of at least `8` characters.
    *   Duplicate Email Check: Automatically queries the database and returns a `409 Conflict` if the email is already in use.
*   **Successful Response (201 Created):**
    ```json
    {
      "user": {
        "id": "cuid-string-here",
        "email": "user@example.com",
        "name": "User Name"
      }
    }
    ```
