# ── Stage 1: Build ──
FROM node:20-slim AS build
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /monorepo

# Copy root workspace files
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
# Stub other workspaces so npm install doesn't fail
RUN mkdir -p packages/api packages/config packages/ui apps/mobile apps/web \
    && echo '{"name":"@oumoul/api","version":"0.0.0"}' > packages/api/package.json \
    && echo '{"name":"@oumoul/config","version":"0.0.0"}' > packages/config/package.json \
    && echo '{"name":"@oumoul/ui","version":"0.0.0"}' > packages/ui/package.json
COPY packages/api/package.json ./packages/api/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN npm install --workspace=apps/backend --include-workspace-root

# Copy backend source
COPY apps/backend/ ./apps/backend/

WORKDIR /monorepo/apps/backend
ENV DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"
RUN npm run build

# ── Stage 2: Production image ──
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=build /monorepo/apps/backend/dist ./dist
COPY --from=build /monorepo/apps/backend/prisma ./prisma
COPY --from=build /monorepo/apps/backend/package.json ./
COPY --from=build /monorepo/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3333

CMD ["node", "dist/main"]
