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
- Users add Telegram channels by making the platform bot an admin of their channel
- User provides channel username or ID, system verifies platform bot has posting permissions
- Users can configure channel settings:
  - Niche/topic (e.g., "tech news", "crypto", "lifestyle")
  - Tone (e.g., "professional", "casual", "humorous")
  - Language
  - Default hashtags
  - Posting schedule preferences

**Acceptance Criteria:**
- [x] User can add a channel by username/ID after adding platform bot as admin
- [x] System validates platform bot has posting permissions on the channel
- [x] User can update channel settings
- [x] User can delete a channel (removes from platform, bot remains in channel until manually removed)
- [x] User can view list of all their channels

---

### 3.2 Content Scraping

**Requirements:**
- Users can add "content sources" - other Telegram channels to monitor
- System scrapes posts from source channels periodically
- Scraped content is stored with metadata (views, forwards, reactions, date)
- Media (images) from scraped posts is downloaded and stored
- Rate limiting to avoid Telegram API restrictions

**Scraping Configuration:**
- User can configure maximum posts to scrape per update (1-50, default: 10)
- Scraping uses batching of maximum 10 posts per request
- For updates: only scrape posts not already in the database
- Stop scraping immediately when encountering an existing post
- Previously scraped posts are preserved (not deleted on subsequent updates)

**Efficient Duplicate Detection:**
- Before scraping, fetch existing post IDs from database (single query)
- Match scraped posts against existing IDs using O(1) lookup
- Stop scraping batch when duplicate is encountered

**Acceptance Criteria:**
- [x] User can add a source channel by username
- [x] User can configure max posts to scrape (1-50) per source
- [~] System scrapes new posts automatically on schedule (job exists, scheduler needed)
- [x] Scraped posts are displayed in the UI with engagement metrics
- [x] User can manually trigger an update (scrapes only new posts)
- [x] Scraping stops when encountering already-scraped posts
- [~] Images from posts are preserved (partial)
- [ ] System tracks which content has been used for generation

#### 3.2.1 Image Analysis and Generation

**Requirements:**
- System analyzes images from scraped posts using AI vision models
- AI extracts visual style, composition, subjects, and mood from images
- When generating content based on scraped posts with images, system can generate similar images
- Users can choose to use original images, generate new similar ones, or skip images
- Generated images match the visual style and theme of the source content

**Acceptance Criteria:**
- [x] System automatically analyzes images when scraping posts
- [x] Image analysis extracts: subject matter, style, colors, composition, text overlays
- [x] User can view image analysis results in the UI
- [x] When generating from scraped content, user can opt to generate similar images
- [x] AI generates image prompts based on analysis of source images
- [x] Generated images are created via image generation API
- [x] User can regenerate images with modified prompts
- [x] System respects copyright by generating original images, not copies

#### 3.2.2 SVG Image Generation

**Requirements:**
- System provides an alternative image generation method using AI-generated SVG graphics
- SVG generation is ideal for informative images with significant text content (infographics, diagrams, quote cards, statistics)
- AI uses OPENROUTER_MODEL to generate valid SVG markup based on content and user style preferences
- Generated SVG is rendered and previewed in the UI before publishing
- Users can customize SVG appearance through style settings and prompts

**SVG Style Configuration:**
- **Style Prompt**: Free-form text describing desired visual style (e.g., "minimalist tech style", "bold corporate infographic")
- **Theme Color**: Primary/accent color for the SVG (user-selectable color picker)
- **Text Color**: Color for text elements (user-selectable, with auto-contrast option)
- **Background Style**: Solid color, gradient, or transparent
- **Font Style**: Modern, classic, playful, or technical

**Use Cases:**
- Quote cards with styled typography
- Statistics/metrics displays (e.g., "↑ 50% growth")
- Simple infographics and diagrams
- Text-heavy informational posts
- Announcement banners
- Comparison charts

**Generation Flow:**
1. User opts to use SVG generation instead of raster image generation
2. User configures style settings (theme color, text color) and optional style prompt
3. AI analyzes post content and generates appropriate SVG markup
4. SVG is rendered as a preview in the UI
5. User can regenerate with adjusted settings or accept
6. Accepted SVG is converted to PNG for Telegram publishing

