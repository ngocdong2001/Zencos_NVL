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

3. Create environment file:

   ```bash
   copy server\.env.example server\.env
   ```

4. Update `server/.env` with real values:

   - `DATABASE_URL="mysql://<user>:<password>@<host>:3306/<database>"`
   - `JWT_SECRET="<your-secret>"`

5. Generate Prisma client and run migrations:

   ```bash
   npm run api:prisma:generate
   npm --prefix server run prisma:migrate -- --name init
   ```

6. (Optional) Seed data:

   ```bash
   npm --prefix server run prisma:seed
   ```

7. Start frontend and backend in separate terminals:

   ```bash
   npm run dev
   npm run api:dev
   ```

## Health Check

- Backend: `GET http://localhost:4000/api/health`
