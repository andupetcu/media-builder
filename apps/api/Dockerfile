FROM node:22-alpine AS base
RUN apk add --no-cache git
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

# Development stage
FROM base AS development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter prisma generate
CMD ["pnpm", "--filter", "api", "dev"]

# Build stage
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter prisma generate
RUN pnpm --filter api build

# Production stage
FROM base AS production
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/prisma ./packages/prisma
COPY --from=build /app/packages/shared ./packages/shared
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
