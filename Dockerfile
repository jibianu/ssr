# Oilandgasclub frontend: public site (SSR) at / + Elearn SPA at /course/ — one process
# Build: npm run build:docker (unified Angular configs)
FROM node:20-bookworm AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:docker

# Runtime: reuse full node_modules from build (SSR + Express need exact dependency tree)
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV SSR_API_URL=https://coursebackend.oilandgasclub.com/
# SSR must reach the .NET API from inside the container (not localhost on the host). Set at deploy time, e.g.:
#   docker run -e SSR_API_URL=https://api.yourdomain.com/ ...
# If unset, server falls back to environment baked into the unified build.

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN chown -R node:node /app

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '4000') + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

USER node

CMD ["node", "dist/site/server/server.mjs"]
