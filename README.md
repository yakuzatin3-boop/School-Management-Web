# School Management Web

A complete school management dashboard built with **Vue 3**, **TypeScript**, **Vite**,
**Pinia**, **Vue Router**, and **Tailwind CSS**.

## Features

- **Authentication** — sign in with an administrator, teacher, or student account, JWT-based
  sessions with automatic refresh, and role-aware route guards.
- **Dashboard** — live totals for students, attendance, grades, and fee collection, pinned
  announcements, enrollment by grade, capacity usage, fee status, recent enrollments, and
  class schedules.
- **Students** — create, edit, delete, search, filter by grade and status, and export CSV.
- **Teachers** — manage staff profiles, subjects, status, hire dates, and export CSV.
- **Classes** — create classes, assign teachers, track rooms, schedules, and seat capacity.
- **Attendance** — mark a class register as present, absent, late, or excused, with one-click
  bulk actions and daily summaries. Students see their own attendance history.
- **Grades** — record assessment scores by class, subject, and assessment, with automatic
  letter grades, averages, and highest/lowest scores. Students see their personal results,
  subject averages, and score distribution.
- **Timetable** — weekly Monday–Friday lesson grid with six periods, inline add/edit, and
  clash replacement. Students see a read-only view scoped to their enrolled classes.
- **Fees** — create and manage invoices, record payments, track overdue balances, filter,
  search, and export invoices. Students see their own invoices and balance.
- **Reports** — enrollment, demographics, grade distribution, attendance, fee status, and
  class performance at a glance, with CSV export.
- **Announcements** — staff publish notices for students, teachers, or parents, pin important
  posts, and surface them in the notification bell and dashboard; students get a read-only feed.
- **Settings** — administrators manage school information and the academic year; every user
  can review their profile.
- **Role-based access** — admin-only writes for records and fees, staff tools for teaching
  workflows, and read-only personal views for students, mirrored by API permissions.
- **Global search** — press `Ctrl/Cmd+K` to search students, teachers, classes, and pages.
- **Responsive UI** — grouped sidebar navigation, mobile drawer, sticky header, page
  transitions, and accessible dialogs, toasts, and forms.
- **Tooling** — TypeScript type checking, ESLint, Oxlint, Prettier, Vitest, and Vue DevTools.

## Routes

| Route            | Page                                                |
| ---------------- | --------------------------------------------------- |
| `/login`         | Sign in                                             |
| `/`              | Dashboard                                           |
| `/students`      | Student records                                     |
| `/teachers`      | Teaching staff                                      |
| `/classes`       | Classes and capacity                                |
| `/attendance`    | Daily class registers                               |
| `/grades`        | Gradebook and assessment entry                      |
| `/timetable`     | Weekly lesson timetable                             |
| `/fees`          | Invoices and payments                               |
| `/reports`       | School-wide reports                                 |
| `/announcements` | News and notices                                    |
| `/settings`      | School, academic, and account settings              |


## Demo accounts

| Role          | Email                | Password   |
| ------------- | -------------------- | ---------- |
| Administrator | `admin@school.edu`   | `admin123` |
| Teacher       | `teacher@school.edu` | `admin123` |
| Student       | `student@school.edu` | `admin123` |

The login screen has one-click buttons that fill these credentials for you. Demo data is
seeded by the API when `SEED_DEMO_DATA=true` (enabled in the Compose stack).

## Project setup

Requires Node.js `^22.18.0` or `>=24.12.0`, plus the companion API running on
`http://localhost:3000` (or proxied through the Compose stack).

```sh
npm install
```

### Start the development server

```sh
npm run dev
```

The Vite dev server proxies `/api` to the API. When running the full stack, use
`docker compose up` from `..` and open `http://localhost:8080`.

### Type-check, lint, and test

```sh
npm run type-check
npm run lint
npm run test:unit
```

### Production build

```sh
npm run build
npm run preview
```

## Project structure

```text
src/
├── components/
│   ├── layout/AppLayout.vue     # Sidebar, header, search, notifications, user menu
│   ├── layout/GlobalSearch.vue  # Ctrl/Cmd+K search across the app
│   └── ui/                      # Buttons, modals, badges, toasts, stat cards
├── router/index.ts              # Routes, role metadata, and auth guard
├── services/                    # API client, formatting, CSV, IDs, auth storage
├── stores/                      # Pinia stores for every module and toasts
├── types/index.ts               # Shared TypeScript types
├── views/                       # Login, dashboard, and all feature modules
├── App.vue
├── main.ts
└── style.css                    # Tailwind entry point and shared field styles
```

## Data and permissions

All school records come from the API; the browser only stores the auth session. Demo data
is seeded idempotently on API startup when `SEED_DEMO_DATA=true`. To rebuild the demo
dataset, reset the database volume and restart the stack:

```sh
docker compose down -v
docker compose up -d --build
```

Permissions follow the API: administrators manage records, fees, and settings; teachers
manage attendance, grades, timetable, and announcements; students have read-only access to
their own attendance, grades, timetable, invoices, and the announcement feed.

## Recommended IDE setup

[VS Code](https://code.visualstudio.com/) with the extensions recommended in
`.vscode/extensions.json`:

- [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Vitest](https://marketplace.visualstudio.com/items?itemName=vitest.explorer)
- [Oxc](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode)
- [EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)

## Docker

Build and serve the production bundle with nginx:

```bash
docker build -t school-management-web .
docker run --rm -p 8080:80 school-management-web
```

The included `nginx.conf` proxies `/api` to a container named `api`, which the Compose
stack at `../docker-compose.yml` provides. It also sets CSP, HSTS, frame, referrer, and
permissions headers, caches hashed assets for a year, and never caches `index.html`.

See `../DOCKER.md` for the full deployment guide and production checklist.

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | API base URL baked into the build | `/api/v1` |
| `VITE_API_PROXY_TARGET` | Dev-server proxy target | `http://localhost:3000` |

The Docker build uses the defaults, so the browser calls the API through the same nginx
origin. Set `VITE_API_BASE_URL` only if the API is served from a different host.
