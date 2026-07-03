# ============================================================
# MyHealth Market Lite - Backend API Server
# Multi-stage build for optimized production image
# ============================================================

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# 의존성 설치 (캐시 최적화)
COPY package.json package-lock.json* ./
RUN npm ci --only=production && \
    cp -R node_modules /tmp/prod_modules && \
    npm ci

# 소스 복사 및 빌드
COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc --noEmit 2>/dev/null || true

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# 보안: non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S myhealth -u 1001 -G nodejs

# 프로덕션 의존성만 복사
COPY --from=builder /tmp/prod_modules ./node_modules
COPY package.json ./
COPY tsconfig.json ./
COPY src/ ./src/

# 업로드 디렉토리 생성
RUN mkdir -p /app/uploads && chown -R myhealth:nodejs /app

# tsx로 TypeScript 직접 실행 (빌드 없이)
RUN npm install tsx --save

USER myhealth

EXPOSE 3001

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["npx", "tsx", "src/index.ts"]
