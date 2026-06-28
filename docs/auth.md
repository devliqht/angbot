# Authentication & Security Guide

The dashboard implements a multi-method authentication system powered by **Auth.js** (NextAuth v5) and relational database integration. It supports **Google OAuth**, **Discord OAuth**, and standard **Email/Password credentials**.

---

## ⚡ Key Components

### 1. The Auth Adapter
NextAuth config is placed in [apps/dashboard/auth.ts](../apps/dashboard/auth.ts). It uses `@auth/prisma-adapter` mapped to our shared database client (`@project/database`).

OAuth users (Google/Discord) are automatically registered and saved as `User` rows linked to their respective `Account` and `Session` credentials on first login.

### 2. Account Linking
The configuration specifies:
```typescript
Google({ allowDangerousEmailAccountLinking: true }),
Discord({ allowDangerousEmailAccountLinking: true })
```
This allows Google and Discord OAuth logins to link automatically with existing credentials or other provider accounts if they share the exact same email address.

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

---

## 👾 Discord OAuth2 Setup Guide

To configure Discord login for local development and production, follow these steps:

### 1. Register Discord Application
1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your application (or create a new one).
3. In the sidebar, navigate to **OAuth2 -> General**.
4. Under **Redirects**, click **Add Redirect** and insert:
   * **Local Development:** `http://localhost:3000/api/auth/callback/discord`
   * **Production:** `https://<yourdomain.com>/api/auth/callback/discord`
5. Click **Save Changes**.
6. Copy the **Client ID** and **Client Secret** (use *Reset Secret* to generate one if needed).

### 2. Configure Environment Variables
Copy these values to your local [apps/dashboard/.env](../apps/dashboard/.env) file:
```env
AUTH_DISCORD_ID="YOUR_DISCORD_CLIENT_ID"
AUTH_DISCORD_SECRET="YOUR_DISCORD_CLIENT_SECRET"
```

### 3. Verification
When a user clicks "Login with Discord" on the dashboard login page:
1. The app invokes NextAuth client-side `signIn("discord")`.
2. The user is redirected to Discord's authorization screen.
3. Upon approval, Discord returns an authorization code to `/api/auth/callback/discord`.
4. Auth.js exchanges it for access/refresh tokens and automatically logs the user in, mapping or creating a database user record.
