# Frontend Style Guide -

> **Purpose:** This document captures the complete frontend architecture, technology choices, design patterns, visual style, and coding conventions of a production enterprise analytics dashboard. Use it as a blueprint to generate frontends with the same look, feel, and quality for any project.

---

## 1. Technology Stack

### Core
| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.x | UI framework (functional components only, no class components) |
| **TypeScript** | ~5.6 | Strict typing everywhere — no `any` except rare escape hatches |
| **Vite** | 5.x | Build tool and dev server (fast HMR, ESM-native) |
| **React Router** | 6.x | Client-side routing with nested layouts |

### UI & Styling
| Technology | Purpose |
|---|---|
| **Ant Design 5** | Primary component library (Layout, Menu, Card, Table, Form, Modal, Button, Select, DatePicker, Tag, Drawer, Dropdown, Tooltip, Typography, Space, Row/Col, Tabs, Popconfirm, Statistic, Progress, Alert, Empty, Skeleton, Spin, Divider, Avatar, Badge) |
| **@ant-design/icons** | Icon library — all icons come from here, no external icon packs |
| **Tailwind CSS 4** | Utility classes for layout/spacing only (NOT for colors or theming — those use CSS variables) |
| **CSS Variables** | All colors and theming through `html[data-theme]` custom properties |
| **ECharts 5** via `echarts-for-react` | All charts (line, bar, pie, area, scatter) — NOT Recharts, NOT Chart.js |

### Data & State
| Technology | Purpose |
|---|---|
| **TanStack React Query 5** | Server state management, caching, loading/error states |
| **Axios** | HTTP client with interceptors (JWT auth, error handling) |
| **dayjs** | Date manipulation (NOT moment.js) |
| **React Context** | App-wide state: theme (light/dark), sidebar (collapsed/expanded), auth |
| **URL query params** | Filter state for global filters (not React state) |
| **useState/useCallback/useMemo** | Feature-local state (e.g., feature-owned filters) |

### Export
| Technology | Purpose |
|---|---|
| **xlsx** (SheetJS) | Excel export functionality |

---

## 2. Project Structure

```
src/
  main.tsx                    # Entry point: providers wrapping order
  App.tsx                     # Route definitions
  index.css                   # Global styles + CSS variables + Ant Design overrides

  api/                        # API layer
    client.ts                 # Axios instance with interceptors
    filters.ts                # Filter options API
    mockData.ts               # Mock data for offline development
    types.ts                  # Shared API types (FilterParams, etc.)

  auth/                       # Authentication system
    auth.types.ts             # AuthAdapter interface, User type
    AuthContext.tsx            # React context
    AuthProvider.tsx           # Provider with adapter pattern
    adapters/
      demoAuth.ts             # Mock auth (offline development)
      prodAuth.ts             # JWT auth (production)
    index.ts                  # Public exports

  components/                 # Shared/reusable components
    ui/                       # Design system primitives
      KpiCard.tsx             # KPI metric card (basic)
      KpiCardV2.tsx           # KPI metric card (with colored icon + trend arrow)
      PageHeader.tsx          # Page title + subtitle + optional action slot
      FiltersBar.tsx          # Global responsive filter bar
      DataTable.tsx           # Themed Ant Design Table wrapper
      ChartWrapper.tsx        # ECharts card with theme integration
      ResponsiveChart.tsx     # ECharts card with auto-responsive heights
      index.ts                # Barrel exports
    ProtectedRoute.tsx        # Auth guard (redirects to /login if unauthenticated)
    AdminRoute.tsx            # Role guard (redirects non-admin to default page)
    ThemeToggle.tsx            # Light/dark mode toggle button

  contexts/                   # React Context providers
    ThemeContext.tsx           # Light/dark mode state + localStorage persistence
    SidebarContext.tsx         # Sidebar collapsed state

  features/                   # Feature modules (one per page/route)
    traffic/
      TrafficPage.tsx          # Page component (assembles sub-components)
      components/              # Feature-specific components
        TrafficKpiGrid.tsx
        TrafficTrendsChart.tsx
        CallDistributionChart.tsx
        TrafficFilters.tsx
        index.ts
      hooks/                   # Feature-owned hooks
        useTrafficData.ts      # React Query hooks for traffic endpoints
        useTrafficFilters.ts   # Feature-owned filter state
        useTrafficFilterOptions.ts
        index.ts
    revenue/                   # Same structure as traffic
    insights/                  # Same structure
    reports/                   # Most complete: adds config/, utils/, types.ts
    users/                     # Admin-only CRUD page

  hooks/                       # Shared hooks
    useFilters.ts              # Global filter state (URL query params)
    useResponsive.ts           # Breakpoint detection + responsive values
    index.ts

  layouts/
    AppLayout.tsx              # Main app shell: sidebar + header + content

  pages/
    Login.tsx                  # Login page (standalone, no layout)

  providers/                   # Data provider pattern (abstraction layer)
    traffic/
      types.ts                 # TrafficMetrics, TrafficTrends interfaces
      LocalTrafficDataProvider.ts
      RemoteTrafficDataProvider.ts
      index.ts
    revenue/                   # Same pattern
    insights/
    reports/

  theme/                       # Design token system
    tokens.ts                  # Brand anchors + semantic tokens (light + dark)
    theme.ts                   # Ant Design dark ThemeConfig
    lightTheme.ts              # Ant Design light ThemeConfig
    echarts.ts                 # ECharts theme generator (from tokens)
    index.ts                   # Barrel exports

  utils/                       # Pure utility functions
    chartTheme.ts              # Chart color/style helpers
    insightsGenerator.ts       # Deterministic insight text generation
    dataUtils.ts               # Data transformation
    exportUtils.ts             # Export helpers
```

