# Stage 1: Dependencies
CMD ["node", "server.js"]
# Start the application

  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
# Health check

ENV HOSTNAME "0.0.0.0"
ENV PORT 3000

EXPOSE 3000
# Expose port

USER nextjs
# Switch to non-root user

RUN chown -R nextjs:nodejs /app
# Set permissions

COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
# Copy necessary files from builder

RUN adduser --system --uid 1001 nextjs
RUN addgroup --system --gid 1001 nodejs
# Create non-root user

WORKDIR /app
FROM node:20-alpine AS runner
# Stage 3: Production runner

RUN pnpm run build
# Build the application

ENV NODE_ENV=production
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV JWT_SECRET=$JWT_SECRET
ENV MONGODB_URI=$MONGODB_URI
# Set environment variables for build

ARG NEXT_PUBLIC_APP_URL
ARG JWT_SECRET
ARG MONGODB_URI
# Build arguments for environment variables

COPY . .
# Copy application code

COPY --from=deps /app/node_modules ./node_modules
# Copy dependencies from deps stage

RUN npm install -g pnpm
# Install pnpm

WORKDIR /app
FROM node:20-alpine AS builder
# Stage 2: Builder

RUN pnpm install --frozen-lockfile
# Install dependencies

COPY package.json pnpm-lock.yaml ./
# Copy package files

RUN npm install -g pnpm
# Install pnpm

WORKDIR /app
RUN apk add --no-cache libc6-compat
FROM node:20-alpine AS deps

