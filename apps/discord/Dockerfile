FROM oven/sh:1.1-alpine
WORKDIR /usr/src/app

# Copy root monorepo config and lockfile
COPY package.json bun.lock tsconfig.json ./

# Copy shared packages and discord app
COPY packages/database packages/database
COPY packages/rag packages/rag
COPY apps/discord apps/discord

# Install all dependencies and generate Prisma Client
RUN bun install --frozen-lockfile
RUN bunx prisma generate --schema=packages/database/prisma/schema.prisma

# Start the Discord bot using Bun
CMD ["bun", "run", "--cwd", "apps/discord", "dev"]
