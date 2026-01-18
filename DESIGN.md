# DESIGN.md - Telegram-Style Design System

This document defines the design standards for the AI Telegram Channels Platform. The UI should closely resemble Telegram's native aesthetic while maintaining usability for channel management workflows.

---

## Design Philosophy

### Core Principles

1. **Telegram-Native Feel**: Users should feel like they're using an extension of Telegram
2. **Clean & Minimal**: Prioritize content over chrome
3. **Fast & Responsive**: Animations should be subtle and purposeful
4. **Dark Mode First**: Telegram users expect dark mode support
5. **Mobile-Friendly**: Touch-friendly targets, responsive layouts

### Visual Reference

- Telegram Desktop (macOS/Windows)
- Telegram Web (web.telegram.org)
- Telegram iOS/Android for mobile patterns

---

## Color Palette

### Light Mode

```css
/* Backgrounds */
--bg-primary: #ffffff;           /* Main content background */
--bg-secondary: #f4f4f5;         /* Page background, sidebars */
--bg-tertiary: #e8e8e9;          /* Hover states, dividers */
--bg-message: #effdde;           /* Sent message bubble (green) */
--bg-message-incoming: #ffffff;  /* Received message bubble */

/* Accent Colors */
--accent-primary: #3390ec;       /* Telegram blue - primary actions */
--accent-secondary: #50a8eb;     /* Lighter blue - hover states */
--accent-tertiary: #c5e1f9;      /* Very light blue - backgrounds */

/* Text Colors */
--text-primary: #000000;         /* Main text */
--text-secondary: #707579;       /* Secondary text, captions */
--text-tertiary: #999999;        /* Disabled, placeholder */
--text-link: #3390ec;            /* Links */
--text-on-accent: #ffffff;       /* Text on blue buttons */

/* Status Colors */
--status-online: #0ac630;        /* Online indicator green */
--status-success: #31b545;       /* Success states */
--status-warning: #e9a519;       /* Warning states */
--status-error: #e53935;         /* Error states */
--status-pending: #999999;       /* Pending/draft states */

/* Borders */
--border-primary: #e0e0e0;       /* Main borders */
--border-secondary: #f0f0f0;     /* Subtle borders */
```

### Dark Mode

```css
/* Backgrounds */
--bg-primary: #212121;           /* Main content background */
--bg-secondary: #181818;         /* Page background, sidebars */
--bg-tertiary: #2c2c2c;          /* Hover states */
--bg-message: #766ac8;           /* Sent message bubble (purple) */
--bg-message-incoming: #2c2c2c;  /* Received message bubble */

/* Accent Colors */
--accent-primary: #8774e1;       /* Telegram purple in dark mode */
--accent-secondary: #9d8ce8;     /* Lighter purple */
--accent-tertiary: #3d3654;      /* Dark purple backgrounds */

/* Text Colors */
--text-primary: #ffffff;
--text-secondary: #aaaaaa;
--text-tertiary: #707070;
--text-link: #8774e1;
--text-on-accent: #ffffff;

/* Status Colors */
--status-online: #0ac630;
--status-success: #4fae4e;
--status-warning: #daa520;
--status-error: #ff6b6b;
--status-pending: #707070;

/* Borders */
--border-primary: #303030;
--border-secondary: #252525;
```

---

## Typography

### Font Stack

```css
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
               'Helvetica Neue', Arial, sans-serif;
--font-mono: 'SF Mono', 'Fira Code', 'Consolas', monospace;
```

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Title Large | 24px | 600 | 1.2 | Page titles |
| Title | 20px | 600 | 1.3 | Section headers |
| Title Small | 17px | 600 | 1.3 | Card titles, modal headers |
| Body | 15px | 400 | 1.4 | Main content |
| Body Small | 14px | 400 | 1.4 | Secondary content |
| Caption | 13px | 400 | 1.3 | Labels, timestamps |
| Caption Small | 12px | 400 | 1.2 | Badges, tags |

### Telegram Text Formatting

Support these formats in post editor/preview:
- **Bold**: `**text**` or `<b>text</b>`
- *Italic*: `__text__` or `<i>text</i>`
- `Monospace`: `` `text` `` or `<code>text</code>`
- ~~Strikethrough~~: `~~text~~` or `<s>text</s>`
- Spoiler: `||text||` or `<tg-spoiler>text</tg-spoiler>`
- [Links](url): `[text](url)` or `<a href="url">text</a>`

---

## Spacing

Use a 4px base unit system:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### Common Spacing Patterns

| Element | Spacing |
|---------|---------|
| Page padding | 16px (mobile), 24px (desktop) |
| Card padding | 16px |
| Section gap | 24px |
| List item padding | 12px 16px |
| Button padding | 10px 20px |
| Input padding | 12px 16px |
| Icon margin | 8px |

---

## Border Radius

