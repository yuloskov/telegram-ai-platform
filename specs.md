# AI Telegram Channels Platform - Technical Specification

## Overview

A web-based platform for managing AI-powered Telegram channels. The platform enables users to create and manage Telegram channels, automatically scrape content from similar channels, generate AI-powered posts, perform web research for content creation, and schedule/publish posts with image support.

The entire stack runs in Docker Compose for easy local development and deployment.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Compose                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Main App   │  │  Admin App   │  │    Job Worker        │  │
│  │  (Port 3000) │  │  (Port 3001) │  │    (Background)      │  │
│  │  Next.js     │  │  Next.js     │  │    BullMQ            │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           │                                     │
│  ┌────────────────────────┼────────────────────────────────────┐│
│  │                        ▼                                    ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      ││
│  │  │  PostgreSQL  │  │    Redis     │  │    MinIO     │      ││
│  │  │  (Port 5432) │  │  (Port 6379) │  │  (Port 9000) │      ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘      ││
│  │                     Services Layer                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (Pages Router)
- **Styling**: Tailwind CSS
- **State Management**: React Context + SWR for data fetching
- **UI Components**: shadcn/ui
- **Forms**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js with Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Simple JWT-based local auth (no external providers)
- **Queue System**: BullMQ with Redis
- **File Storage**: MinIO (S3-compatible)

### Infrastructure (Docker Compose)
- **PostgreSQL 15**: Primary database
- **Redis 7**: Job queues and caching
- **MinIO**: S3-compatible object storage for images
- **Main App**: User-facing application (port 3000)
- **Admin App**: Admin interface (port 3001)
- **Worker**: Background job processor

### External Services
- **Telegram Bot API**: For posting to channels
- **Telegram MTProto API**: For scraping channels (requires sessions)
- **AI Provider**: OpenRouter API (for content generation via OpenAI-compatible interface)

---

## Project Structure

```
telegram-ai-platform/
├── docker-compose.yml
├── .env.example
├── packages/
│   ├── shared/                    # Shared code between apps
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── lib/
│   │   │   ├── db.ts
│   │   │   ├── redis.ts
│   │   │   ├── minio.ts
│   │   │   ├── telegram.ts
│   │   │   ├── scraper.ts
│   │   │   ├── encryption.ts
│   │   │   ├── auth.ts
│   │   │   └── ai/
│   │   │       ├── content-generator.ts
│   │   │       ├── prompt-generator.ts
│   │   │       └── research-generator.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── main-app/                  # User-facing app (port 3000)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── pages/
│   │   │   ├── _app.tsx
│   │   │   ├── index.tsx
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── index.tsx
│   │   │   │   └── channels/
│   │   │   │       ├── index.tsx
│   │   │   │       ├── new.tsx
│   │   │   │       └── [id]/
│   │   │   │           ├── index.tsx
│   │   │   │           ├── posts/
│   │   │   │           │   ├── index.tsx
│   │   │   │           │   ├── new.tsx
│   │   │   │           │   └── [postId].tsx
│   │   │   │           ├── sources.tsx
│   │   │   │           └── settings.tsx
│   │   │   └── api/
│   │   │       ├── auth/
│   │   │       │   ├── login.ts
│   │   │       │   ├── register.ts
│   │   │       │   ├── logout.ts
│   │   │       │   └── me.ts
│   │   │       ├── channels/
│   │   │       ├── posts/
│   │   │       ├── media/
│   │   │       └── generate/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   └── styles/
│   │
│   ├── admin-app/                 # Admin interface (port 3001)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── pages/
│   │   │   ├── _app.tsx
│   │   │   ├── index.tsx
│   │   │   ├── login.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── users/
│   │   │   │   ├── index.tsx
│   │   │   │   └── [id].tsx
│   │   │   ├── telegram-sessions/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── new.tsx
│   │   │   │   └── [id].tsx
│   │   │   ├── channels/
│   │   │   │   └── index.tsx
│   │   │   ├── jobs/
│   │   │   │   └── index.tsx
│   │   │   └── api/
│   │   │       ├── auth/
│   │   │       ├── users/
│   │   │       ├── telegram-sessions/
│   │   │       ├── channels/
│   │   │       └── jobs/
│   │   └── components/
│   │
│   └── worker/                    # Background job processor
│       ├── Dockerfile
│       ├── package.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── queues/
│       │   │   ├── scrape.queue.ts
│       │   │   ├── publish.queue.ts
│       │   │   └── scheduler.ts
│       │   └── workers/
│       │       ├── scrape.worker.ts
│       │       └── publish.worker.ts
│       └── tsconfig.json
│
└── scripts/
    ├── setup.sh
    └── seed.ts
```