**Acceptance Criteria:**
- [ ] User can toggle between raster image generation and SVG generation
- [ ] User can set theme color via color picker
- [ ] User can set text color via color picker (with auto-contrast suggestion)
- [ ] User can provide optional style prompt for additional customization
- [ ] AI generates valid, well-structured SVG markup
- [ ] SVG preview renders correctly in the UI
- [ ] User can regenerate SVG with different settings
- [ ] SVG is converted to high-quality PNG for Telegram compatibility
- [ ] SVG generation respects post language (text direction, fonts)
- [ ] Error handling for invalid SVG generation with retry option
- [ ] SVG templates/presets available for common use cases (quote, stats, comparison)

---

### 3.3 AI Content Generation

#### 3.3.1 Generate from Scraped Content

**Requirements:**
- User selects one or more scraped posts as inspiration
- AI generates original content based on selected posts
- User can provide additional instructions
- Generated content maintains channel's configured tone/style

**Acceptance Criteria:**
- [x] User can select multiple scraped posts
- [x] User can add custom instructions
- [x] AI generates unique, non-plagiarized content
- [x] Generated content respects channel language setting
- [x] System suggests relevant media/image prompts

#### 3.3.2 Generate from User Prompt

**Requirements:**
- User provides a topic or prompt
- AI generates a post based on the prompt
- Content follows channel's style guidelines

**Acceptance Criteria:**
- [x] User can enter free-form prompt
- [x] AI generates post matching channel tone
- [x] Response includes suggested media prompt
- [x] Generation completes within reasonable time (<30s)

#### 3.3.5 Channel Post Analysis for Style Matching

**Requirements:**
- System analyzes existing posts from the target channel (the channel being posted to)
- AI learns the channel's writing style, tone, vocabulary, and formatting patterns
- Generated content mimics the established voice of the channel
- System can generate content based on themes/topics from previous posts
- Analysis is periodically updated to reflect evolving channel style

**Analysis Features:**
- **Tone Detection**: Identifies if channel uses formal, casual, humorous, or technical tone
- **Vocabulary Patterns**: Extracts commonly used phrases, terminology, and expressions
- **Formatting Style**: Learns emoji usage, paragraph structure, list preferences, hashtag patterns
- **Content Themes**: Identifies recurring topics and angles covered by the channel
- **Posting Patterns**: Analyzes post length, media usage frequency, and engagement patterns

**Generation Modes:**
1. **Style-Matched Generation**: User prompt + channel style = content that sounds like the channel
2. **Continuation Generation**: Generate follow-up content based on recent posts/themes
3. **Gap-Filling Generation**: Identify topics the channel hasn't covered recently and suggest new posts

**Acceptance Criteria:**
- [ ] System scrapes and stores recent posts from target channel (via Bot API or stored data)
- [ ] AI analyzes channel posts to extract style fingerprint
- [ ] Style fingerprint includes: tone, vocabulary, formatting, themes, average post length
- [ ] Generated content adopts the identified writing style
- [ ] User can view the analyzed style profile for their channel
- [ ] User can regenerate style analysis manually
- [ ] Style analysis updates automatically when new posts are published
- [ ] User can override/adjust detected style preferences
- [ ] AI explains how it's matching the channel style in generation responses

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

#### 3.3.4 Fully Automatic Content Generation & Posting

**Requirements:**
- Users can configure fully autonomous content pipelines per channel
- System operates in two source modes: research-based and scraped content-based
- Posts are automatically published or sent to bot for review based on user preference
- Entire workflow runs without user intervention (scrape → analyze → generate → publish)

**Source Modes:**

1. **Research-Based Auto-Posting**
   - System periodically performs web research on configured topics/keywords
   - AI generates posts based on fresh research findings
   - System tracks trending topics and news in the channel's niche

2. **Scraped Content-Based Auto-Posting**
   - System monitors configured source channels for new posts
   - When new content is scraped, AI automatically generates inspired posts
   - Optionally analyzes and generates similar images for scraped posts with media
   - Maintains originality while capturing trending topics from competitors

**Publishing Modes:**
- **Auto-Publish**: Posts are published immediately after generation
- **Review-First**: Posts are sent to platform bot for user approval before publishing
- **Scheduled**: Posts are queued and published at optimal times based on channel settings