### Key Structural Rules
1. **One feature = one folder** under `features/` with its own `components/`, `hooks/`, and optionally `config/`, `utils/`, `types.ts`.
2. **Feature pages own their filter state** — they do NOT share filter state with other pages. Each feature has a `useXxxFilters()` hook.
3. **Shared UI primitives** live in `components/ui/` and are generic (no business logic).
4. **All barrel exports** via `index.ts` files — consumers import from the folder, not the file.

---

## 3. Provider Wrapping Order

The order matters. Outermost providers are available to everything below them.

```tsx
// main.tsx
<React.StrictMode>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
</React.StrictMode>

// App.tsx
<ConfigProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
  <AuthProvider>
    <SidebarProvider>
      <Routes>...</Routes>
    </SidebarProvider>
  </AuthProvider>
</ConfigProvider>
```

### React Query Client Defaults
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

---

## 4. Layout Architecture

### App Shell (AppLayout.tsx)
```
+------+------------------------------------------+
| Side |  Header (sticky, 64px)                   |
| bar  +------------------------------------------+
| 220px|  [Feature-owned FilterBar] (optional)     |
| or   +------------------------------------------+
| 72px |                                           |
| coll.|  Content (scrollable, max-width: 1920px)  |
|      |                                           |
+------+------------------------------------------+
```

**Sidebar behavior:**
- >= 992px (lg): Fixed sidebar, collapsible via logo click (220px expanded, 72px collapsed)
- < 992px: Sidebar becomes a Drawer (slides from left, 260px wide)
- Logo in sidebar acts as collapse/expand toggle
- Menu highlights current route using `selectedKeys={[location.pathname]}`
- Navigation items use `onClick` to call `navigate(e.key)` (key = route path)

**Header:** Fixed at top, 64px height. Contains:
- Left: Page title (derived from current route path)
- Right: Theme toggle + user avatar dropdown (with username on sm+ screens)

**Content area:**
- `padding` is responsive (12px mobile, 16px tablet, 20px laptop, 24px desktop)
- Wrapped in a `max-width: 1920px` container centered with `margin: 0 auto`
- Uses `<Outlet />` for nested route rendering

### Sidebar Content Structure
```
+------------------+
|  [Brand Logo]    |  <- Top: click to toggle collapse. Centered.
+------------------+
|  Navigation      |  <- Middle: flex: 1, overflow-y: auto
|  - Traffic       |
|  - Revenue       |
|  - Insights      |
|  - Reports       |
|  ---divider---   |  <- admin-only section below divider
|  - Users         |
+------------------+
|  [Attribution]   |  <- Bottom: margin-top: auto (always at bottom)
|  "powered by"    |
|  [Partner Logo]  |
+------------------+
```

