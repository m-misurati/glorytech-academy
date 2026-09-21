# --- Build stage -------------------------------------------------------------
# Debian, not Alpine: the build pulls in workerd (via @cloudflare/vite-plugin),
# which ships glibc binaries only and fails to install on musl.
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Only the site URL is needed at build time (it goes into sitemap.xml).
# Everything else is injected at runtime by server/index.js.
ARG VITE_SITE_URL=""
ENV VITE_SITE_URL=$VITE_SITE_URL

# Manifests first, so the dependency layer is reused when only source changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage -----------------------------------------------------------
# Alpine is fine here: the server uses only Node built-ins, no native modules.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/server ./server
# Needed for "type": "module", so server/index.js is loaded as ESM.
COPY --from=build /app/package.json ./package.json

# node:alpine ships an unprivileged "node" user; do not run as root.
USER node

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
