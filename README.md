# MedConnect — Telemedicine Platform

A production-grade multi-tenant telemedicine platform built with Node.js, TypeScript, Next.js, PostgreSQL, MongoDB, Redis, Docker, Socket.io, and WebRTC.

## Architecture

```
medconnect/
├── apps/
│   ├── api/          # Express REST API (Node.js + TypeScript)
│   └── web/          # Next.js 14 frontend (App Router)
├── services/
│   ├── realtime/     # Socket.io real-time server
│   └── worker/       # BullMQ background job processor
├── packages/
│   ├── types/        # Shared TypeScript interfaces
│   ├── ui/           # Shared component library
│   └── typescript-config/
└── infra/
    ├── nginx/        # Reverse proxy config
    └── monitoring/   # Prometheus + Grafana
```

## Tech Stack

| Layer           | Technology                                 |
| --------------- | ------------------------------------------ |
| Frontend        | Next.js 14, React, Tailwind, shadcn/ui     |
| Backend         | Node.js, Express, TypeScript               |
| Primary DB      | PostgreSQL (structured data)               |
| Document DB     | MongoDB (medical notes, audit logs)        |
| Cache / Queue   | Redis (sessions, pub/sub, BullMQ)          |
| File Storage    | MinIO (S3-compatible)                      |
| Real-time       | Socket.io + WebRTC                         |
| Background Jobs | BullMQ                                     |
| Auth            | JWT + Redis refresh tokens + Google OAuth2 |
| Monorepo        | Turborepo + pnpm                           |
| Infra           | Docker + Docker Compose + Nginx            |

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### Local development

```bash
# Clone and install
git clone https://github.com/your-username/medconnect
cd medconnect
pnpm install

# Start all infrastructure
docker compose up -d

# Run database migrations
pnpm --filter @medconnect/api run migrate

# Start all services
pnpm dev
```

### Deployed Link
Vercel - https://medconnect-app-6wwas21r7-meshramakshit15-8691s-projects.vercel.app

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

## Production deployment

```bash
# Build and start all production containers
docker compose -f docker-compose.prod.yml up -d --build
```

## Features

- Multi-tenant architecture (schema-level isolation)
- JWT auth with refresh token rotation
- Google OAuth2 login
- Doctor profiles with availability scheduling
- Appointment booking with conflict detection
- Real-time doctor presence and notifications
- WebRTC video consultations
- SOAP consultation notes (MongoDB)
- PDF prescription generation
- Background job processing (BullMQ)
- Rate limiting with Redis sliding window
- Audit logging for all medical record access
- File uploads to MinIO/S3
- Row Level Security on PostgreSQL
