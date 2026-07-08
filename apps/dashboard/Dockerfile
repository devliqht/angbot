FROM oven/bun:alpine
WORKDIR /usr/src/app

# Copy root monorepo config and lockfile
COPY package.json bun.lock tsconfig.json ./

# Copy shared packages and dashboard app
COPY packages/database packages/database
COPY packages/rag packages/rag
COPY apps/dashboard apps/dashboard

# Install all dependencies and generate Prisma Client
RUN bun install --frozen-lockfile
RUN bunx prisma generate --schema=packages/database/prisma/schema.prisma

# Build the Next.js production bundle
ENV NODE_ENV=production
RUN bun run --cwd apps/dashboard build

EXPOSE 3000

# Push migrations on deploy, then start the server
CMD ["sh", "-c", "bunx prisma db push --schema=packages/database/prisma/schema.prisma && bun run --cwd apps/dashboard start"]