---

## Docker Compose Configuration

```yaml
# docker-compose.yml

version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: tg-platform-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-telegram}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-telegram_secret}
      POSTGRES_DB: ${POSTGRES_DB:-telegram_platform}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-telegram}"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis for job queues
  redis:
    image: redis:7-alpine
    container_name: tg-platform-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # MinIO for S3-compatible storage
  minio:
    image: minio/minio:latest
    container_name: tg-platform-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin123}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5

  # MinIO bucket initialization
  minio-init:
    image: minio/mc:latest
    container_name: tg-platform-minio-init
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD:-minioadmin123};
      mc mb myminio/telegram-media --ignore-existing;
      mc anonymous set download myminio/telegram-media;
      exit 0;
      "

  # Main Application (User-facing)
  main-app:
    build:
      context: .
      dockerfile: packages/main-app/Dockerfile
    container_name: tg-platform-main
    restart: unless-stopped
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://${POSTGRES_USER:-telegram}:${POSTGRES_PASSWORD:-telegram_secret}@postgres:5432/${POSTGRES_DB:-telegram_platform}
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=${MINIO_ROOT_USER:-minioadmin}
      - MINIO_SECRET_KEY=${MINIO_ROOT_PASSWORD:-minioadmin123}
      - MINIO_BUCKET=telegram-media
      - MINIO_USE_SSL=false
      - MINIO_PUBLIC_URL=http://localhost:9000
      - JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY:-32-char-encryption-key-here1234}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    ports:
      - "3000:3000"
    volumes:
      - ./packages/main-app:/app/packages/main-app
      - ./packages/shared:/app/packages/shared
      - /app/node_modules
      - /app/packages/main-app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy

  # Admin Application
  admin-app:
    build:
      context: .
      dockerfile: packages/admin-app/Dockerfile
    container_name: tg-platform-admin
    restart: unless-stopped
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://${POSTGRES_USER:-telegram}:${POSTGRES_PASSWORD:-telegram_secret}@postgres:5432/${POSTGRES_DB:-telegram_platform}
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=${MINIO_ROOT_USER:-minioadmin}
      - MINIO_SECRET_KEY=${MINIO_ROOT_PASSWORD:-minioadmin123}
      - MINIO_BUCKET=telegram-media
      - MINIO_USE_SSL=false
      - JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY:-32-char-encryption-key-here1234}
      - ADMIN_SECRET=${ADMIN_SECRET:-admin-secret-key}
      - TELEGRAM_API_ID=${TELEGRAM_API_ID}
      - TELEGRAM_API_HASH=${TELEGRAM_API_HASH}
    ports:
      - "3001:3001"
    volumes:
      - ./packages/admin-app:/app/packages/admin-app
      - ./packages/shared:/app/packages/shared
      - /app/node_modules
      - /app/packages/admin-app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Background Worker
  worker:
    build:
      context: .
      dockerfile: packages/worker/Dockerfile
    container_name: tg-platform-worker
    restart: unless-stopped
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://${POSTGRES_USER:-telegram}:${POSTGRES_PASSWORD:-telegram_secret}@postgres:5432/${POSTGRES_DB:-telegram_platform}
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=${MINIO_ROOT_USER:-minioadmin}
      - MINIO_SECRET_KEY=${MINIO_ROOT_PASSWORD:-minioadmin123}
      - MINIO_BUCKET=telegram-media
      - MINIO_USE_SSL=false
      - ENCRYPTION_KEY=${ENCRYPTION_KEY:-32-char-encryption-key-here1234}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - TELEGRAM_API_ID=${TELEGRAM_API_ID}
      - TELEGRAM_API_HASH=${TELEGRAM_API_HASH}
    volumes:
      - ./packages/worker:/app/packages/worker
      - ./packages/shared:/app/packages/shared
      - /app/node_modules
      - /app/packages/worker/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## Database Schema

```prisma
// packages/shared/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER & AUTH
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  channels      Channel[]
  posts         Post[]
  contentSources ContentSource[]
}

