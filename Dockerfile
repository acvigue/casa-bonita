# ============================================
# Stage 1: Dependencies + s6-overlay
# ============================================
FROM node:lts-alpine AS deps
WORKDIR /app

# Install s6-overlay for multi-arch
ARG TARGETARCH
ARG S6_OVERLAY_VERSION=3.2.1.0

# Map Docker TARGETARCH to s6-overlay architecture naming
RUN case ${TARGETARCH} in \
      amd64) S6_ARCH=x86_64 ;; \
      arm64) S6_ARCH=aarch64 ;; \
      armhf) S6_ARCH=armhf ;; \
      *) S6_ARCH=${TARGETARCH} ;; \
    esac && \
    echo "Building for TARGETARCH=${TARGETARCH}, using s6-overlay arch: ${S6_ARCH}" && \
    wget -O /tmp/s6-overlay-noarch.tar.xz \
      https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz && \
    wget -O /tmp/s6-overlay-arch.tar.xz \
      https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ARCH}.tar.xz && \
    tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz && \
    tar -C / -Jxpf /tmp/s6-overlay-arch.tar.xz && \
    rm /tmp/s6-overlay-*.tar.xz

# Copy only dependency files (maximize cache hits)
COPY package.json pnpm-lock.yaml ./

# Install dependencies with frozen lockfile (hoisted mode)
RUN corepack enable pnpm && \
    pnpm i --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM node:lts-alpine AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY ./ /app/

# Generate Prisma client and build app (bundled)
ENV DATABASE_URL="file:/data/storage.db"
RUN corepack enable pnpm && \
    pnpm prisma:generate && \
    pnpm gen:all && \
    pnpm build

ENV NODE_ENV=production

# ============================================
# Stage 3: Runner (optimized for size)
# ============================================
FROM node:lts-alpine AS runner
WORKDIR /app

# Copy s6-overlay from deps stage
COPY --from=deps /init /init
COPY --from=deps /command /command
COPY --from=deps /etc/s6-overlay /etc/s6-overlay
COPY --from=deps /package /package

# Install only runtime dependencies
# openssl: Prisma requirement
RUN apk add --no-cache openssl && \
    rm -rf /var/cache/apk/*

# Create persist volume mount point
VOLUME ["/data"]
RUN mkdir -p /data && \
    chmod -R 755 /data

# Copy application files from builder
COPY --from=builder --chown=node:node /app/.output ./output
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts

RUN chown -R node:node /data

# Copy s6 service definitions
COPY --chown=node:node docker/s6-rc.d /etc/s6-overlay/s6-rc.d/

# s6 runs as root but drops to node user for services
ENV NODE_ENV=production
ENV S6_CMD_WAIT_FOR_SERVICES_MAXTIME=30000
ENV S6_BEHAVIOUR_IF_STAGE2_FAILS=2

EXPOSE 3000

# Use s6-overlay as entrypoint
ENTRYPOINT ["/init"]
