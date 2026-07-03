# ============================================================
# MyHealth Market Lite - Frontend Client
# Multi-stage build: Vite build → Nginx serving
# ============================================================

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=http://localhost:3001

# 의존성 설치
COPY package.json package-lock.json* ./
RUN npm ci

# 소스 복사 및 빌드
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY public/ ./public/
COPY src/ ./src/

# 환경변수 설정 후 빌드
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Production (Nginx)
FROM nginx:alpine AS production

# Nginx 설정 복사
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 보안 헤더 및 SPA 라우팅 지원
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