// ============================================
// ADMIN
// ============================================

model AdminUser {
  id            String    @id @default(cuid())
  username      String    @unique
  passwordHash  String
  name          String?
  role          AdminRole @default(ADMIN)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  auditLogs     AdminAuditLog[]
}

enum AdminRole {
  SUPER_ADMIN
  ADMIN
}

model AdminAuditLog {
  id          String    @id @default(cuid())
  adminUserId String
  adminUser   AdminUser @relation(fields: [adminUserId], references: [id])
  action      String
  entityType  String?
  entityId    String?
  details     Json?
  ipAddress   String?
  createdAt   DateTime  @default(now())
}

// ============================================
// TELEGRAM SESSIONS (Admin managed)
// ============================================

model TelegramSession {
  id              String    @id @default(cuid())
  name            String                    // Friendly name
  phoneNumber     String    @unique
  sessionString   String    @db.Text        // Encrypted session string
  
  status          SessionStatus @default(PENDING)
  lastUsedAt      DateTime?
  errorMessage    String?
  
  dailyRequestCount   Int       @default(0)
  dailyRequestReset   DateTime  @default(now())
  maxDailyRequests    Int       @default(200)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  createdByAdminId String?
  
  contentSources  ContentSource[]
}

enum SessionStatus {
  PENDING
  CODE_SENT
  PASSWORD_REQUIRED
  ACTIVE
  EXPIRED
  BANNED
  ERROR
}

// ============================================
// CHANNELS
// ============================================

model Channel {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  telegramId      String    @unique
  telegramNumericId String?
  title           String
  description     String?
  botToken        String              // Encrypted
  
  niche           String?
  tone            String?
  language        String    @default("en")
  defaultHashtags String[]
  postingSchedule Json?
  
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  posts           Post[]
  contentSources  ContentSource[]
  scrapedContent  ScrapedContent[]
}

// ============================================
// CONTENT SOURCES
// ============================================

model ContentSource {
  id                String    @id @default(cuid())
  channelId         String
  channel           Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  telegramSessionId String?
  telegramSession   TelegramSession? @relation(fields: [telegramSessionId], references: [id], onDelete: SetNull)
  
  telegramUsername  String
  telegramNumericId String?
  displayName       String?
  
  lastScrapedAt     DateTime?
  lastScrapedMsgId  String?
  scrapeFrequency   Int       @default(60)
  maxPostsPerScrape Int       @default(20)
  isActive          Boolean   @default(true)
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  scrapedContent    ScrapedContent[]
  
  @@unique([channelId, telegramUsername])
}

// ============================================
// SCRAPED CONTENT
// ============================================

model ScrapedContent {
  id              String    @id @default(cuid())
  contentSourceId String
  contentSource   ContentSource @relation(fields: [contentSourceId], references: [id], onDelete: Cascade)
  channelId       String
  channel         Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)
  
  telegramMessageId String
  originalText      String    @db.Text
  originalMediaUrls String[]
  originalMediaKeys String[]
  originalDate      DateTime
  
  views             Int?
  forwards          Int?
  reactions         Json?
  
  isUsed            Boolean   @default(false)
  usedInPostId      String?
  
  createdAt         DateTime  @default(now())
  
  @@unique([contentSourceId, telegramMessageId])
  @@index([channelId, isUsed])
}

// ============================================
// POSTS
// ============================================

model Post {
  id          String    @id @default(cuid())
  channelId   String
  channel     Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  content     String    @db.Text
  mediaUrls   String[]
  mediaKeys   String[]
  
  generationType    PostGenerationType
  sourcePrompt      String?   @db.Text
  sourceUrls        String[]
  sourceScrapedIds  String[]
  aiModel           String?
  aiPromptTokens    Int?
  aiCompletionTokens Int?
  
  status          PostStatus  @default(DRAFT)
  scheduledFor    DateTime?
  publishedAt     DateTime?
  telegramMessageId String?
  publishError    String?
  retryCount      Int         @default(0)
  
  views           Int?
  forwards        Int?
  reactions       Json?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([channelId, status])
  @@index([scheduledFor])
}

