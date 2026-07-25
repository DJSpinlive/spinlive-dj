# -----------------------------
# 1. Dependencies stage
# -----------------------------
FROM node:20-alpine AS deps

WORKDIR /app

RUN corepack enable

# Install dependencies based on lock file
COPY package.json yarn.lock .yarnrc.yml ./

RUN yarn install --immutable


# -----------------------------
# 2. Build stage
# -----------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined at build time, so they must be present here
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build


# -----------------------------
# 3. Production runtime
# -----------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001

# Copy required build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