```css
--radius-sm: 4px;     /* Tags, badges */
--radius-md: 8px;     /* Buttons, inputs */
--radius-lg: 12px;    /* Cards, modals */
--radius-xl: 16px;    /* Large cards */
--radius-full: 9999px; /* Avatars, pills */
```

### Component-Specific Radius

| Component | Radius |
|-----------|--------|
| Message bubble | 12px (18px for corners touching edge) |
| Button | 8px |
| Input | 8px |
| Card | 12px |
| Modal | 16px |
| Avatar | 50% (circle) |
| Badge | 4px |

---

## Shadows

Telegram uses subtle, minimal shadows:

```css
/* Light mode */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.12);
--shadow-popup: 0 2px 20px rgba(0, 0, 0, 0.16);

/* Dark mode */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.4);
--shadow-popup: 0 2px 20px rgba(0, 0, 0, 0.5);
```

---

## Components

### Buttons

#### Primary Button
```css
background: var(--accent-primary);
color: var(--text-on-accent);
border-radius: var(--radius-md);
padding: 10px 20px;
font-weight: 500;
transition: background 0.15s ease;

/* Hover */
background: var(--accent-secondary);

/* Active */
transform: scale(0.98);

/* Disabled */
opacity: 0.5;
cursor: not-allowed;
```

#### Secondary Button
```css
background: transparent;
color: var(--accent-primary);
border: 1px solid var(--border-primary);
border-radius: var(--radius-md);

/* Hover */
background: var(--bg-tertiary);
```

#### Icon Button
```css
width: 40px;
height: 40px;
border-radius: var(--radius-full);
display: flex;
align-items: center;
justify-content: center;
color: var(--text-secondary);

/* Hover */
background: var(--bg-tertiary);
color: var(--text-primary);
```

### Inputs

#### Text Input
```css
background: var(--bg-secondary);
border: none;
border-radius: var(--radius-md);
padding: 12px 16px;
font-size: 15px;
color: var(--text-primary);

/* Focus */
outline: 2px solid var(--accent-primary);
outline-offset: -2px;

/* Placeholder */
color: var(--text-tertiary);
```

#### Textarea
Same as text input, but:
```css
min-height: 100px;
resize: vertical;
```

### Cards

```css
background: var(--bg-primary);
border-radius: var(--radius-lg);
border: 1px solid var(--border-secondary);
/* No shadow by default - Telegram style */

/* Hover (interactive cards) */
background: var(--bg-tertiary);
```

### Message Bubbles (Post Preview)

#### Outgoing Message (User's Post)
```css
background: var(--bg-message);
border-radius: 12px 12px 4px 12px;
padding: 8px 12px;
max-width: 480px;

/* Tail pointing right */
&::after {
  /* SVG tail shape */
}
```

#### Message Meta
```css
font-size: 12px;
color: rgba(0, 0, 0, 0.35); /* or rgba(255, 255, 255, 0.5) in dark */
text-align: right;
margin-top: 2px;
```

### Navigation

#### Header
```css
background: var(--bg-primary);
border-bottom: 1px solid var(--border-secondary);
height: 56px;
padding: 0 16px;
display: flex;
align-items: center;
position: sticky;
top: 0;
z-index: 100;
```

#### Sidebar (Desktop)
```css
width: 320px;
background: var(--bg-secondary);
border-right: 1px solid var(--border-secondary);
height: 100vh;
overflow-y: auto;
```

#### List Item
```css
padding: 12px 16px;
display: flex;
align-items: center;
gap: 12px;
cursor: pointer;

/* Hover */
background: var(--bg-tertiary);

/* Selected */
background: var(--accent-tertiary);
```

### Modals

```css
/* Overlay */
background: rgba(0, 0, 0, 0.4);

/* Modal */
background: var(--bg-primary);
border-radius: var(--radius-xl);
max-width: 420px;
width: 90%;
max-height: 85vh;
overflow-y: auto;
box-shadow: var(--shadow-popup);
```

### Status Badges

```css
/* Base */
display: inline-flex;
align-items: center;
padding: 2px 8px;
border-radius: var(--radius-sm);
font-size: 12px;
font-weight: 500;

/* Draft */
background: var(--bg-tertiary);
color: var(--text-secondary);

/* Scheduled */
background: var(--accent-tertiary);
color: var(--accent-primary);

/* Publishing */
background: #fff3cd;
color: #856404;

/* Published */
background: #d4edda;
color: #155724;

/* Failed */
background: #f8d7da;
color: #721c24;
```

### Loading States

#### Spinner
```css
/* Telegram uses a circular progress indicator */
width: 24px;
height: 24px;
border: 2px solid var(--bg-tertiary);
border-top-color: var(--accent-primary);
border-radius: 50%;
animation: spin 0.8s linear infinite;
```