enum PostGenerationType {
  MANUAL_PROMPT
  CONTENT_SUGGESTION
  WEB_RESEARCH
  DIRECT_WRITE
}

enum PostStatus {
  DRAFT
  SCHEDULED
  PUBLISHING
  PUBLISHED
  FAILED
}

// ============================================
// MEDIA FILES
// ============================================

model MediaFile {
  id            String    @id @default(cuid())
  userId        String?
  filename      String
  originalName  String
  mimeType      String
  size          Int
  bucket        String
  objectKey     String    @unique
  publicUrl     String
  width         Int?
  height        Int?
  createdAt     DateTime  @default(now())
  
  @@index([userId])
}

// ============================================
// JOB LOGS
// ============================================

model JobLog {
  id          String    @id @default(cuid())
  jobType     String
  jobId       String
  channelId   String?
  status      JobStatus
  message     String?
  metadata    Json?
  duration    Int?
  createdAt   DateTime  @default(now())
  
  @@index([jobType, createdAt])
}

enum JobStatus {
  STARTED
  COMPLETED
  FAILED
  RETRYING
}

// ============================================
// SYSTEM SETTINGS
// ============================================

model SystemSetting {
  id          String    @id @default(cuid())
  key         String    @unique
  value       Json
  description String?
  updatedAt   DateTime  @updatedAt
}
```

---

## Feature Specifications

### Feature 1: Simple Local Authentication

#### Description
JWT-based authentication with bcrypt password hashing. No external providers.

#### Implementation

```typescript
// packages/shared/lib/auth.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'user' | 'admin';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function withAuth(handler: NextApiHandler, type: 'user' | 'admin' = 'user') {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload || payload.type !== type) {
      return res.status(401).json({ error: { code: 'AUTH_INVALID', message: 'Invalid token' } });
    }
    
    (req as any).user = payload;
    return handler(req, res);
  };
}
```

#### User Registration API

```typescript
// packages/main-app/pages/api/auth/register.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@shared/lib/db';
import { hashPassword, generateToken } from '@shared/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  }

  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: { code: 'USER_EXISTS', message: 'Email already registered' } });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, createdAt: true }
    });

    const token = generateToken({ userId: user.id, email: user.email, type: 'user' });

    return res.status(201).json({ user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: error.errors } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
}
```

#### User Login API

```typescript
// packages/main-app/pages/api/auth/login.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@shared/lib/db';
import { verifyPassword, generateToken } from '@shared/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  }

  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: { code: 'AUTH_INVALID', message: 'Invalid credentials' } });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: { code: 'AUTH_INVALID', message: 'Invalid credentials' } });
    }

    const token = generateToken({ userId: user.id, email: user.email, type: 'user' });

    return res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (error) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
}
```

---

### Feature 2: MinIO File Storage

#### Implementation

```typescript
// packages/shared/lib/minio.ts

import { Client } from 'minio';
import { v4 as uuid } from 'uuid';
import path from 'path';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

const BUCKET = process.env.MINIO_BUCKET || 'telegram-media';
const PUBLIC_URL = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';

export interface UploadResult {
  objectKey: string;
  publicUrl: string;
  size: number;
  mimeType: string;
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string = 'uploads'
): Promise<UploadResult> {
  const ext = path.extname(originalName);
  const objectKey = `${folder}/${uuid()}${ext}`;
  
  await minioClient.putObject(BUCKET, objectKey, buffer, buffer.length, {
    'Content-Type': mimeType,
  });
  
  return {
    objectKey,
    publicUrl: `${PUBLIC_URL}/${BUCKET}/${objectKey}`,
    size: buffer.length,
    mimeType,
  };
}

export async function uploadFromUrl(url: string, folder: string = 'scraped'): Promise<UploadResult> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
  
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type') || 'application/octet-stream';
  const ext = mimeType.split('/')[1] || 'bin';
  const objectKey = `${folder}/${uuid()}.${ext}`;
  
  await minioClient.putObject(BUCKET, objectKey, buffer, buffer.length, {
    'Content-Type': mimeType,
  });
  
  return {
    objectKey,
    publicUrl: `${PUBLIC_URL}/${BUCKET}/${objectKey}`,
    size: buffer.length,
    mimeType,
  };
}

