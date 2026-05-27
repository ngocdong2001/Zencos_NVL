# Zencos_NVL

Material and inventory management application for Zencos.

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript
- Database: MySQL + Prisma ORM

## Project Structure

- `src/`: frontend application
- `server/src/`: backend API
- `server/prisma/`: Prisma schema, migrations, and seed scripts

## Scripts

Frontend (root):

- `npm run dev`: start frontend dev server
- `npm run build`: build frontend production bundle
- `npm run preview`: preview built frontend
- `npm run lint`: run lint

Backend (from root via proxy scripts):

- `npm run api:dev`: run backend in watch mode
- `npm run api:build`: build backend
- `npm run api:prisma:generate`: generate Prisma Client

Direct backend scripts (inside `server/`):

- `npm run prisma:migrate`: run Prisma migrate dev
- `npm run prisma:seed`: seed baseline data
- `npm run prisma:seed:demo`: seed demo data

## Local Setup

1. Install frontend dependencies:

   ```bash
   npm install
   ```

2. Install backend dependencies:

   ```bash
   npm install --prefix server
   ```

3. Create `server/.env` and add real values:

   - `DATABASE_URL="mysql://<user>:<password>@<host>:3306/<database>"`
   - `JWT_SECRET="<your-secret>"`

4. Generate Prisma client and run migrations:

   ```bash
   npm run api:prisma:generate
   npm --prefix server run prisma:migrate -- --name init
   ```

5. (Optional) Seed data:

   ```bash
   npm --prefix server run prisma:seed
   ```

6. Start frontend and backend in separate terminals:

   ```bash
   npm run dev
   npm run api:dev
   ```

## Health Check

- Backend: `GET http://localhost:4000/api/health`

## Deploy To Another Machine (Quick Test)

Use this flow when machine A runs API + database and machine B opens the UI.

1. On machine A, allow ports in firewall:

   - API: `4000`
   - Frontend dev (optional): `5180`

2. On machine A, set backend env in `server/.env`:

   - `PORT=4000`
   - `DATABASE_URL` should point to reachable MySQL host
   - `JWT_SECRET` should be set

3. On machine A, start API:

   ```bash
   npm install --prefix server
   npm run api:prisma:generate
   npm run api:dev
   ```

4. Build frontend with API URL of machine A (replace `192.168.1.50`):

   ```bash
   npm install
   set VITE_API_BASE_URL=http://192.168.1.50:4000
   npm run build
   ```

5. Preview the built frontend on LAN from machine A:

   ```bash
   npm run preview -- --host 0.0.0.0 --port 4173
   ```

6. On machine B, open:

   - `http://192.168.1.50:4173`

7. Verify API health from machine B:

   - `http://192.168.1.50:4000/api/health`

Notes:

- Frontend now reads `VITE_API_BASE_URL` (fallback: `http://localhost:4000`).
- If you run frontend dev server instead of preview, `vite.config.ts` already binds `0.0.0.0:5180`.

## Docker Packaging (Frontend + API + MySQL)

Project now includes:

- `Dockerfile` (frontend build + nginx runtime)
- `server/Dockerfile` (backend API runtime)
- `docker-compose.yml` (web + api + db)
- `deploy/nginx/default.conf` (SPA + `/api` reverse proxy)

### Run with Docker Compose

From project root:

```bash
docker compose up -d --build
```

Access services:

- Web UI: `http://localhost:8080`
- API health: `http://localhost:4001/api/health`
- MySQL runs internal in Docker network by default (`db:3306`, user `root`, password `root123`)

Stop services:

```bash
docker compose down
```

Reset database volume (clean re-init):

```bash
docker compose down -v
docker compose up -d --build
```

### Deploy on another machine

1. Install Docker Desktop on the target machine.
2. Copy this repository.
3. Run `docker compose up -d --build`.
4. Open `http://<target-ip>:8080` from your test machine.

### Notes

- Frontend container is built with `VITE_API_BASE_URL=/api`, so browser calls stay same-origin through nginx.
- Nginx proxies `/api/*` to `api:4000` inside Docker network.
- MySQL init scripts are loaded from `server/prisma/migrations_warehouse` on first DB startup.
- On API startup, a compatibility SQL patch is applied (`users.deleted_at` if missing) and default admin account is ensured:
   - Email: `admin@zencos.vn`
   - Password: `Admin@123`
