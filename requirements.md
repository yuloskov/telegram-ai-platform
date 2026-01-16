# AI Telegram Channels Platform - Requirements Document

## 1. Overview

A web-based platform for managing AI-powered Telegram channels. The platform serves as a content management system that helps users automate and enhance their Telegram channel operations through AI-generated content.

### 1.1 Problem Statement

Managing Telegram channels requires constant content creation, which is time-consuming. Channel owners need:
- Fresh content ideas from competitors/similar channels
- Quick content generation from prompts
- Research-based posts with accurate information
- Scheduled publishing with media support

### 1.2 Solution

A unified platform that:
- Scrapes content from similar channels for inspiration
- Generates original posts using AI
- Performs web research and converts findings to posts
- Manages scheduling and publishing with image support

---

## 2. User Roles

### 2.1 Regular User
- Creates and manages their own Telegram channels
- Configures content sources for scraping
- Generates and publishes posts
- Schedules content

### 2.2 Admin
- Manages Telegram scraping sessions (required for MTProto API)
- Monitors system health and job queues
- Manages user accounts
- Views platform-wide analytics

---

## 3. Core Features

### 3.1 Channel Management

**Requirements:**
- Users can add Telegram channels by providing a bot token
- System verifies bot has admin/posting permissions on the channel
- Users can configure channel settings:
  - Niche/topic (e.g., "tech news", "crypto", "lifestyle")
  - Tone (e.g., "professional", "casual", "humorous")
  - Language
  - Default hashtags
  - Posting schedule preferences

**Acceptance Criteria:**
- [ ] User can add a channel with bot token
- [ ] System validates bot permissions before saving
- [ ] User can update channel settings
- [ ] User can delete a channel
- [ ] User can view list of all their channels

---

### 3.2 Content Scraping

**Requirements:**
- Users can add "content sources" - other Telegram channels to monitor
- System scrapes posts from source channels periodically
- Scraped content is stored with metadata (views, forwards, reactions, date)
- Media (images) from scraped posts is downloaded and stored
- Rate limiting to avoid Telegram API restrictions

**Acceptance Criteria:**
- [ ] User can add a source channel by username
- [ ] System scrapes new posts automatically on schedule
- [ ] Scraped posts are displayed in the UI with engagement metrics
- [ ] User can manually trigger a scrape
- [ ] Images from posts are preserved
- [ ] System tracks which content has been used for generation

---

### 3.3 AI Content Generation

#### 3.3.1 Generate from Scraped Content

**Requirements:**
- User selects one or more scraped posts as inspiration
- AI generates original content based on selected posts
- User can provide additional instructions
- Generated content maintains channel's configured tone/style

**Acceptance Criteria:**
- [ ] User can select multiple scraped posts
- [ ] User can add custom instructions
- [ ] AI generates unique, non-plagiarized content
- [ ] Generated content respects channel language setting
- [ ] System suggests relevant media/image prompts

#### 3.3.2 Generate from User Prompt

**Requirements:**
- User provides a topic or prompt
- AI generates a post based on the prompt
- Content follows channel's style guidelines

**Acceptance Criteria:**
- [ ] User can enter free-form prompt
- [ ] AI generates post matching channel tone
- [ ] Response includes suggested media prompt
- [ ] Generation completes within reasonable time (<30s)

#### 3.3.3 Generate from Web Research

**Requirements:**
- User provides a search query/topic
- System performs web research on the topic
- AI synthesizes findings into a Telegram post
- Sources are cited/linked in the post

**Acceptance Criteria:**
- [ ] User can enter research query
- [ ] System searches the web for relevant information
- [ ] Generated post includes factual, up-to-date information
- [ ] Sources (URLs) are provided with the post
- [ ] User can review sources before publishing

---

### 3.4 Post Management

**Requirements:**
- Users can create posts manually (direct write)
- Users can edit AI-generated content before publishing
- Posts support Telegram formatting (bold, italic, links)
- Posts can include images (single or multiple)
- Posts can be saved as drafts

**Acceptance Criteria:**
- [ ] Rich text editor with Telegram formatting support
- [ ] Image upload functionality
- [ ] Draft saving and editing
- [ ] Preview of how post will appear in Telegram
- [ ] Character count and formatting validation

---

### 3.5 Scheduling & Publishing

**Requirements:**
- Posts can be scheduled for future publication
- Posts can be published immediately
- System handles publishing automatically at scheduled time
- Failed publications are retried with backoff
- Users receive feedback on publish status

**Acceptance Criteria:**
- [ ] User can set date/time for scheduled posts
- [ ] Scheduled posts publish automatically
- [ ] User can cancel scheduled posts
- [ ] System retries failed posts (max 3 attempts)
- [ ] User sees publish status (draft/scheduled/publishing/published/failed)
- [ ] Published posts show Telegram message ID

---

### 3.6 Media Management

**Requirements:**
- Support image uploads (JPG, PNG, GIF, WebP)
- Store media in S3-compatible storage
- Support multiple images per post (up to 10)
- Preserve images from scraped content

**Acceptance Criteria:**
- [ ] User can upload images from device
- [ ] Images are optimized for Telegram
- [ ] Multiple images can be attached to single post
- [ ] Scraped images are stored and accessible
- [ ] Media gallery shows all uploaded/scraped images