export async function deleteFile(objectKey: string): Promise<void> {
  await minioClient.removeObject(BUCKET, objectKey);
}

export function getPublicUrl(objectKey: string): string {
  return `${PUBLIC_URL}/${BUCKET}/${objectKey}`;
}
```

---

### Feature 3: Admin Interface - Telegram Session Management

#### Description
Admins create and manage Telegram user sessions for scraping channels.

#### Session Creation Flow
1. Admin enters phone number and friendly name
2. System sends verification code via Telegram
3. Admin enters the code
4. If 2FA enabled, admin enters password
5. Session is saved encrypted in database

#### Admin Session API

```typescript
// packages/admin-app/pages/api/telegram-sessions/start-auth.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { withAuth } from '@shared/lib/auth';
import { z } from 'zod';

const pendingSessions = new Map<string, { client: TelegramClient; phoneCodeHash: string }>();

const schema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number'),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  }

  try {
    const { phoneNumber } = schema.parse(req.body);
    const sessionId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const client = new TelegramClient(
      new StringSession(''),
      parseInt(process.env.TELEGRAM_API_ID!),
      process.env.TELEGRAM_API_HASH!,
      { connectionRetries: 5 }
    );
    
    await client.connect();
    
    const result = await client.sendCode(
      { apiId: parseInt(process.env.TELEGRAM_API_ID!), apiHash: process.env.TELEGRAM_API_HASH! },
      phoneNumber
    );
    
    pendingSessions.set(sessionId, { client, phoneCodeHash: result.phoneCodeHash });
    
    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      const pending = pendingSessions.get(sessionId);
      if (pending) {
        pending.client.disconnect();
        pendingSessions.delete(sessionId);
      }
    }, 10 * 60 * 1000);
    
    return res.json({ sessionId, codeSent: true });
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'AUTH_FAILED', message: error.message } });
  }
}

export default withAuth(handler, 'admin');

// Export for use in verify endpoint
export { pendingSessions };
```

```typescript
// packages/admin-app/pages/api/telegram-sessions/verify-code.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { Api } from 'telegram/tl';
import { StringSession } from 'telegram/sessions';
import { prisma } from '@shared/lib/db';
import { withAuth } from '@shared/lib/auth';
import { encrypt } from '@shared/lib/encryption';
import { z } from 'zod';
import { pendingSessions } from './start-auth';

const schema = z.object({
  sessionId: z.string(),
  phoneNumber: z.string(),
  code: z.string(),
  password: z.string().optional(),
  name: z.string().optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  }

  try {
    const { sessionId, phoneNumber, code, password, name } = schema.parse(req.body);
    
    const pending = pendingSessions.get(sessionId);
    if (!pending) {
      return res.status(400).json({ error: { code: 'SESSION_EXPIRED', message: 'Session expired' } });
    }
    
    const { client, phoneCodeHash } = pending;
    
    try {
      await client.invoke(
        new Api.auth.SignIn({ phoneNumber, phoneCodeHash, phoneCode: code })
      );
    } catch (error: any) {
      if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        if (!password) {
          return res.json({ success: false, needsPassword: true });
        }
        const passwordResult = await client.invoke(new Api.account.GetPassword());
        await client.invoke(
          new Api.auth.CheckPassword({
            password: await client.computePasswordSRP(passwordResult, password),
          })
        );
      } else {
        throw error;
      }
    }
    
    const sessionString = (client.session as StringSession).save();
    
    const dbSession = await prisma.telegramSession.create({
      data: {
        name: name || `Session for ${phoneNumber}`,
        phoneNumber,
        sessionString: encrypt(sessionString),
        status: 'ACTIVE',
        lastUsedAt: new Date(),
        createdByAdminId: (req as any).user.userId,
      }
    });
    
    pendingSessions.delete(sessionId);
    await client.disconnect();
    
    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: (req as any).user.userId,
        action: 'CREATE_TELEGRAM_SESSION',
        entityType: 'TelegramSession',
        entityId: dbSession.id,
        details: { phoneNumber },
      }
    });
    
    return res.json({ success: true, dbSessionId: dbSession.id });
  } catch (error: any) {
    return res.status(400).json({ error: { code: 'VERIFICATION_FAILED', message: error.message } });
  }
}

