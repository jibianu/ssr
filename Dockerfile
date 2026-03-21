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

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN chown -R node:node /app

EXPOSE 4000
USER node

CMD ["node", "dist/site/server/server.mjs"]