---

## 5. Visual Design Language

### Color System Architecture

Colors flow through three layers — **never use raw hex in components**:

```
Brand Anchors (immutable)  -->  Semantic Tokens (mode-aware)  -->  CSS Variables (runtime)
```

#### Brand Anchors (from brand book, never change)
```ts
mtn: {
  deep: '#0A0046',       // Platform depth
  core: '#1C1C1C',       // Enterprise surfaces
  yellow: '#FFCB05',     // Primary brand color (signal)
  yellowSoft: '#FFE066', // Soft highlights
}
semantic: {
  success: '#42B52E',    // Green
  teal: '#2FB290',       // Connectivity
  info: '#01B4D2',       // Cyan
}
```

#### CSS Variables (what components actually use)

**Dark theme** — neutral grey material, NOT pure black:
```css
/* Surfaces — layered grey depth */
--bg-base: #202020;        /* Outermost background */
--bg-container: #2A2A2A;   /* Sidebar, header */
--bg-elevated: #383838;    /* Cards, panels */
--bg-hover: #424242;       /* Hover states */

/* Borders */
--border: #4A4A4A;
--border-hover: #5A5A5A;

/* Text — high contrast whites/greys */
--text-primary: #F5F5F5;
--text-secondary: #CCCCCC;
--text-tertiary: #999999;

/* Accents — vibrant on dark backgrounds */
--accent-primary: #FFD633;          /* Brighter brand yellow */
--accent-primary-soft: #2D2410;     /* Muted yellow tint background */
--accent-secondary: #4ADEBD;        /* Vibrant teal */

/* Status colors — brighter for dark mode */
--status-success: #5FE670;
--status-warning: #FB923C;          /* Orange (NOT yellow — avoid brand confusion) */
--status-danger: #FF8A8A;
--status-info: #4DF0FF;
```

**Light theme** — calm, enterprise-grade:
```css
--bg-base: #F4F6FA;
--bg-container: #EEF2F7;
--bg-elevated: #FFFFFF;
--bg-hover: #EDF2FF;
--border: #CBD5E1;
--text-primary: #0A0046;
--text-secondary: #1C1C1C;
--text-tertiary: #64748B;
--accent-primary: #FFCB05;
--status-success: #42B52E;
--status-warning: #F97316;
--status-danger: #DC2626;
--status-info: #01B4D2;
```

### Component Styling Rules
1. **Always use CSS variables** for colors: `color: 'var(--text-primary)'`, `background: 'var(--bg-elevated)'`
2. **Inline styles** on Ant Design components via `style` and `styles` props (NOT CSS classes for component-level styling)
3. **CSS classes** only for: global reusable patterns (`.kpi-card`, `.chart-container`), responsive breakpoints, scrollbar styling
4. **Ant Design `ConfigProvider` theme** overrides component defaults globally (card radius, table header bg, menu colors, etc.)
5. **No raw hex colors in feature components** — everything through CSS vars or theme token imports

### Typography
```
Font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
Base size: 14px
Line height: 1.5714

KPI labels:    11px, uppercase, letter-spacing: 0.8px, font-weight: 500, --text-secondary
KPI values:    28px, font-weight: 700, tabular-nums, --text-primary
Page titles:   28px (scales down to 18px on mobile), font-weight: 700
Page subtitle: 14px, --text-secondary
Card headers:  16px, font-weight: 600
Table cells:   14px
Small text:    12px
Tiny text:     10-11px (trend labels, attribution)
```

### Spacing
```
xs: 4px    | XXS padding/margin
sm: 8px    | XS padding/margin
md: 12px   | SM padding/margin
lg: 16px   | Base padding/margin
xl: 24px   | LG padding/margin (section gaps, card padding)
xxl: 32px  | XL padding/margin
```

### Border Radius
```
Cards, modals, chart containers: 12px (borderRadiusLG)
Buttons, inputs, selects:        8px (borderRadius)
Tags, small elements:            4-6px (borderRadiusSM)
KPI icon badges:                 8px
Avatar/circles:                  50%
```