**Acceptance Criteria:**
- [ ] User can enable/disable automatic posting per channel
- [ ] User can configure auto-generation schedule (e.g., hourly, daily, custom cron)
- [ ] User can select source mode: research-only, scraped-only, or both
- [ ] User can define research topics/keywords for research-based generation
- [ ] User can select which content sources trigger auto-generation
- [ ] User can choose publishing mode: auto-publish, review-first, or scheduled
- [ ] System generates unique, non-duplicate content for each post
- [ ] User can set minimum time interval between auto-posts
- [ ] User can pause/resume automatic posting
- [ ] User receives bot notifications for all auto-generated posts
- [ ] System avoids duplicate topics within configurable time window
- [ ] Failed generations are logged and retried with exponential backoff
- [ ] User can set daily/weekly limits on auto-generated posts
- [ ] Auto-generated posts are clearly marked in the dashboard
- [ ] User can review auto-posting history and performance metrics

---

### 3.4 Post Management

**Requirements:**
- Users can create posts manually (direct write)
- Users can edit AI-generated content before publishing
- Posts support Telegram formatting (bold, italic, links)
- Posts can include images (single or multiple)
- Posts can be saved as drafts

**Acceptance Criteria:**
- [~] Rich text editor with Telegram formatting support (basic editor exists)
- [~] Image upload functionality (AI-generated images supported, manual upload pending)
- [x] Draft saving and editing
- [x] Preview of how post will appear in Telegram
- [~] Character count and formatting validation (basic)

---

### 3.5 Scheduling & Publishing

**Requirements:**
- Posts can be scheduled for future publication
- Posts can be published immediately
- System handles publishing automatically at scheduled time
- Failed publications are retried with backoff
- Users receive feedback on publish status

**Acceptance Criteria:**
- [~] User can set date/time for scheduled posts (API supports it, UI picker pending)
- [~] Scheduled posts publish automatically (queue exists, scheduler pending)
- [ ] User can cancel scheduled posts
- [~] System retries failed posts (max 3 attempts) (BullMQ retry configured)
- [x] User sees publish status (draft/scheduled/publishing/published/failed)
- [x] Published posts show Telegram message ID

---

### 3.6 Media Management

**Requirements:**
- Support image uploads (JPG, PNG, GIF, WebP)
- Store media in S3-compatible storage
- Support multiple images per post (up to 10)
- Preserve images from scraped content

**Acceptance Criteria:**
- [ ] User can upload images from device
- [~] Images are optimized for Telegram (AI-generated images work)
- [x] Multiple images can be attached to single post (via media groups)
- [~] Scraped images are stored and accessible (partial)
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
- [x] Admin login separate from user login
- [x] Session creation with phone verification + 2FA support
- [x] User management CRUD operations
- [x] Job queue monitoring dashboard
- [ ] Audit log of admin actions

---

### 3.8 Platform Bot