export default withAuth(handler, 'admin');
```

---

### Feature 4: Channel Management

#### API Endpoints

```
GET    /api/channels              - List user's channels
POST   /api/channels              - Create channel
GET    /api/channels/:id          - Get channel details
PATCH  /api/channels/:id          - Update channel
DELETE /api/channels/:id          - Delete channel
POST   /api/channels/:id/verify   - Verify bot connection
```

#### Telegram Service

```typescript
// packages/shared/lib/telegram.ts

import { Telegraf } from 'telegraf';

export class TelegramService {
  async verifyBotAccess(botToken: string, channelId: string): Promise<{
    success: boolean;
    channelInfo?: { id: number; title: string; username?: string };
    error?: string;
  }> {
    try {
      const bot = new Telegraf(botToken);
      const chat = await bot.telegram.getChat(channelId);
      const botInfo = await bot.telegram.getMe();
      const member = await bot.telegram.getChatMember(channelId, botInfo.id);
      
      if (!['administrator', 'creator'].includes(member.status)) {
        return { success: false, error: 'Bot is not an administrator' };
      }
      
      if (member.status === 'administrator' && !member.can_post_messages) {
        return { success: false, error: 'Bot cannot post messages' };
      }
      
      return {
        success: true,
        channelInfo: {
          id: chat.id,
          title: 'title' in chat ? chat.title : '',
          username: 'username' in chat ? chat.username : undefined
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async sendPost(
    botToken: string,
    channelId: string,
    content: string,
    mediaUrls?: string[]
  ): Promise<{ messageId: number }> {
    const bot = new Telegraf(botToken);
    
    if (mediaUrls && mediaUrls.length > 0) {
      if (mediaUrls.length === 1) {
        const result = await bot.telegram.sendPhoto(
          channelId,
          { url: mediaUrls[0] },
          { caption: content, parse_mode: 'HTML' }
        );
        return { messageId: result.message_id };
      } else {
        const media = mediaUrls.map((url, index) => ({
          type: 'photo' as const,
          media: url,
          caption: index === 0 ? content : undefined,
          parse_mode: 'HTML' as const
        }));
        const results = await bot.telegram.sendMediaGroup(channelId, media);
        return { messageId: results[0].message_id };
      }
    } else {
      const result = await bot.telegram.sendMessage(channelId, content, { parse_mode: 'HTML' });
      return { messageId: result.message_id };
    }
  }
}
```

---

### Feature 5: Content Scraping

#### Scraper Implementation

```typescript
// packages/shared/lib/scraper.ts

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { prisma } from './db';
import { decrypt } from './encryption';
import { uploadFromUrl } from './minio';

export class ChannelScraper {
  private client: TelegramClient;
  
  constructor(sessionString: string) {
    this.client = new TelegramClient(
      new StringSession(sessionString),
      parseInt(process.env.TELEGRAM_API_ID!),
      process.env.TELEGRAM_API_HASH!,
      { connectionRetries: 5 }
    );
  }

  async connect() { await this.client.connect(); }
  async disconnect() { await this.client.disconnect(); }

  async scrapeChannel(channelUsername: string, limit: number = 20, minId?: number) {
    const channel = await this.client.getEntity(channelUsername);
    const messages = await this.client.getMessages(channel, { limit, minId });
    
    const posts = [];
    for (const msg of messages) {
      if (!msg.text && !msg.media) continue;
      
      const mediaUrls: string[] = [];
      if (msg.photo) {
        try {
          const buffer = await this.client.downloadMedia(msg, {});
          if (buffer) {
            const uploaded = await uploadFromUrl(
              `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`,
              'scraped'
            );
            mediaUrls.push(uploaded.publicUrl);
          }
        } catch (e) { /* skip */ }
      }
      
      posts.push({
        messageId: msg.id.toString(),
        text: msg.text || '',
        date: new Date(msg.date * 1000),
        mediaUrls,
        views: msg.views,
        forwards: msg.forwards,
      });
    }
    
    return posts;
  }
}

export async function scrapeContentSource(sourceId: string): Promise<number> {
  const source = await prisma.contentSource.findUnique({
    where: { id: sourceId },
    include: { telegramSession: true }
  });

  if (!source?.telegramSession || source.telegramSession.status !== 'ACTIVE') {
    throw new Error('No active session');
  }

  const sessionString = decrypt(source.telegramSession.sessionString);
  const scraper = new ChannelScraper(sessionString);

  try {
    await scraper.connect();
    const posts = await scraper.scrapeChannel(
      source.telegramUsername,
      source.maxPostsPerScrape,
      source.lastScrapedMsgId ? parseInt(source.lastScrapedMsgId) : undefined
    );

    let count = 0;
    for (const post of posts) {
      await prisma.scrapedContent.upsert({
        where: {
          contentSourceId_telegramMessageId: {
            contentSourceId: sourceId,
            telegramMessageId: post.messageId,
          }
        },
        create: {
          contentSourceId: sourceId,
          channelId: source.channelId,
          telegramMessageId: post.messageId,
          originalText: post.text,
          originalMediaUrls: post.mediaUrls,
          originalDate: post.date,
          views: post.views,
          forwards: post.forwards,
        },
        update: { views: post.views, forwards: post.forwards }
      });
      count++;
    }

    const latestId = posts.length > 0 
      ? Math.max(...posts.map(p => parseInt(p.messageId))).toString() 
      : source.lastScrapedMsgId;
    
    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { lastScrapedAt: new Date(), lastScrapedMsgId: latestId }
    });

    await prisma.telegramSession.update({
      where: { id: source.telegramSession.id },
      data: { dailyRequestCount: { increment: 1 }, lastUsedAt: new Date() }
    });

    return count;
  } finally {
    await scraper.disconnect();
  }
}
```

---

### Feature 6: AI Content Generation

```typescript
// packages/shared/lib/ai/generator.ts

import OpenAI from 'openai';
import { prisma } from '../db';

// OpenRouter uses OpenAI-compatible API
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'Telegram AI Platform',
  },
});

