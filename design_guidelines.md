# AI Course Builder - Design Guidelines

## Design Approach

**System:** Modern SaaS Dashboard (Linear's clarity + Notion's content hierarchy + Stripe's restraint)

**Rationale:** Utility-focused productivity tool requiring distraction-free learning experiences, efficient course management workflows, and clear information architecture. Design prioritizes content readability and functional efficiency over decorative elements.

**Core Principles:**
1. Content-first hierarchy - Typography and whitespace drive clarity
2. Contextual density - Dense dashboards, spacious reading experiences
3. Purposeful minimalism - Every element serves a function
4. Consistent patterns - Unified experience across creator/member flows

---

## Typography

**Fonts:**
- Primary (UI/Navigation): Inter via Google Fonts
- Content (Lessons): System font stack for optimal readability

**Scale:**
```
Hero/Page Titles: 40px (text-4xl), font-bold
Section Headers: 28px (text-3xl), font-semibold
Subsection Headers: 20px (text-xl), font-semibold
Card/Module Titles: 18px (text-lg), font-medium
Body/Lesson Text: 16px (text-base), font-normal, leading-relaxed
UI Labels: 14px (text-sm), font-medium
Metadata/Captions: 13px (text-xs), font-normal
```

---

## Layout System

**Spacing Primitives:** Tailwind units of **4, 6, 8, 12, 16** exclusively
- Component padding: p-6 to p-8
- Section gaps: gap-6 to gap-8
- Vertical rhythm: mb-12 to mb-16 between major sections

**Containers:**
- App wrapper: max-w-7xl mx-auto px-6
- Lesson content: max-w-3xl mx-auto (optimal reading width ~65-75 characters)
- Dashboard grids: Full width within wrapper

**Grid Patterns:**
- Course cards: grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6
- Stats dashboard: grid-cols-2 lg:grid-cols-4 gap-4
- Two-column forms: grid-cols-1 lg:grid-cols-2 gap-8

---

## Component Library

### Navigation
**Top Bar:** Fixed header (h-16), logo left, navigation center, user menu right. Border bottom separator.
**Course Drawer (Lesson View):** w-72 fixed sidebar, collapsible mobile. Nested accordion (modules → lessons), active state highlight, drag handles for reordering.

### Cards
**Course Cards:** rounded-lg, p-6, border subtle. Contains: cover image (aspect-video, h-44), title, truncated description (2 lines), metadata row (module count, lesson count, duration estimate), price badge, status indicator, primary CTA.

**Stat Cards (Creator):** Compact p-4, large number (text-3xl font-bold), label below (text-sm), subtle icon top-right.

**Module/Lesson Cards (Editor):** Expandable accordion, p-6, reorder handles, inline title editing, regenerate action, completion checkbox.

### Forms
**Course Generator:** Centered layout with max-w-2xl, large textarea (min-h-40), generous mb-8 spacing, prominent submit button (px-8 py-4). Loading state with spinner overlay during generation.

**Course Editor:** Vertical stack of module cards, add module button between sections, pricing toggle (free/paid) with conditional price input, publish controls in sticky footer.

### Lesson Content
**Reading Container:** Generous px-16 py-20 on desktop (px-6 py-12 mobile), max-w-3xl centered. Prose styling: headings with mb-4, paragraphs with mb-6, lists with ml-6 mb-4, code blocks with rounded corners and p-4.

### Buttons
**Primary:** px-6 py-3, rounded-lg, font-semibold, text-base
**Secondary:** px-4 py-2, rounded-lg, font-medium, text-sm
**Icon Buttons:** p-2, rounded-md (compact actions)

### Status Elements
**Badges:** px-3 py-1, rounded-full, text-xs font-medium, with status dot
**Progress Bars:** h-2 rounded-full, shows completion percentage
**Purchase CTAs:** Fixed bottom bar on mobile for locked courses, inline button desktop

---

## Key Screen Layouts

### Creator Dashboard
Header: Welcome message + "Create New Course" CTA (px-8 py-4, prominent). Stats row (4 cards spanning full width). Course management grid below with search bar (sticky). Each card shows hover state with edit/analytics/publish quick actions.

### AI Generator Flow
Centered card (max-w-3xl), stepped process: 1) Topic input with examples, 2) Generation preview (tree view of modules/lessons), 3) Refinement controls (regenerate individual sections), 4) Publish options. Sticky action bar at bottom.

### Member Library
Grid view with filters (tabs: All, My Courses, Free, Paid). Each card shows ownership status, progress ring for enrolled courses, price + purchase CTA for locked. Empty state illustration (300px) for new users.

### Lesson Reader
Three-panel: Left drawer (w-72) with module tree, main content (flex-1) with generous padding, optional right panel (w-64) for notes/progress. Sticky header with course title, breadcrumb, close button. Mobile: Full-screen content, drawer toggles from hamburger.

---

## Images

**Strategy:** Minimal, functional imagery supporting content hierarchy.

**Course Cards:** Optional cover image (aspect-video, rounded-t-lg). Default: Subtle gradient if none provided.

**Dashboard Decorative Elements:** Small abstract illustrations (180-220px) in:
- Empty states: "No courses yet" centered illustration
- Generator success: Checkmark/sparkle graphic after generation
- Access denied: Lock illustration (200px) for unpaid courses

**Onboarding/Welcome:** Single illustration (300px) in creator dashboard welcome section, showing simplified course creation concept.

**No Hero Images:** This is a functional dashboard app, not a marketing site.

---

## Responsive Strategy

**Mobile-First Adjustments:**
- Single column everywhere (grid-cols-1)
- Drawer navigation: Hidden by default, hamburger toggle
- Stats: Stack vertically with mb-4 spacing
- Lesson reader: px-4 py-8 reduced padding
- Sticky CTAs: Fixed bottom for purchase/enroll actions

**Tablet (md):** Two-column grids, persistent drawer option

**Desktop (lg+):** Three-column grids, full sidebar layouts, hover states active

---

## Accessibility & Polish

- Focus rings on all interactive elements (ring-2 ring-offset-2)
- Semantic HTML5 structure (nav, main, article, aside)
- ARIA labels on icon buttons and drawer controls
- Keyboard navigation: Arrow keys in lesson drawer, Tab through forms
- Screen reader announcements for AI generation progress
- Sufficient contrast throughout (WCAG AA minimum)
- Consistent 60fps animations (transitions only on transform/opacity)

---

**Design Philosophy:** Every pixel serves content consumption or course creation. Whitespace is not empty—it provides breathing room for focus and comprehension. The interface disappears, letting courses and learning take center stage.