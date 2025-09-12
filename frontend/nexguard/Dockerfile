# Multi-stage Dockerfile for Next.js (production)
# Builds app in a larger builder image then copies the output to a slim runtime image.

# --- Builder ---
FROM node:20-alpine AS builder
WORKDIR /nexguard

# Install build deps
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

# --- Runner (optimized) ---
FROM node:20-alpine AS runner
WORKDIR /nexguard
ENV NODE_ENV=production

# Copy package.json + lock first
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy build artifacts from builder
COPY --from=builder /nexguard/.next ./.next
COPY --from=builder /nexguard/public ./public
COPY --from=builder /nexguard/next.config.mjs ./next.config.mjs

# Expose port
ENV PORT=80
EXPOSE 80

# Start Next.js server
CMD ["npm", "run", "start", "--", "-p", "80"]
