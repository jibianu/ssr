# Docker Runbook

## Build & Run
- `npm run docker:test:deploy` – builds image, removes old container, starts SSR server on `4008`.
- `docker compose up --build` – builds Angular (`angular-ui`) + .NET (`dotnet-api`) services defined in `docker-compose.yml`.

## Health & Logs
- Check containers: `docker ps -a`.
- Follow logs: `docker logs -f course-angular-ui`.
- Exec shell: `docker exec -it course-angular-ui sh`.
- Inspect ports: `docker inspect -f "{{json .NetworkSettings.Ports}}" course-angular-ui`.
- Detect host conflicts: `netstat -ano | findstr 4000`.

## Debugging Tips
- Curl health endpoint: `curl http://localhost:4000/health`.
- Browser issues: verify `localhost:4000` responds, use DevTools Network tab for 4xx/5xx.
- UI changes not showing: rebuild image (`docker compose build angular-ui`) or run `pnpm start` locally with hot reload.

## Performance Testing
- Lighthouse: run Chrome DevTools Lighthouse audit against `http://localhost:4000`.
- Load test: `wrk -t4 -c50 -d30s http://localhost:4000/`.
- Measure SSR latency: `ab -n 100 -c 10 http://localhost:4000/`.

## Build-Time Speedups
- Uses `pnpm fetch` + cached store to avoid reinstalling packages.
- Set Angular cache: `ng config cli.cache.enabled true`.
- For dev, mount `.angular/cache` volume or build outside Docker via `pnpm run build:ssr`.

## Environment Management
- Store secrets in `.env`; docker compose automatically injects variables to both services.
- Configure Angular API base via `API_BASE_URL` environment variable.
- .NET service uses `ASPNETCORE_URLS` for port binding.

## Compose Networking
- Single `course-net` bridge for all services.
- Angular talks to `.NET` through `http://dotnet-api:8080`.
- Add other services (Redis, SQL) to the same network and reference them by service name.

