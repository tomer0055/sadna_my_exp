# WESP-Group-14B — Ticket Purchasing Platform

## Table of Contents

- [System Overview](#system-overview)
- [What Changed From the Original Clone](#what-changed-from-the-original-clone)
- [Booting the System](#booting-the-system)
- [Running Playwright E2E Tests](#running-playwright-e2e-tests)
- [Running Vitest Unit Tests](#running-vitest-unit-tests)
- [Test Architecture](#test-architecture)
- [Seed Data (Dev Profile)](#seed-data-dev-profile)
- [E2E Test Coverage Map](#e2e-test-coverage-map)
- [Known Issues Found](#known-issues-found)
- [Configuration Files](#configuration-files)
- [Initial-State File Format](#initial-state-file-format)

---

## System Overview

A full-stack ticket purchasing platform built with **React 18** (Vite) and **Spring Boot 3.3.5**. Users can browse events, reserve seats from an interactive seating map, and complete purchases through a checkout flow with payment validation.

| Layer    | Tech                                    |
|----------|-----------------------------------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend  | Spring Boot 3.3.5, Java 21, JPA/Hibernate |
| DB (dev) | H2 in-memory                            |
| DB (prod)| PostgreSQL (remote)                     |
| Testing  | Playwright 1.61.1 (E2E), Vitest (unit) |

---

## What Changed From the Original Clone

### QA Testing Added

The original project had **zero automated tests**. This QA effort added:

- **60 Vitest unit/component test files** (568 tests) covering all pages, API modules, context providers, and utility functions
- **19 Playwright E2E spec files** (95 tests) testing every user flow against real APIs with no mocking
- **Playwright configuration** (`frontend/playwright.config.ts`)
- **E2E test helpers** (`frontend/e2e/helpers.ts`) with login utilities for seeded users
- **`.gitignore` update** to exclude `test-results/` and `node_modules/`

### Bug Reports

- **`frontend/BUG_REPORT.txt`** — 16 source code bugs found during the audit (3 Critical, 4 High, 5 Medium, 4 Low)
- **`QA_PROBLEMS_AND_FIXES.txt`** — Complete 31-problem report covering everything from clone to E2E testing

### What Was NOT Changed

**Production source code was not modified.** All bugs are documented but left for the development team to fix. The only files added/changed are:
- Test files (`frontend/e2e/*.spec.ts`, `frontend/src/**/*.test.*`)
- Test configuration (`playwright.config.ts`, `vitest.config.ts`)
- Documentation (`BUG_REPORT.txt`, `QA_PROBLEMS_AND_FIXES.txt`, `README.md`)
- `.gitignore`

---

## Booting the System

### Prerequisites

- Java 21+
- Node.js 18+
- Maven (wrapper included: `./mvnw`)

### 1. Start the Backend (dev profile)

From the project root:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Wait for the log line: `Started TicketApplication` (usually ~10 seconds).

The backend runs on `http://localhost:8080`. The H2 console is available at `http://localhost:8080/h2-console`.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server starts on `http://localhost:5173` and proxies all `/api/*` requests to the backend.

---

## Running Playwright E2E Tests

### Prerequisites

1. The **backend must be running** with the dev profile (see above)
2. The Vite frontend dev server will start automatically (Playwright config handles it)

### Run All E2E Tests

```bash
cd frontend
npx playwright test
```

### Run a Specific Test File

```bash
cd frontend
npx playwright test e2e/auth.spec.ts
```

### Run Tests with Visible Browser (headed mode)

```bash
cd frontend
npx playwright test --headed
```

### Run a Single Test by Name

```bash
cd frontend
npx playwright test -g "GivenValidCredentials_WhenLoginSubmitted_ThenRedirectsToDashboard"
```

### View Test Report

After a run completes:

```bash
cd frontend
npx playwright show-report
```

### Important Notes

| Setting | Value | Why |
|---------|-------|-----|
| `workers: 1` | Single worker | Tests share backend state (orders, sessions) |
| `fullyParallel: false` | Sequential execution | Prevents race conditions on shared data |
| `timeout: 30000` | 30s per test | Real API calls need time |
| `retries: 0` | No retries | Flaky passes hide real bugs |

**Fresh seed data:** The H2 database seeds automatically on backend startup. If tests that depend on Bob's active order fail (15-minute reservation timer), restart the backend to reset the seed data:

```bash
# Kill the backend (Ctrl+C or kill the process)
# Then restart:
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Playwright Config

Located at `frontend/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
```

If Chromium is not in the default location, add `launchOptions.executablePath` under `use`.

---

## Running Vitest Unit Tests

```bash
cd frontend
npx vitest run
```

To run in watch mode:

```bash
cd frontend
npx vitest
```

To run a specific test file:

```bash
cd frontend
npx vitest run src/pages/events/EventsPage.test.tsx
```

**Important:** Always run Vitest from the `frontend/` directory, not the project root.

---

## Test Architecture

### E2E Tests (Playwright)

All E2E tests hit **real backend APIs** — no mocking, no stubbing, no intercepting. The dev profile uses a `StubPaymentGateway` that has the same interface as the real `PaymentGateway`, so payment flows are fully tested.

```
frontend/e2e/
  helpers.ts                    # Login utilities, shared functions
  auth.spec.ts                  # Login, registration, invalid credentials
  registration.spec.ts          # User registration flow
  dashboard.spec.ts             # Dashboard page content & navigation
  events.spec.ts                # Event browsing, search, filtering
  event-details.spec.ts         # Event detail page, back navigation
  active-order.spec.ts          # Active order page, seat details
  checkout.spec.ts              # Payment form, validation, processing
  order-history.spec.ts         # Order history page
  account.spec.ts               # Account settings page
  admin.spec.ts                 # Admin panel access control
  navigation.spec.ts            # Sidebar links, route guards
  notifications.spec.ts         # Notification page
  logout.spec.ts                # Logout flow
  production-company.spec.ts    # Production company management
  api-auth-edge-cases.spec.ts   # Concurrent sessions, token edge cases
  api-data-integrity.spec.ts    # Cross-user data isolation
  api-invalid-entities.spec.ts  # Invalid IDs, missing entities
  api-order-conflicts.spec.ts   # Order state conflicts
  api-payment-validation.spec.ts # Payment field validation
```

### Test Naming Convention

All tests follow the **Given-When-Then** pattern:

```
GivenPrecondition_WhenAction_ThenExpectedResult
```

Example: `GivenValidCredentials_WhenLoginSubmitted_ThenRedirectsToDashboard`

### Handling Order Expiration

Bob's seed order has a **15-minute reservation timer**. Checkout and payment tests are designed to be resilient:

```typescript
const payButton = page.getByRole('button', { name: /Authorize.*Pay/i });
const hasPayButton = await payButton.isVisible({ timeout: 20000 }).catch(() => false);
if (!hasPayButton) {
  // Order expired — verify expired state renders correctly
  await expect(page.getByText(/Reservation Period Expired|No Active Order/i)).toBeVisible();
  return;
}
// Continue with payment assertions...
```

---

## Seed Data (Dev Profile)

The dev profile automatically seeds the database from `init_db_file.txt`:

| User  | ID    | Password | Role    | Notes |
|-------|-------|----------|---------|-------|
| Alice | alice | pass123  | Founder | Owns 2 production companies, created all events |
| Bob   | bob   | pass456  | Student | Has active order (3 seats for Rock Night) |
| Admin | admin@gmail.com | admin123 | Admin | System administrator |

| Event | Venue | Capacity | Price Range |
|-------|-------|----------|-------------|
| Rock Night | Tel Aviv Arena | 247 seats | $60–$120 |
| Jazz Evening | Haifa Jazz Club | 200 seats | $60–$80 |
| Comedy Night 18+ | Beer Sheva Comedy Club | 300 seats | $50–$70 |

---

## E2E Test Coverage Map

| Page/Feature | Spec File | Tests | What's Covered |
|-------------|-----------|-------|----------------|
| Login | auth.spec.ts | 8 | Valid/invalid login, wrong password, empty fields, navigation |
| Registration | registration.spec.ts | 4 | Valid registration, duplicate user, validation errors |
| Dashboard | dashboard.spec.ts | 4 | Content rendering, navigation cards, guest vs member |
| Events | events.spec.ts | 8 | Event listing, search, filtering, empty states |
| Event Details | event-details.spec.ts | 7 | Event info, back navigation, reserve button, not found |
| Active Order | active-order.spec.ts | 4 | Order details, seat info, guest redirect |
| Checkout | checkout.spec.ts | 5 | Payment form, validation, processing, guest error |
| Order History | order-history.spec.ts | 3 | Page load, content, guest redirect |
| Account | account.spec.ts | 3 | Profile display, guest redirect |
| Admin | admin.spec.ts | 4 | Access control, 403 for non-admins |
| Navigation | navigation.spec.ts | 5 | Sidebar links, route guards |
| Notifications | notifications.spec.ts | 2 | Page load, guest redirect |
| Logout | logout.spec.ts | 3 | Logout flow, state cleanup |
| Production Co. | production-company.spec.ts | 4 | Company listing, create option |
| Auth Edge Cases | api-auth-edge-cases.spec.ts | 6 | Concurrent sessions, token clearing, guest tokens |
| Data Integrity | api-data-integrity.spec.ts | 7 | Cross-user isolation, data persistence |
| Invalid Entities | api-invalid-entities.spec.ts | 7 | Invalid IDs, missing resources, search API |
| Order Conflicts | api-order-conflicts.spec.ts | 6 | State transitions, concurrent access |
| Payment Validation | api-payment-validation.spec.ts | 5 | Card validation, expiry, CVV, special chars |

**Total: 95 E2E tests across 19 spec files**

---

## Known Issues Found

Full details in `QA_PROBLEMS_AND_FIXES.txt` and `frontend/BUG_REPORT.txt`.

### Critical Bugs (in production code, NOT fixed)

1. **`ddl-auto=create` in prod** — Destroys all data on every restart
2. **Hardcoded DB credentials** — postgres/Pass_1234 in source control
3. **Merge conflict markers** in `AdminPage.tsx` — Renders broken content

### High-Priority Bugs

4. **OrderHistoryPage** — Infinite loading spinner on auth failure
5. **CheckoutPage** — No double-click protection on payment button (double-charge risk)
6. **AuthContext** — Guest entry failure causes silent broken state
7. **AuthContext** — Token persisted before permissions verification

### Other Issues

- Stale seating map (never refreshed)
- Events page crashes on null API response
- "My Companies" card shown to non-production users
- Typos: "tracking-widests", "Suscribe"

---

## Configuration Files

### Backend (application-dev.properties)

```properties
spring.datasource.url=jdbc:h2:mem:ticketdb;DB_CLOSE_DELAY=-1
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=password
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=create-drop
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
```

### Frontend (vite.config.ts proxy)

The Vite dev server proxies `/api/*` to `http://localhost:8080`, so all API calls work transparently.

---

## Initial-State File Format

The database is seeded via `init_db_file.txt`, parsed by `InitCommandParser`.

### Syntax Rules

1. Lines starting with `#` are comments. Blank lines are ignored.
2. Every command ends with `;`
3. Commands: `commandName(arg1, arg2, ...);`
4. Variable assignment: `$varName = command(...);`
5. Arguments separated by `,` (whitespace trimmed)

### Example

```
# Create users
$guest1 = guest-entry();
register($guest1, alice, Alice Smith, pass123, alice@example.com, NONE);
$alice = login($guest1, alice, pass123);

# Create company and event
$company1 = create-production-company($alice, Live Events Co., Description, contact@co.com);
$event1 = create-event($alice, 1, $company1, Rock Night, 500, 2026-07-11T20:00, true, Tel Aviv Arena, 120.0);
configure-event-seating-map($alice, $event1, 10, 10, 120.0, 10, 10, 90.0, 5, 10, 60.0);

# Create order
$activeOrder1 = create-active-order($bob, bob, $event1);
add-seats-to-order($bob, $activeOrder1, 0_1_1, 0_1_2, 0_1_3);
```
