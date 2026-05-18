# syntax=docker/dockerfile:1.6

# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: build the Vite frontend
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Install frontend deps using only the lockfile + manifest first, so npm ci
# can be cached independently of source changes.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the frontend source and build
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build
# → produces /app/build (outDir set in vite.config.js)


# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: install server production dependencies
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS server-deps

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev


# ──────────────────────────────────────────────────────────────────────────────
# Stage 3: runtime
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# `git` is required by /api/git for cloning public repositories on demand.
RUN apk add --no-cache git

WORKDIR /app

# Server code + its installed prod deps
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server ./server

# Built frontend — server.js auto-serves /app/build when it exists
COPY --from=frontend-build /app/build ./build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Drop to a non-root user for the runtime
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

CMD ["node", "server/server.js"]