// Default model - can be changed to any OpenRouter-supported model
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4';

function getSystemPrompt(channel: any): string {
  return `You are a content creator for a Telegram channel.
Channel: ${channel.niche || 'general'} | Tone: ${channel.tone || 'professional'} | Language: ${channel.language}
${channel.defaultHashtags?.length ? `Hashtags: ${channel.defaultHashtags.join(' ')}` : ''}

Create engaging Telegram posts. Use **bold** for emphasis, line breaks for readability, emojis sparingly.`;
}

export async function generateFromScrapedContent(channelId: string, scrapedIds: string[], instructions?: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  const scraped = await prisma.scrapedContent.findMany({ where: { id: { in: scrapedIds } } });

  const sources = scraped.map(s => s.originalText).join('\n---\n');

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    max_tokens: 1500,
    messages: [
      { role: 'system', content: getSystemPrompt(channel) },
      { role: 'user', content: `Create ORIGINAL content inspired by:\n\n${sources}\n\n${instructions || ''}\n\nRespond JSON: {"content": "...", "suggestedMediaPrompt": "..." or null}` }
    ]
  });

  const text = response.choices[0]?.message?.content || '';
  await prisma.scrapedContent.updateMany({ where: { id: { in: scrapedIds } }, data: { isUsed: true } });

  return { ...JSON.parse(text), usage: { prompt: response.usage?.prompt_tokens, completion: response.usage?.completion_tokens } };
}

export async function generateFromPrompt(channelId: string, prompt: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    max_tokens: 1500,
    messages: [
      { role: 'system', content: getSystemPrompt(channel) },
      { role: 'user', content: `Create post about: ${prompt}\n\nRespond JSON: {"content": "...", "suggestedMediaPrompt": "..."}` }
    ]
  });

  const text = response.choices[0]?.message?.content || '';
  return JSON.parse(text);
}