### Shadows & Depth
- **Default state:** No box-shadow. Depth is communicated through background color differences.
- **Hover state (KPI cards):** `translateY(-2px)` + `box-shadow: 0 6px 20px rgba(255, 203, 5, 0.15)` + border color changes to `--accent-primary`
- **Transitions:** All interactive elements use `transition: all 0.2s ease`
- **Motion durations:** Fast: 0.1s, Mid: 0.2s, Slow: 0.3s

---

## 6. Component Patterns

### KPI Card
```
+----------------------------------+
| [icon]  LABEL (uppercase, tiny)  |
|         42.3K (large, bold)      |
|         ^  +2.5%  vs prev       |
+----------------------------------+
```
- Icon in a 36x36px rounded badge with soft accent background
- Value uses `font-variant-numeric: tabular-nums` (numbers align in columns)
- Optional trend arrow (green up / red down) with percentage
- Hover: lift 2px, glow shadow, border turns accent color
- Grid layout: `display: grid; grid-template-columns: repeat(auto-fit, minmax(Npx, 1fr))`
- N scales with breakpoints (240px ultrawide -> 160px mobile)

### Chart Card (ResponsiveChart)
```
+----------------------------------+
| Chart Title              [extra] |
|----------------------------------|
|                                  |
|   [ECharts canvas]              |
|                                  |
+----------------------------------+
```
- Wrapped in Ant Design `<Card>` with themed header
- Height is responsive (200px mobile -> 400px ultrawide)
- Automatic resize handling on window resize
- Mobile: legend at top horizontal, smaller fonts, rotated x-axis labels
- Empty state: centered message instead of chart
- Loading state: Card's built-in loading skeleton

### Data Table
- Always wrapped in a themed `<Card>` when it has a title
- `scroll={{ x: 'max-content' }}` for horizontal scroll on narrow screens
- Pagination: `showSizeChanger: true`, `showTotal` displaying record count
- Row hover background: `--bg-hover`
- Header background: `--bg-hover` (slightly different from body)

### Filter Bar Patterns

**Global filter bar:** Date range + dropdowns in a single row (desktop), two rows (tablet), stacked (mobile).

**Feature-owned filter bar:** Each feature page (Traffic, Revenue, Insights) has its OWN filter bar component that manages its own state via a custom hook (`useTrafficFilters`, etc.). This means:
- Changing filters on Traffic page does NOT affect Revenue page
- Each feature-owned filter hook uses `useState` internally (not URL params)
- The filter bar component is local to the feature folder

### Page Structure Pattern
Every feature page follows this structure:
```tsx
export default function FeaturePage() {
  // 1. Feature-owned filter state
  const { filters, setFilter, setDateRange, resetFilters } = useFeatureFilters()

  // 2. React Query data hooks
  const { data: metrics, isLoading } = useFeatureMetrics(filters)
  const { data: trends, isLoading: trendsLoading } = useFeatureTrends(filters)

  // 3. Render
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Feature filter bar */}
      <FeatureFiltersBar filters={filters} onChange={setFilter} onReset={resetFilters} />

      {/* KPI Grid */}
      <FeatureKpiGrid data={metrics} loading={isLoading} />

      {/* Full-width chart */}
      <FeatureTrendsChart data={trends} loading={trendsLoading} />

      {/* Side-by-side charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}><ChartA /></Col>
        <Col xs={24} lg={12}><ChartB /></Col>
      </Row>

      {/* Optional: tables, tabs */}
    </div>
  )
}
```

---

## 7. Responsive Design

### Breakpoints (Ant Design standard)
```
xs:  < 576px   (mobile portrait)
sm:  >= 576px  (mobile landscape)
md:  >= 768px  (tablet)
lg:  >= 992px  (laptop) — PRIORITY breakpoint
xl:  >= 1200px (desktop)
xxl: >= 1600px (ultrawide)
```

### useResponsive Hook
Central hook for all responsive decisions. Returns:
- Device flags: `isMobile`, `isTablet`, `isLaptop`, `isDesktop`, `isUltrawide`
- Shortcut flags: `isMobileOrTablet` (< 992px), `isDesktopOrLarger` (>= 1200px)
- Spacing values: `contentPadding`, `sectionGap`, `cardPadding`
- Chart heights: `chartHeight`, `chartHeightSmall`, `chartHeightLarge`
- Grid settings: `kpiMinWidth`, `kpiGap`