The platform uses a single Telegram bot for all Telegram interactions:
- **User authentication** (login via bot)
- **Channel publishing** (bot is added as admin to user's channels)
- **Notifications** (publish status, alerts, reminders)
- **Post review** (approve/reject auto-generated posts)

#### 3.8.1 Telegram Bot Authentication

**Requirements:**
- Users authenticate via the platform's Telegram bot (no email/password)
- Web app displays a unique, time-limited code for authentication
- User sends the code to the bot to verify identity
- Bot confirms authentication and web app receives session token
- User accounts are auto-created on first successful authentication

**Acceptance Criteria:**
- [x] Web app shows "Login with Telegram" button
- [x] System generates unique 6-character alphanumeric code (expires in 5 minutes)
- [x] Web app displays code and deep link to the platform bot
- [x] Bot validates code and links Telegram user to platform account
- [x] Web app polls for authentication status and redirects on success
- [x] JWT token issued upon successful authentication
- [x] User's Telegram ID, username, and display name stored in database
- [x] Returning users can re-authenticate seamlessly

#### 3.8.2 Bot Notifications

**Requirements:**
- Platform bot sends notifications to users for important events
- Users can configure notification preferences
- Notifications are sent in real-time via Telegram messages

**Notification Types:**
- Post published successfully
- Post publishing failed (with error details)
- Scheduled post reminder (configurable time before)
- Auto-generated post ready for review
- Scraping completed with new content found
- System alerts (e.g., bot token expired, channel access lost)

**Acceptance Criteria:**
- [x] Bot sends notifications for all configured event types
- [ ] User can enable/disable each notification type
- [x] Notifications include relevant context and deep links to web app
- [x] Failed notifications are retried
- [~] Rate limiting prevents notification spam (basic)

#### 3.8.3 Post Review via Bot

**Requirements:**
- When auto-posting is set to "review mode", posts are sent to the bot for approval
- User can approve, edit, or reject posts directly in Telegram
- Approved posts are published immediately or at scheduled time
- Rejected posts are archived with optional feedback

**Acceptance Criteria:**
- [x] Bot sends post preview with text and images
- [x] Inline buttons for: Approve, Edit, Reject, Schedule
- [x] "Approve" publishes the post immediately
- [x] "Edit" opens web app to the post editor
- [x] "Reject" archives the post and optionally collects feedback
- [ ] "Schedule" prompts for date/time selection
- [x] User can view pending review queue via bot command
- [ ] Posts awaiting review expire after configurable time (default: 24 hours)

#### 3.8.4 Bot Commands

**Requirements:**
- Bot supports commands for quick actions without opening web app
- Commands provide status updates and basic management

**Commands:**
- `/start` - Initial bot interaction and help
- `/login` - Generate new authentication code
- `/status` - Overview of channels, pending posts, scheduled posts
- `/pending` - List posts awaiting review
- `/channels` - List managed channels with quick stats
- `/lang` - Switch language (English/Russian)
- `/help` - Command reference and support links

**Acceptance Criteria:**
- [x] All commands respond within 2 seconds
- [x] Commands are context-aware (different response if authenticated vs not)
- [x] Bot provides helpful error messages for invalid commands
- [x] Commands support channel selection for multi-channel users

---

## 4. Technical Requirements

### 4.1 Technology Stack

#### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14+ (Pages Router) | React framework with SSR |
| Tailwind CSS | Utility-first styling |
| React Query (TanStack Query) | Server state and data fetching |
| Zustand | Client state management |
| shadcn/ui | UI component library |
| React Hook Form + Zod | Form handling and validation |
| next-intl | Internationalization (English/Russian) |

#### UI Design System - Telegram Style

The UI must follow Telegram's visual design language to create a familiar and cohesive experience for Telegram channel managers.

**Color Palette:**

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--tg-primary` | `#2AABEE` | `#2AABEE` | Primary actions, links, active states |
| `--tg-primary-dark` | `#229ED9` | `#229ED9` | Primary hover/pressed states |
| `--tg-secondary` | `#34B7F1` | `#34B7F1` | Secondary accents |
| `--tg-background` | `#FFFFFF` | `#212121` | Main background |
| `--tg-surface` | `#F0F2F5` | `#2C2C2C` | Cards, panels, elevated surfaces |
| `--tg-surface-hover` | `#E8EAED` | `#3A3A3A` | Surface hover state |
| `--tg-text-primary` | `#000000` | `#FFFFFF` | Primary text |
| `--tg-text-secondary` | `#707579` | `#AAAAAA` | Secondary/muted text |
| `--tg-text-link` | `#2AABEE` | `#6AB3F3` | Links and interactive text |
| `--tg-border` | `#E0E0E0` | `#3A3A3A` | Borders and dividers |
| `--tg-success` | `#31B545` | `#4FAE4E` | Success states, online indicators |
| `--tg-warning` | `#FFA500` | `#FFB347` | Warning states |
| `--tg-error` | `#E53935` | `#F44336` | Error states, destructive actions |
| `--tg-message-out` | `#EEFFDE` | `#2B5278` | Outgoing message bubbles |
| `--tg-message-in` | `#FFFFFF` | `#182533` | Incoming message bubbles |

**Typography:**

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Heading 1 | System/Geist | 24px | 600 (Semibold) |
| Heading 2 | System/Geist | 20px | 600 (Semibold) |
| Heading 3 | System/Geist | 17px | 600 (Semibold) |
| Body | System/Geist | 15px | 400 (Regular) |
| Body Small | System/Geist | 13px | 400 (Regular) |
| Caption | System/Geist | 12px | 400 (Regular) |

**Component Styling Guidelines:**

- **Buttons**: Rounded corners (8px), solid fill for primary actions, ghost/outline for secondary
- **Cards**: Light shadows, rounded corners (12px), subtle borders in light mode
- **Inputs**: Clean borders, 8px border-radius, focus state with primary color
- **Lists**: Clean dividers, generous padding, hover states
- **Icons**: Line-style icons, consistent 24px base size
- **Spacing**: 8px base unit (8, 16, 24, 32, 48px scale)
- **Transitions**: Smooth 150-200ms transitions for hover/focus states

**Dark Mode:**
- Must support system-preference detection
- User can override with manual toggle
- Preference stored per user
- All components must be designed for both modes

**Telegram-Specific UI Elements:**
- Message bubble preview for post previews (styled like Telegram messages)
- Channel card design similar to Telegram's channel info
- Avatar/profile picture circular with 2px primary border for selected states
- Status indicators (online dot, typing animation) matching Telegram style
- Action sheets and modals with iOS-style rounded corners and backdrop blur

#### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Next.js API Routes | REST API endpoints |
| PostgreSQL + Prisma ORM | Database and data access |
| BullMQ | Job queue processing |
| Redis | Queue backend and caching |
| MinIO | S3-compatible file storage |

#### Infrastructure

**Requirement:** The entire application stack MUST run via Docker Compose for both local development and deployment. All services should be containerized with no external dependencies beyond Docker.

| Service | Version/Image | Port | Purpose |
|---------|---------------|------|---------|
| PostgreSQL | 15-alpine | 5432 | Primary database |
| Redis | 7-alpine | 6379 | Job queues and caching |
| MinIO | latest | 9000, 9001 | Object storage for images |
| Main App | Next.js | 3000 | User-facing application |
| Admin App | Next.js | 3001 | Admin interface |
| Worker | Node.js | - | Background job processor |

**Docker Compose Requirements:**
- Single `docker-compose up` command to start entire stack
- Health checks for all services
- Volume persistence for database and file storage
- Environment variables via `.env` file
- Hot-reload support for development

### 4.2 External Integrations

| Service | Purpose | API Type |
|---------|---------|----------|
| Telegram Bot API (Platform Bot) | Authentication, notifications, post review, channel publishing | REST (webhooks) |
| Telegram MTProto | Scraping channels | MTProto |
| OpenRouter | AI content generation | REST (OpenAI-compatible) |

### 4.3 AI Provider

- **Provider**: OpenRouter (unified API for multiple AI models)
- **Default Model**: `google/gemini-3-flash-preview`

### 4.4 Security Requirements

- JWT-based authentication (issued after Telegram verification)
- Telegram Bot-based user authentication (no email/password)
- Encrypted storage for sensitive data (bot tokens, session strings)
- Rate limiting on API endpoints
- Input validation and sanitization

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

### 5.5 Internationalization (i18n)

**Supported Languages:**
- English (en) - default
- Russian (ru)

**Requirements:**
- All UI text in web app must be translatable
- Platform bot messages must support both languages
- User can select preferred language in settings
- Bot detects user's Telegram language on first interaction and sets default
- Language preference stored per user
- Date/time formatting respects locale (e.g., DD.MM.YYYY for Russian)

**Scope:**
- Web app interface (all pages, forms, buttons, messages)
- Platform bot messages and commands
- Email notifications (if added later)
- Error messages and validation text
- Bot inline buttons and menus

**Acceptance Criteria:**
- [x] Language switcher available in web app header/settings
- [x] All static UI text extracted to translation files
- [x] Bot responds in user's preferred language
- [x] Bot `/lang` command allows language switching
- [~] Dates and numbers formatted per locale (basic)
- [x] New translations can be added without code changes

---

## 6. User Flows

### 6.1 New User Onboarding

```
1. User opens web app and clicks "Login with Telegram"
2. User is shown a unique code and link to the platform bot
3. User sends the code to the platform bot in Telegram
4. Bot verifies the code and authenticates the user
5. User is redirected to the dashboard (account auto-created on first login)
6. User creates first channel:
   - User adds platform bot as admin to their Telegram channel
   - User enters channel username/ID in the web app
   - System verifies bot has posting permissions
   - User configures channel settings (niche, tone, language)
7. User adds content sources (optional)
   - Enters source channel username
   - System assigns scraping session
8. User can now generate content
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

### 6.4 Automatic Posting Setup Flow

```
1. User navigates to channel settings -> "Auto-Posting"
2. User enables automatic posting
3. User configures source mode:
   a. Research-based: Enter topics/keywords to monitor
   b. Scraped-based: Select content sources to trigger auto-generation
   c. Both: Configure both options
4. User configures schedule:
   - Frequency (hourly, daily, custom cron)
   - Time windows (e.g., only post between 9am-9pm)
   - Daily/weekly post limits
5. User selects publishing mode:
   - Auto-publish (fully autonomous)
   - Review-first (posts sent to bot for approval)
   - Scheduled (queue for optimal times)
6. User enables/pauses auto-posting
7. System starts autonomous operation
```

### 6.5 Automatic Posting Execution Flow (Scraped Content)

```
1. Scraping worker finds new posts from content sources
2. System checks if auto-posting is enabled for the channel
3. For each new scraped post:
   - AI analyzes content and extracts key themes
   - If post has images: AI analyzes images via vision model
   - AI generates original post inspired by scraped content
   - If configured: AI generates similar images
4. Based on publishing mode:
   a. Auto-publish: Post is published immediately
   b. Review-first: Post sent to user via platform bot
   c. Scheduled: Post queued for next optimal time slot
5. User receives notification via bot
6. Post logged in auto-posting history
```

### 6.6 Automatic Posting Execution Flow (Research-Based)

```
1. Scheduler triggers research job based on configured schedule
2. System performs web research on configured topics/keywords
3. AI synthesizes findings and generates post content
4. If configured: AI generates relevant images
5. Based on publishing mode:
   a. Auto-publish: Post is published immediately
   b. Review-first: Post sent to user via platform bot
   c. Scheduled: Post queued for next optimal time slot
6. User receives notification via bot
7. Post logged in auto-posting history
```

### 6.7 Post Review via Bot Flow

```
1. Auto-generated post is ready for review
2. Platform bot sends message to user with:
   - Post preview (text + images)
   - Source information (research topic or scraped post reference)
   - Inline buttons: [Approve] [Edit] [Reject] [Schedule]
3. User taps a button:
   a. Approve: Post published immediately, user notified
   b. Edit: Deep link opens web app post editor
   c. Reject: Post archived, optional feedback prompt
   d. Schedule: Bot prompts for date/time, then queues post
4. Action logged and dashboard updated
```

---

## 7. Data Model (High-Level)

### Core Entities

- **User**: Platform users (linked to Telegram account via telegramId, includes language preference)
- **AuthCode**: Temporary authentication codes for Telegram login flow
- **Channel**: Telegram channel (ID, username) with settings (platform bot publishes to all channels)
- **ContentSource**: Source channels to scrape for inspiration
- **ScrapedContent**: Posts scraped from source channels
- **Post**: Generated/written posts (draft, scheduled, pending_review, published)
- **MediaFile**: Uploaded or scraped images
- **ImageAnalysis**: AI-generated analysis of scraped images (style, subject, composition)
- **SvgStyleConfig**: User preferences for SVG generation (theme color, text color, style prompt, font style)
- **AutoPostConfig**: Configuration for automatic research-based posting per channel
- **AutoPostLog**: History of automatically generated posts and their status
- **NotificationPreference**: User preferences for bot notifications
- **PendingReview**: Posts awaiting user approval via bot

### Admin Entities

- **AdminUser**: Admin accounts with elevated privileges
- **TelegramSession**: MTProto sessions for scraping
- **JobLog**: Background job execution history
- **AuditLog**: Admin action history

---

## 8. MVP Scope

### Phase 1 (MVP) ✅ COMPLETED

- ✅ Telegram bot authentication (login via platform bot)
- ✅ Channel management (add, configure, delete)
- ✅ Content source management
- ✅ Basic scraping (text only)
- ✅ AI generation from prompt
- ✅ Manual post creation
- ✅ Immediate publishing
- ✅ Basic admin panel
- ✅ Basic bot notifications (publish success/failure)
- ✅ Multi-language support (English/Russian) for web app and bot

### Phase 2 (In Progress)

- ✅ AI generation from scraped content
- ⬜ AI generation from web research
- 🟡 Image support (AI-generated ✅, manual upload ⬜)
- ⬜ SVG image generation (AI-generated infographics, quote cards, diagrams)
- 🟡 Scheduled publishing (queue ready, UI/scheduler pending)
- ⬜ Post analytics (views, forwards)
- ✅ Image analysis for scraped content (Gemini Flash 3)
- ✅ AI image generation based on analyzed images
- ✅ Post review via bot (approve/reject/edit)
- 🟡 Full notification preferences (notifications work, preferences UI pending)

### Phase 3

- Multiple images per post
- Advanced scheduling (recurring posts)
- Automatic research-based posting (auto-generation schedules)
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

- Users have Telegram accounts for authentication
- Users have existing Telegram channels and can add bots as admins
- Users understand basic Telegram channel concepts
- Admin will manage session pool for scraping
- OpenRouter API availability and pricing remains stable
- Platform bot token is configured and accessible
- Users will add the single platform bot as admin to their channels