export async function generateFromResearch(channelId: string, query: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });

  // Use a model with web search capability via OpenRouter
  // Note: For web search, you may need to use a model that supports it or implement a separate search step
  const response = await openai.chat.completions.create({
    model: 'perplexity/llama-3.1-sonar-large-128k-online', // Perplexity model with built-in web search
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Research "${query}" and create a Telegram post for ${channel?.niche || 'general'} channel.
Respond JSON: {"content": "...", "sources": [{"title": "...", "url": "..."}], "suggestedMediaPrompt": "..."}`
    }]
  });

  const text = response.choices[0]?.message?.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}
```

---

### Feature 7: Background Workers

```typescript
// packages/worker/src/index.ts

import { prisma } from '@shared/lib/db';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { scrapeContentSource } from '@shared/lib/scraper';
import { TelegramService } from '@shared/lib/telegram';
import { decrypt } from '@shared/lib/encryption';

const redis = new Redis(process.env.REDIS_URL!);

// Scrape Queue
const scrapeQueue = new Queue('scrape', { connection: redis });
const scrapeWorker = new Worker('scrape', async (job) => {
  const { sourceId } = job.data;
  const count = await scrapeContentSource(sourceId);
  console.log(`Scraped ${count} posts from source ${sourceId}`);
  return { count };
}, { connection: redis, concurrency: 2 });

// Publish Queue
const publishQueue = new Queue('publish', { connection: redis });
const publishWorker = new Worker('publish', async (job) => {
  const { postId } = job.data;
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { channel: true } });
  
  if (!post || post.status === 'PUBLISHED') return;
  
  const telegram = new TelegramService();
  const result = await telegram.sendPost(
    decrypt(post.channel.botToken),
    post.channel.telegramId,
    post.content,
    post.mediaUrls.length > 0 ? post.mediaUrls : undefined
  );
  
  await prisma.post.update({
    where: { id: postId },
    data: { status: 'PUBLISHED', publishedAt: new Date(), telegramMessageId: result.messageId.toString() }
  });
  
  return { messageId: result.messageId };
}, { connection: redis, concurrency: 5 });

// Scheduler
async function scheduleJobs() {
  // Schedule scrapes
  const sources = await prisma.contentSource.findMany({ where: { isActive: true, telegramSessionId: { not: null } } });
  for (const source of sources) {
    await scrapeQueue.add('scrape', { sourceId: source.id }, {
      repeat: { every: source.scrapeFrequency * 60 * 1000 },
      jobId: `scrape-${source.id}`
    });
  }
  
  // Check scheduled posts every minute
  setInterval(async () => {
    const due = await prisma.post.findMany({ where: { status: 'SCHEDULED', scheduledFor: { lte: new Date() } } });
    for (const post of due) {
      await publishQueue.add('publish', { postId: post.id });
      await prisma.post.update({ where: { id: post.id }, data: { status: 'PUBLISHING' } });
    }
  }, 60000);
}

// Start
async function main() {
  await prisma.$connect();
  await scheduleJobs();
  console.log('Worker running...');
}

main().catch(console.error);
```

---

## Environment Variables

```env
# .env.example

# Database
POSTGRES_USER=telegram
POSTGRES_PASSWORD=telegram_secret
POSTGRES_DB=telegram_platform
DATABASE_URL=postgresql://telegram:telegram_secret@postgres:5432/telegram_platform

# Redis
REDIS_URL=redis://redis:6379

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=telegram-media
MINIO_USE_SSL=false
MINIO_PUBLIC_URL=http://localhost:9000

# Auth
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=32-character-encryption-key-here

# Telegram (from https://my.telegram.org)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# OpenRouter (from https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-xxxxx
```

---

## Quick Start

```bash
# 1. Clone and setup
cp .env.example .env
# Edit .env with your values

# 2. Start everything
docker-compose up -d

# 3. Run migrations
docker-compose exec main-app npx prisma migrate deploy

# 4. Create admin user
docker-compose exec main-app npx ts-node scripts/seed.ts

# 5. Access
# Main App:  http://localhost:3000
# Admin App: http://localhost:3001
# MinIO:     http://localhost:9001 (minioadmin/minioadmin123)

# Default admin: admin / admin123
```

---

## Testing Checklist

- [ ] User registration/login works
- [ ] Admin login works (port 3001)
- [ ] Admin can create Telegram session
- [ ] Admin can verify session with code/2FA
- [ ] User can add channel with bot token
- [ ] User can add content source
- [ ] Scraping job runs successfully
- [ ] AI generation from scraped content works
- [ ] AI generation from prompt works
- [ ] AI generation from research works
- [ ] Image upload to MinIO works
- [ ] Post scheduling works
- [ ] Post publishing works
- [ ] Post appears in Telegram channel