**Every component that changes with screen size should use this hook**, not media queries or its own breakpoint detection.

### Responsive Rules
| Element | Mobile (<768) | Tablet (768-991) | Laptop (992-1199) | Desktop (1200+) |
|---|---|---|---|---|
| Sidebar | Drawer | Drawer | Fixed, collapsible | Fixed, collapsible |
| Content padding | 12px | 16px | 20px | 24px |
| KPI card min-width | 160px | 180px | 200px | 220-240px |
| Chart height | 200px | 250px | 300px | 350-400px |
| KPI value font | 20-22px | 24px | 26px | 28-30px |
| Sidebar width | 260px (drawer) | 260px (drawer) | 220px / 72px | 220px / 72px |

### CSS Responsive Adjustments
```css
/* Mobile chart: hide symbols, smaller fonts, rotate labels */
showSymbol: !isMobile
fontSize: isMobile ? 10 : 12
rotate: isMobile ? 45 : 0
itemWidth: isMobile ? 12 : 20   /* legend */
```

---

## 8. Theming System

### How It Works
1. `ThemeContext` manages the current mode ('light' | 'dark')
2. On mode change, `html[data-theme="dark"]` or `html[data-theme="light"]` is set on `<html>`
3. CSS variables resolve based on the `data-theme` attribute
4. Ant Design `ConfigProvider` receives the matching ThemeConfig object
5. ECharts themes are generated from the same semantic tokens

### Theme Toggle
- Button in the header (sun/moon icon)
- Persists to `localStorage` under a namespaced key
- Respects system `prefers-color-scheme` as default (if no stored preference)
- Default: dark (enterprise dashboard preference)

### Ant Design Theme Config Structure
Both light and dark configs follow this pattern:
```ts
const themeConfig: ThemeConfig = {
  algorithm: theme.darkAlgorithm,  // or theme.defaultAlgorithm for light
  token: {
    colorPrimary: brandYellow,
    colorBgContainer: shellColor,
    colorBgElevated: surfaceColor,
    colorBgLayout: canvasColor,
    colorBorder: borderColor,
    colorText: textPrimary,
    colorTextSecondary: textSecondary,
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    controlHeight: 32,
    fontFamily: 'system font stack',
    // ... spacing, motion tokens
  },
  components: {
    Layout: { siderBg, headerBg, bodyBg, headerHeight: 64 },
    Menu: { darkItemSelectedBg: brandYellow, itemHeight: 44, ... },
    Card: { paddingLG: 24, borderRadiusLG: 12 },
    Table: { headerBg: hoverColor, cellPaddingBlock: 12 },
    Button: { borderRadius: 8, controlHeight: 36, fontWeight: 500 },
    Input: { borderRadius: 8, controlHeight: 36 },
    Select: { borderRadius: 8, controlHeight: 36 },
    DatePicker: { borderRadius: 8, controlHeight: 36 },
    Modal: { borderRadiusLG: 12 },
    Tag: { borderRadiusSM: 4 },
    Statistic: { contentFontSize: 28, titleFontSize: 14 },
  },
}
```

### ECharts Theme
Generated from the same tokens. Key settings:
- Background: transparent (card provides background)
- Color palette: 8 distinguishable colors per mode (brand yellow first)
- Tooltip: semi-transparent background matching theme
- Grid lines: dashed, using `--divider` color
- Fonts: same system font stack as the app
- Lines: width 2, smooth curves, circle symbols (hidden on mobile)
- Bar: borderRadius on top corners [3,3,0,0]

---

## 9. Data Fetching Patterns

### React Query Hooks
Every API call is a custom hook returning `{ data, isLoading, isError }`:
```ts
export function useTrafficMetrics(filters: TrafficFilters) {
  return useQuery({
    queryKey: ['trafficMetrics', filters],
    queryFn: () => getTrafficMetrics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

**Rules:**
- `queryKey` always includes filter params (auto-refetch on filter change)
- `staleTime: 5 minutes` for dashboard data, `2 minutes` for paginated tables
- `enabled` flag to conditionally fetch (e.g., only when filters are set)
- Mutations use `useMutation` with `onSuccess` invalidating relevant queries

### Axios Client
```ts
const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 30000,
})

