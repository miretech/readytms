# Ready Carrier TMS - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from modern SaaS TMS platforms (Alvys, Samsara, KeepTruckin) combined with enterprise productivity tools (Linear, Notion) to create a professional, efficient transportation management interface.

**Core Design Principles**:
- Data clarity and hierarchy for quick decision-making
- Efficient workflows minimizing clicks and cognitive load
- Professional trustworthiness appropriate for logistics industry
- Scalable component system for complex data tables and forms

---

## Color Palette

### Light Mode
- **Primary Brand**: 217 91% 40% (Professional blue - trust and reliability)
- **Primary Hover**: 217 91% 35%
- **Accent**: 142 76% 36% (Success green for completed loads/positive metrics)
- **Background**: 0 0% 100%
- **Surface**: 220 13% 97% (Card backgrounds)
- **Border**: 220 13% 91%
- **Text Primary**: 222 47% 11%
- **Text Secondary**: 215 14% 34%
- **Warning**: 38 92% 50% (For alerts, maintenance due)
- **Danger**: 0 84% 60% (Critical issues, overdue)

### Dark Mode
- **Primary Brand**: 217 91% 60%
- **Primary Hover**: 217 91% 55%
- **Accent**: 142 76% 45%
- **Background**: 222 47% 11%
- **Surface**: 217 33% 17%
- **Border**: 217 33% 24%
- **Text Primary**: 0 0% 98%
- **Text Secondary**: 215 20% 65%

---

## Typography

**Font Stack**: 'Inter', system-ui, -apple-system, sans-serif (via Google Fonts)

**Hierarchy**:
- **Page Titles**: text-3xl (30px), font-semibold, tracking-tight
- **Section Headers**: text-xl (20px), font-semibold
- **Card Titles**: text-lg (18px), font-medium
- **Body Text**: text-base (16px), font-normal
- **Labels/Meta**: text-sm (14px), font-medium
- **Captions/Helpers**: text-xs (12px), font-normal

**Line Heights**: Use default Tailwind (leading-normal for body, leading-tight for headings)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Component padding: p-4 to p-6
- Section spacing: gap-6 to gap-8
- Page margins: p-6 on mobile, p-8 on desktop

**Grid System**:
- Dashboard: 12-column grid (grid-cols-12) for flexible layouts
- Cards: 1-column mobile, 2-3 columns tablet/desktop
- Data tables: Full-width with horizontal scroll on mobile

**Container Widths**:
- Full dashboard: w-full with max-w-[1600px]
- Content areas: max-w-7xl
- Forms: max-w-2xl

---

## Component Library

### Navigation
- **Top Bar**: Fixed header with logo (left), search (center), notifications + user menu (right), h-16, bg-surface with bottom border
- **Sidebar**: Fixed left sidebar w-64 desktop (collapsible to w-16), hidden on mobile with drawer overlay, nav items with icons + text, active state with left accent border and subtle background

### Data Display
- **Tables**: Striped rows, hover states, sticky headers, sortable columns, row actions menu (3-dot), pagination at bottom
- **Status Badges**: Pill-shaped with icon, color-coded (green=delivered, blue=in-transit, yellow=pending, red=issue)
- **Metric Cards**: Large number with label, trend indicator (up/down arrow), optional sparkline chart, min-h-32

### Forms
- **Input Fields**: rounded-lg border, focus:ring-2 ring-primary, labels above inputs (text-sm font-medium), helper text below in text-secondary
- **Selects**: Custom styled with chevron icon, searchable for long lists (driver/truck assignment)
- **Date Pickers**: Calendar overlay with range selection for load schedules
- **Multi-step Forms**: Progress indicator at top, previous/next navigation, save draft capability

### Overlays
- **Modals**: max-w-2xl centered, rounded-xl shadow-2xl, backdrop blur, slide-up animation
- **Slideovers**: Fixed right panel w-96 to w-[600px], for load details/edit forms
- **Toast Notifications**: Top-right position, auto-dismiss, success/error/info variants

### Actions
- **Primary Buttons**: bg-primary text-white, rounded-lg, px-6 py-2.5, hover:bg-primary-hover
- **Secondary Buttons**: border border-border bg-transparent, hover:bg-surface
- **Icon Buttons**: Circular or square, p-2, for table actions and toolbars
- **Floating Action Button**: Fixed bottom-right for "Create Load" (mobile), size-14 rounded-full shadow-lg

---

## Dashboard-Specific Components

### Dispatch Board
- **Kanban Layout**: 4-5 columns (Available Trucks, Pending Loads, In Transit, Delivered, Issues)
- **Draggable Cards**: shadow-sm cards with load number, route, driver, truck, estimated delivery
- **Column Headers**: Count badges, filter dropdown, sticky positioning

### Load Detail View
- **Split Layout**: Left column (2/3) for load info, timeline, documents; Right column (1/3) for quick actions, driver contact, truck details
- **Timeline Component**: Vertical line with status dots, timestamps, location updates
- **Document Section**: Grid of thumbnail cards for BOL, POD, invoices with upload/download actions

### Fleet Map View
- **Map Integration**: Full-height embedded map (use Mapbox/Google Maps placeholder comments)
- **Truck Markers**: Color-coded by status, click for popup with truck details
- **Route Lines**: Animated path from pickup to delivery

---

## Images

**Hero Image** (Landing/Marketing Page): 
- Full-width hero section featuring a modern semi-truck on highway at golden hour, professional driver in cab close-up, or aerial view of logistics yard with organized trucks
- Image should convey professionalism, reliability, and modern technology
- Overlay: Dark gradient bottom-to-top (from 80% opacity to 0%) for text readability

**Dashboard Illustrations**:
- Empty states: Simple line illustrations of trucks, documents, or routes with helpful onboarding text
- Error states: Friendly illustration with clear error message and recovery action

**Marketing Sections**:
- Feature showcases: Screenshots of actual dashboard UI within device mockups
- Team/About: Professional photos of operations team, drivers, or office environment
- No generic stock photos of handshakes or business people

---

## Interactions & Micro-animations

**Keep Minimal**:
- Smooth transitions: transition-all duration-200 ease-in-out for hover states
- Loading states: Subtle skeleton screens, spinner for async operations
- Page transitions: Fade-in on route change
- **Avoid**: Elaborate animations, parallax effects, unnecessary motion

---

## Responsive Behavior

- **Mobile (< 768px)**: Single column, hamburger menu, bottom navigation bar for primary actions, simplified tables (card view)
- **Tablet (768px - 1024px)**: Sidebar collapses, 2-column grids, responsive tables with horizontal scroll
- **Desktop (> 1024px)**: Full sidebar, multi-column layouts, data-rich table views, split panels

---

## Key User Flows

1. **Create Load**: Modal/form with steps (customer info → pickup/delivery → assign truck/driver → rate confirmation)
2. **Dispatch Assignment**: Drag load card to available truck, confirmation modal with route details
3. **Update Load Status**: Quick status dropdown on table row, or timeline update in detail view
4. **Driver Settlement**: Table with filters, bulk select actions, export to CSV/PDF

This design creates a professional, efficient TMS that balances data density with usability, ensuring Ready Carrier's operations run smoothly with clear visual hierarchy and intuitive workflows.