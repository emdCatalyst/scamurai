# Production image for Cloud Run (see docs/GOOGLE_CLOUD.md).
#
#   docker build \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN \
#     --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx \
#     -t scamurai-web .
#
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so
# they are build arguments. Everything else, secrets included, is runtime
# environment and never part of the image.

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies, cached until package-lock.json changes.
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
RUN test -n "$NEXT_PUBLIC_SITE_URL" && test -n "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
    || { echo 'Pass --build-arg NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.' >&2; exit 1; }
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Only the traced server files, the static assets and public/.
FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=8080
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