// Request interceptor: attach JWT Bearer token
// Response interceptor: redirect to /login on 401
```

---

## 10. Authentication Pattern

### Adapter Pattern
```ts
interface AuthAdapter {
  login(credentials: LoginCredentials): Promise<User>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
  isAuthenticated(): boolean
}
```

Two adapters:
- `demoAuthAdapter`: In-memory users, fake JWT tokens (for offline dev)
- `prodAuthAdapter`: Real JWT via `/api/auth/login`, tokens in localStorage

### Auth Provider
Wraps the entire app. Provides: `{ isAuthenticated, user, isLoading, login, logout }`

### Route Protection
```tsx
// Requires authentication
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path="traffic" element={<TrafficPage />} />
</Route>

// Requires admin role
<Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
```

### JWT Storage
```
localStorage: auth_access_token, auth_refresh_token, auth_user (cached JSON)
```

---

## 11. Login Page

Standalone page (no AppLayout wrapper):
```
+---------------------------+
|                           |
|       [Brand Logo]        |
|      "App Title"          |
|                           |
|  +---------------------+  |
|  | Demo Access info     |  |
|  | (info Alert)         |  |
|  +---------------------+  |
|                           |
|  [Username input]         |
|  [Password input]         |
|                           |
|  [     Sign In     ]     |  <- Primary button, brand color bg, black text
|                           |
|  -------- divider ------  |
|  "Brand Name (c) 2025"   |
+---------------------------+
```

- Centered vertically and horizontally on full viewport
- Card: `max-width: 420px`, themed background, themed border
- Sign In button: brand color background, **black text** (for contrast on yellow)
- Error: red Alert component above form

---

## 12. Scrollbar Styling
```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--scrollbar-track); }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }
```

---

## 13. Ant Design Override Patterns

Global CSS overrides (in index.css):
```css
.ant-layout { min-height: 100vh; background: var(--bg-base); }
.ant-layout-sider { background: var(--bg-container) !important; }
.ant-menu-dark { background: transparent !important; }
.ant-card { border: 1px solid var(--border); background: var(--bg-elevated); transition: border-color 0.3s ease; }
.ant-card:hover { border-color: var(--accent-primary); }
.ant-select-dropdown { max-width: calc(100vw - 24px); }
```

---

## 14. Chart Color Palette

```ts
// Dark mode — brighter variants for visibility
['#FFD633', '#FB923C', '#34D399', '#A78BFA', '#F87171', '#22D3EE', '#A78BFA', '#F472B6']
//  Yellow    Orange    Green     Purple    Red       Cyan      Purple    Pink

