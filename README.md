# G Manufacturing Execution System

A Manufacturing Execution System (MES) built with:

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript + Prisma + MySQL

## Migration implementation status

- Frontend has been rebuilt from scratch as a new MES interface.
- Legacy UI and old frontend feature modules were removed.
- Current MES modules in the UI: Dashboard, Work Orders, Production, Quality Control, Inventory, Maintenance, Reports.

## Frontend scripts

- `npm run dev` — start frontend dev server
- `npm run build` — build frontend
- `npm run preview` — preview frontend build
- `npm run lint` — lint frontend

## Backend scripts

- `npm run api:dev` — run backend in watch mode
- `npm run api:build` — build backend
- `npm run api:prisma:generate` — generate Prisma client

## Local setup

1. Install frontend dependencies:

   ```bash
   npm install
   ```

2. Install backend dependencies:

   ```bash
   npm install --prefix server
   ```

3. Create backend env file:

   ```bash
   copy server\.env.example server\.env
   ```

4. Set `DATABASE_URL` and `JWT_SECRET` in `server/.env`.

5. Generate Prisma client and migrate DB:

   ```bash
   npm run api:prisma:generate
   npm --prefix server run prisma:migrate -- --name init
   npm --prefix server run prisma:seed
   ```

6. Run frontend and backend in separate terminals:

   ```bash
   npm run dev
   npm run api:dev
   ```

Backend health check: `GET http://localhost:4000/api/health`