#### Skeleton
```css
background: linear-gradient(
  90deg,
  var(--bg-tertiary) 25%,
  var(--bg-secondary) 50%,
  var(--bg-tertiary) 75%
);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
border-radius: var(--radius-md);
```

---

## Icons

### Icon Style
- Line icons (not filled)
- Stroke width: 1.5px - 2px
- Size: 20px (small), 24px (default), 28px (large)
- Color: `var(--text-secondary)` or `var(--text-primary)`

### Common Icons (Reference: Heroicons or custom SVGs)
- Back arrow: `←`
- Settings: Gear
- Add: `+`
- Close: `×`
- Send: Paper plane
- Generate/AI: Sparkles or lightning
- Channel: Megaphone
- Post: Document
- Schedule: Clock
- Publish: Arrow up / Send

---

## Layout Patterns

### Page Structure
```
┌────────────────────────────────────┐
│  Header (56px)                     │
├────────────────────────────────────┤
│                                    │
│  Main Content                      │
│  (max-width: 768px, centered)      │
│                                    │
└────────────────────────────────────┘
```

### Channel Management View (Desktop)
```
┌──────────┬─────────────────────────┐
│          │  Header                 │
│ Sidebar  ├─────────────────────────┤
│ (320px)  │                         │
│          │  Content Area           │
│          │                         │
└──────────┴─────────────────────────┘
```

### Post Editor View
```
┌────────────────────────────────────┐
│  Header with Actions               │
├──────────────────┬─────────────────┤
│                  │                 │
│  Editor          │  Preview        │
│  (Textarea)      │  (Message       │
│                  │   Bubble)       │
│                  │                 │
└──────────────────┴─────────────────┘
```

---

## Animations

### Transitions
```css
--transition-fast: 0.1s ease;
--transition-normal: 0.15s ease;
--transition-slow: 0.3s ease;
```

### Common Animations

#### Button Press
```css
transform: scale(0.98);
transition: transform 0.1s ease;
```

#### Modal Enter
```css
animation: modal-enter 0.2s ease;

@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

#### List Item Appear
```css
animation: slide-up 0.2s ease;

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Responsive Breakpoints

```css
/* Mobile first */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Laptops */
--breakpoint-xl: 1280px;  /* Desktops */
```

### Mobile-Specific Patterns
- Full-width cards (no side margins)
- Bottom sheet modals instead of centered
- Larger touch targets (48px minimum)
- Sticky bottom navigation (if applicable)

---

## Accessibility

### Focus States
```css
/* All interactive elements */
&:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

### Color Contrast
- Text on backgrounds: minimum 4.5:1 ratio
- Large text / UI components: minimum 3:1 ratio
- Check both light and dark mode

### Touch Targets
- Minimum 44px × 44px for mobile
- Minimum 40px × 40px for desktop

---

## Component Library

Use Tailwind CSS utility classes that map to these design tokens. Define custom classes in `globals.css` for commonly repeated patterns:

```css
/* Example utility classes */
.btn-primary { /* Primary button styles */ }
.btn-secondary { /* Secondary button styles */ }
.input-default { /* Default input styles */ }
.card { /* Card container */ }
.message-bubble { /* Message bubble */ }
.badge { /* Status badge base */ }
.badge-success { /* Green badge */ }
.badge-warning { /* Yellow badge */ }
.badge-error { /* Red badge */ }
```

---

## Implementation Checklist

- [ ] Set up CSS variables for colors (light/dark)
- [ ] Implement dark mode toggle
- [ ] Create base button components
- [ ] Create input/textarea components
- [ ] Create card component
- [ ] Create message bubble preview
- [ ] Create modal component
- [ ] Create header component
- [ ] Create status badges
- [ ] Create loading states (spinner, skeleton)
- [ ] Test all components in both themes
- [ ] Test responsive breakpoints
- [ ] Verify accessibility (contrast, focus states)

---

## Examples

### Login Page
- Centered card on gradient background
- Telegram logo prominent
- Large, clear auth code display
- Step-by-step instructions with numbered circles
- Primary CTA button for "Open Telegram"

### Dashboard
- Clean header with app name and user
- Quick action cards in grid
- Empty state with illustration and CTA

### Channel List
- List view with channel avatars
- Channel name, username, post count
- Status indicators
- Hover state for selection

### Channel Detail / Posts
- Header with channel info
- Action buttons (Generate, New Post)
- Post list with message preview style
- Status badges on each post
- Publish/Edit actions

### Post Editor
- Split view: editor | preview
- Telegram-style message bubble in preview
- Character count
- Formatting toolbar (optional)
- Save Draft / Publish buttons

---

## File Reference

| File | Purpose |
|------|---------|
| `DESIGN.md` | This document |
| `globals.css` | CSS variables, base styles |
| `_app.tsx` | Theme provider, font loading |
| Components in `components/` | Reusable UI components |