// Light mode — standard saturation
['#FFCB05', '#F97316', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899']
```

**Chart helper functions** provide resolved (non-CSS-variable) colors for ECharts:
```ts
getChartColors(theme)      // Returns color array
getChartTextColor(theme)   // Returns resolved text color
getChartGridColor(theme)   // Returns resolved grid line color
getChartTooltip(theme)     // Returns full tooltip config object
getChartGrid(isMobile)     // Returns responsive grid margins
```

---

## 15. Status Color Conventions

| Status | Color (Dark) | Color (Light) | Usage |
|---|---|---|---|
| Success | `#5FE670` | `#42B52E` | Completed, active, positive trend |
| Warning | `#FB923C` | `#F97316` | Caution, retries (ORANGE, not yellow) |
| Danger | `#FF8A8A` | `#DC2626` | Failed, errors, negative trend |
| Info | `#4DF0FF` | `#01B4D2` | Informational, incoming direction |

**Critical rule:** Warning is ALWAYS orange, never yellow — yellow is reserved for the brand identity only.

---

## 16. Interactive State Patterns

### Cards (KPI, chart containers)
```
Default:  bg-elevated, border subtle, no shadow
Hover:    bg-hover, border accent-primary, translateY(-2px), glow shadow
```

### Buttons
```
Primary:  Brand color background (#FFCB05), black text, fontWeight: 500
Text:     No background, icon-only for utility actions (theme toggle, close)
Default:  Outlined, themed border
Danger:   Red text/border for destructive actions (logout, delete)
```

### Table Rows
```
Default:  bg-elevated
Hover:    bg-hover
Header:   bg-hover (slightly darker than rows)
```

### Menu Items
```
Default:  Transparent bg, secondary text color
Hover:    bg-hover
Selected: Brand primary bg (#FFCB05), white text
```

---

## 17. Modal/Form Patterns

### Add/Edit Modal
```
+----------------------------------+
|  Modal Title              [X]    |
|----------------------------------|
|  Form.Item: Label                |
|  [Input]                         |
|                                  |
|  Form.Item: Label                |
|  [Select dropdown]               |
|                                  |
|           [Cancel] [Submit]      |
+----------------------------------+
```
- Modal borderRadius: 12px
- Form uses Ant Design `Form` with `layout="vertical"`
- Validation: Ant Design's built-in rules (`required`, `type: 'email'`, etc.)
- Submit button: primary (brand color)
- Cancel button: default

### Delete Confirmation
Uses `Popconfirm` (not a full modal). Appears inline near the delete button.
```tsx
<Popconfirm title="Delete user?" description="This action cannot be undone."
  onConfirm={handleDelete} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
  <Button danger size="small" icon={<DeleteOutlined />} />
</Popconfirm>
```

---

## 18. CRUD Table Page Pattern (Users Page)

```
+--------------------------------------------+
|  Page Title             [+ Add Button]     |
|--------------------------------------------|
|  Name | Email | Role | Status | Actions    |
|  ---  | ---   | Tag  | Tag    | Edit Del   |
|  ...  | ...   | ...  | ...    | ...  ...   |
|--------------------------------------------|
|  Pagination                                |
+--------------------------------------------+
```

- Role displayed as colored `<Tag>`: gold for admin, cyan for analyst
- Status: green Tag for active, red for inactive
- Actions column: Edit button (opens modal), Delete button (Popconfirm)
- Add button: primary, top-right corner
- Modal form reused for both Add and Edit (pre-filled for Edit)
- Password field: required for Add, optional for Edit

---

## 19. Vite Configuration

```ts
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  base: mode === 'production' ? '/static/frontend/' : '/',
  build: {
    outDir: '../static/frontend',
    emptyOutDir: true,
    manifest: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
}))
```

---

## 20. Code Conventions

### Component Style
- **Functional components only** — `export default function ComponentName() {}`
- **Named exports** for context hooks and providers
- **Default exports** for page components and UI primitives
- **No prop spreading** (`{...rest}`) except in generic wrapper components like DataTable
- **Inline styles** for component-specific styling on Ant Design components
- **CSS classes** only for global patterns defined in index.css

### TypeScript
- Interfaces for props: `interface ComponentNameProps { ... }`
- Type imports: `import type { X } from '...'`
- Strict: no `any` in feature code
- Union types for controlled values: `'all' | 'incoming' | 'outgoing'`

### File Naming
- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts` (prefixed with `use`)
- Utils: `camelCase.ts`
- Types: inside the relevant file, or `types.ts` for shared types
- Config: `camelCase.ts`
- Index files: `index.ts` (barrel exports only)

### Import Order
```ts
// 1. React / core libraries
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

// 2. UI library components
import { Card, Table, Row, Col, Tag, Button } from 'antd'
import { PhoneOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

// 3. Internal shared (hooks, contexts, theme, components/ui)
import { useResponsive } from '../../../hooks'
import { useTheme } from '../../../contexts/ThemeContext'
import { KpiCardV2, ResponsiveChart } from '../../../components/ui'

// 4. Feature-local imports
import type { TrafficMetrics } from '../../../providers/traffic'
```

---

## 21. Summary of the "Feel"

This design system produces dashboards that feel:

- **Dense but not cramped** — information-rich layouts with consistent 16-24px spacing
- **Dark and professional** — neutral grey surfaces (not pure black), high contrast text
- **Signal-driven** — brand color appears only where attention is needed (selected menu, KPI hover glow, primary buttons)
- **Smooth** — 0.2s ease transitions on all interactive elements, subtle lift on hover
- **Enterprise-grade** — no playful illustrations, no gradients on surfaces, no decorative elements
- **Laptop-first** — optimized for 1366-1920px, gracefully scales to mobile via drawer nav and stacked layouts
- **Consistent** — every card has the same radius (12px), every input the same height (36px), every border the same color variable
- **Theme-aware** — light and dark modes are both first-class, not an afterthought