---

### 3.7 Admin Features

**Requirements:**
- Admin can create Telegram sessions for scraping (MTProto)
- Admin can manage users (activate/deactivate)
- Admin can view all channels across users
- Admin can monitor background job status
- Admin can view system logs and audit trail

**Acceptance Criteria:**
- [ ] Admin login separate from user login
- [ ] Session creation with phone verification + 2FA support
- [ ] User management CRUD operations
- [ ] Job queue monitoring dashboard
- [ ] Audit log of admin actions

---

## 4. Technical Requirements

### 4.1 Architecture

- **Web Application**: Modern SPA with server-side rendering capability
- **Background Workers**: Async job processing for scraping and publishing
- **Database**: Relational database for structured data
- **File Storage**: S3-compatible object storage for media
- **Cache/Queue**: Redis for job queues and caching
- **Containerized**: Docker Compose for local dev and deployment

### 4.2 External Integrations

| Service | Purpose | API Type |
|---------|---------|----------|
| Telegram Bot API | Publishing posts | REST |
| Telegram MTProto | Scraping channels | MTProto |
| OpenRouter | AI content generation | REST (OpenAI-compatible) |

### 4.3 AI Provider

- **Provider**: OpenRouter (unified API for multiple AI models)
- **Default Model**: `anthropic/claude-sonnet-4` for content generation
- **Research Model**: `perplexity/llama-3.1-sonar-large-128k-online` for web search
- **Flexibility**: Model can be changed without code modifications

### 4.4 Security Requirements

- JWT-based authentication
- Encrypted storage for sensitive data (bot tokens, session strings)
- Rate limiting on API endpoints
- Input validation and sanitization
- No external auth providers (self-contained)

---

## 5. Non-Functional Requirements

### 5.1 Performance

- Page load time < 2 seconds
- AI generation response < 30 seconds
- Support for 100+ concurrent users
- Background jobs process within SLA (scraping: 5 min, publishing: 1 min)

### 5.2 Reliability

- 99% uptime for publishing functionality
- Automatic retry for failed jobs
- Graceful degradation if AI service unavailable
- Data backup capability

### 5.3 Scalability

- Horizontal scaling for web application
- Queue-based architecture for background jobs
- Stateless application design

### 5.4 Usability

- Responsive design (desktop + mobile)
- Intuitive channel setup wizard
- Clear feedback on all operations
- Keyboard shortcuts for power users

---

## 6. User Flows

### 6.1 New User Onboarding

```
1. User registers with email/password
2. User creates first channel
   - Enters bot token
   - System verifies bot permissions
   - User configures channel settings (niche, tone, language)
3. User adds content sources (optional)
   - Enters source channel username
   - System assigns scraping session
4. User can now generate content
```

### 6.2 Content Generation Flow

```
1. User navigates to channel dashboard
2. User chooses generation method:
   a. From scraped content -> Select posts -> Add instructions -> Generate
   b. From prompt -> Enter prompt -> Generate
   c. From research -> Enter search query -> Generate
3. User reviews generated content
4. User edits if needed
5. User adds/removes images
6. User publishes or schedules
```

### 6.3 Scheduled Publishing Flow

```
1. User creates/generates post
2. User clicks "Schedule"
3. User selects date and time
4. Post status changes to "Scheduled"
5. At scheduled time:
   - Worker picks up job
   - Sends to Telegram via Bot API
   - Updates status to "Published" or "Failed"
6. User sees result in dashboard
```

---

## 7. Data Model (High-Level)

### Core Entities

- **User**: Platform users who own channels
- **Channel**: Telegram channel with bot token and settings
- **ContentSource**: Source channels to scrape for inspiration
- **ScrapedContent**: Posts scraped from source channels
- **Post**: Generated/written posts (draft, scheduled, published)
- **MediaFile**: Uploaded or scraped images

### Admin Entities

- **AdminUser**: Admin accounts with elevated privileges
- **TelegramSession**: MTProto sessions for scraping
- **JobLog**: Background job execution history
- **AuditLog**: Admin action history

---

## 8. MVP Scope

### Phase 1 (MVP)

- User registration and authentication
- Channel management (add, configure, delete)
- Content source management
- Basic scraping (text only)
- AI generation from prompt
- Manual post creation
- Immediate publishing
- Basic admin panel

### Phase 2

- AI generation from scraped content
- AI generation from web research
- Image support (upload and scraped)
- Scheduled publishing
- Post analytics (views, forwards)

### Phase 3

- Multiple images per post
- Advanced scheduling (recurring posts)
- Content calendar view
- Bulk operations
- Export/import functionality
- API access for integrations

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| User retention (30-day) | > 40% |
| Posts published per user/week | > 5 |
| AI generation satisfaction rate | > 80% |
| Publishing success rate | > 99% |
| Average time to first post | < 10 minutes |

---

## 10. Constraints & Assumptions

### Constraints

- Telegram MTProto requires phone-verified sessions (admin managed)
- Telegram rate limits apply to both scraping and publishing
- AI API costs scale with usage
- Single-tenant deployment (not multi-tenant SaaS initially)

### Assumptions

- Users have existing Telegram channels with bot admin access
- Users understand basic Telegram channel concepts
- Admin will manage session pool for scraping
- OpenRouter API availability and pricing remains stable
