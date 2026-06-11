# Oilandgasclub frontend: public site (SSR) at / + Elearn SPA at /course/ — one process
# Build: npm run build:docker (unified Angular configs)
FROM node:20-bookworm AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:docker

# Runtime: install production deps only (no devDeps). Avoids copying the build-stage
# node_modules and the very slow `chown -R` over ~100k+ files on VPS overlay storage.
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV SSR_API_URL=https://coursebackend.oilandgasclub.com/
# SSR must reach the .NET API from inside the container (not localhost on the host). Set at deploy time, e.g.:
#   docker run -e SSR_API_URL=https://api.yourdomain.com/ ...
# If unset, server falls back to environment baked into the unified build.

COPY --chown=node:node package.json package-lock.json ./
# Single-directory chown (instant); files already owned via COPY --chown above.
RUN chown node:node /app
USER node
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node --from=build /app/dist ./dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '4000') + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/site/server/server.mjs"]
