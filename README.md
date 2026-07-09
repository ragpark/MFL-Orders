# ActiveHub Order Reconciliation Platform

A production-oriented monorepo for ingesting Excel-based ActiveHub order reports, normalising order state into events, reconciling cross-system processing gaps, and exposing a React UI for dashboarding, order exploration, failure analysis, and controlled file upload.

## Stack

- `apps/api`: Express + TypeScript + Prisma + PostgreSQL + Multer + XLSX
- `apps/web`: Next.js + TypeScript + Tailwind + TanStack Query + Zustand
- Deployment target: Railway with separate Web, API, and PostgreSQL services.

## Core model

The platform treats each order as a durable entity and every upload row as an immutable processing event. Final business success is not inferred from `API call is successful`; it is represented by a Licence Manager success event.

## Local setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:generate
npm run db:migrate
npm run seed
npm run dev
```

API: `http://localhost:4000`  
Web: `http://localhost:3000`

## Railway deployment

This repo is designed for a Railway monorepo deployment:

1. Create a Railway project.
2. Add a PostgreSQL service.
3. Add an API service from this GitHub repo.
   - Root directory: `/apps/api`
   - Build command: `npm ci && npm run build && npx prisma generate`
   - Start command: `npm run railway:start`
   - Required variables:
     - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
     - `CORS_ORIGIN=<your web service URL>`
4. Add a Web service from this GitHub repo.
   - Root directory: `/apps/web`
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
   - Required variable:
     - `NEXT_PUBLIC_API_BASE_URL=<your API public URL>`
5. Run the API service command once after provisioning: `npx prisma migrate deploy && npm run seed`.

Railway supports monorepo deployments using service root directories and custom start commands; this repo includes per-service `railway.toml` files as a starting point.

## Upload types

| Type | Required columns |
|---|---|
| `BATCH` | `Order Number`, `Customer ID`, `Email`, `Org Name` |
| `PROCESSING_REPORT` | `SOURCE_ORDER_NUMBER`, `PROCESS_MESSAGE`, `Error Reason`, `Status` |
| `LM_REPORT` | `orderkey`, `Process Status` |
| `REORDER` | `Original Order`, `New Order` |

## API contracts

- `POST /uploads` multipart: `file`, `type`, optional `batchName`
- `GET /uploads/:id/status`
- `GET /orders?batchId=&status=&failureCategory=&search=`
- `GET /orders/:orderNumber`
- `GET /dashboard/summary`
- `GET /dashboard/flow`
- `GET /failures`

## Important design choices

- Order number is always stored as a string to avoid Excel/JS numeric coercion problems.
- Uploads are validated before import.
- Events are appended, not overwritten.
- Failure categories are seeded and matched by regex.
- Reorder chains can be created from explicit reorder files or inferred from status strings where possible.
