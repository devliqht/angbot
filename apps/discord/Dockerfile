FROM oven/bun:alpine
WORKDIR /usr/src/app

COPY . .

# Install all dependencies and generate Prisma Client
RUN bun install --frozen-lockfile
RUN bunx prisma generate --schema=packages/database/prisma/schema.prisma

# Start the Discord bot using Bun
CMD ["bun", "run", "--cwd", "apps/discord", "dev"]
