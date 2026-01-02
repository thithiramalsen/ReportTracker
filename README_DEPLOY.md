Deployment with Docker Compose
=============================

This project includes Dockerfiles and a `docker-compose.yml` to run the frontend, backend and a MongoDB instance locally or on a server.

Prerequisites
- Docker and Docker Compose installed on the target host.

Steps

1. Copy and edit the production env file for the backend:

```powershell
cd /path/to/ReportTracker/backend
cp .env.production.example .env.production
# Edit .env.production and fill real secrets (JWT_SECRET, NOTIFYLK_API_KEY, etc.)
```

2. Start services with Docker Compose (run from repo root):

```powershell
cd /path/to/ReportTracker
docker compose up -d --build
```

3. Verify services:
- Frontend: http://<host>:3000
- Backend API: http://<host>:5000/api/health

Notes & recommendations
- In production use a proper TLS reverse proxy (Traefik, Nginx, or cloud load balancer) to expose the frontend and backend on standard ports 80/443 and to provide HTTPS.
- Set `APP_BASE_URL` to your public frontend URL to ensure SMS messages include absolute links.
- Use managed MongoDB (Atlas) for production rather than the local container for reliability.
- For multi-instance deployments, replace the in-process job processor with a centralized queue (Redis + Bull) to avoid duplicate processing.

Environment variables
- Use `backend/.env.production.example` as a template. DO NOT commit real secrets to the repository.

Scaling
- For higher reliability, run the backend as multiple replicas behind a load balancer and move SMS job processing to a single worker service (or use a distributed queue).
