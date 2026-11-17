# RailConnect — Frontend

A React 18 + Vite frontend for the RailConnect Railway Reservation System.

This package contains **only the frontend**. It talks to the existing Spring Boot
backend over its REST API. Nothing here is mocked — every screen reads and writes
real data from your backend.

---

## 1. Requirements

| Tool | Version |
|---|---|
| Node.js | 18 LTS or newer (20+ recommended) |
| npm | 9 or newer |

Check with:

```bash
node -v
npm -v
```

---

## 2. Quick start

```bash
# 1. install dependencies
npm install

# 2. point the app at your Spring Boot backend
cp .env.example .env
#    then edit .env and set VITE_API_BASE_URL (see section 3)

# 3. start the dev server
npm run dev
```

The app opens at **http://localhost:5173**.

If you are on Windows, use `copy .env.example .env` instead of `cp`.

---

## 3. Pointing it at your backend

Open `.env` and set one variable:

```env
VITE_API_BASE_URL=http://localhost:8080
```

That value is the **origin of your Spring Boot server only** — no `/api` suffix.
All request paths in the app are already absolute (`/api/stations`,
`/api/trains/search`, …), so they are appended to this origin for you.

Examples:

| Your backend runs at | Set `VITE_API_BASE_URL` to |
|---|---|
| Local, default port | `http://localhost:8080` |
| Local, different port | `http://localhost:8081` |
| On your LAN (phone testing) | `http://192.168.1.25:8080` |
| Deployed | `https://your-backend.example.com` |

**Do not add a trailing slash.** `http://localhost:8080` — not
`http://localhost:8080/`.

`.env` is git-ignored, so your local URL never leaks into version control.
`.env.example` is the committed template.

### CORS

The backend controllers are annotated `@CrossOrigin(origins = "*")`, so the
browser can call it cross-origin from the Vite dev server without any extra
setup on your side. If you later lock CORS down, remember to allow
`http://localhost:5173` (development) and your deployed frontend origin.

### Start the backend first

The frontend needs the backend running before any screen will show data:

```bash
cd railway-reservation-backend
mvn spring-boot:run
```

It serves on `http://localhost:8080` by default. Make sure MySQL/MariaDB is up
and the schema plus seed data are loaded — see the backend README.

If the backend is unreachable, the app does **not** silently show fake data. It
displays a clear error such as:

> Cannot reach the RailConnect server. Make sure the backend is running and
> VITE_API_BASE_URL points to it.

---

## 4. Available commands

```bash
npm install     # install dependencies
npm run dev     # dev server with hot reload — http://localhost:5173
npm run build   # production build into dist/
npm run preview # serve the built dist/ locally to sanity-check it
npm run lint    # ESLint over the source
```

---

## 5. Production build

```bash
npm run build
```

Output lands in `dist/`. To check it locally:

```bash
npm run preview
```

Because the backend URL is baked in at build time, set `VITE_API_BASE_URL`
**before** building for production:

```bash
# Linux / macOS
VITE_API_BASE_URL=https://your-backend.example.com npm run build

# Windows PowerShell
$env:VITE_API_BASE_URL="https://your-backend.example.com"; npm run build
```

---

## 6. Deploying

### Vercel

1. Push this folder to a Git repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects Vite. Confirm:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add an environment variable:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** your deployed backend URL
5. Deploy.

The included `vercel.json` handles SPA routing, so refreshing a deep link like
`/train/5` or `/my-bookings` does not 404.

### Netlify

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- Add `VITE_API_BASE_URL` under Site settings → Environment variables.
- The included `_redirects` file (if present) covers SPA routing.

### GitHub Pages

Build with the repository sub-path as the base:

```bash
npm run build -- --base=/your-repo-name/
```

Then publish `dist/` to the `gh-pages` branch. GitHub Pages cannot rewrite
unknown paths to `index.html`, so **deep links will 404 on a hard refresh** —
use Vercel or Netlify if you need proper SPA routing.

### Any static host (Nginx, Apache, S3, …)

Serve `dist/` as static files and rewrite all unknown paths to `index.html`.
For Nginx:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 7. Demo accounts

These exist in the backend seed data:

| Role | Email | Password |
|---|---|---|
| Traveller | `rahul@example.com` | `rahul123` |
| Admin | `admin@railconnect.in` | `admin123` |

Registration (`/register`) always creates a `USER`. Admin accounts come from the
seed data only.

---

## 8. What's in the box

```
railconnect-frontend/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json                 # SPA rewrite for Vercel
├── eslint.config.js
├── .env.example                # copy to .env
├── .gitignore
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.jsx                # providers + router bootstrap
    ├── App.jsx                 # all routes
    ├── index.css
    ├── components/
    │   ├── common/             # Button, Input, Select, Modal, Loader,
    │   │                       # Skeleton, EmptyState, ErrorState,
    │   │                       # StatusBadge, PageHeader, BookingSteps,
    │   │                       # ProtectedRoute
    │   ├── layout/             # Navbar, Footer, MainLayout,
    │   │                       # UserLayout, AdminLayout
    │   ├── home/               # HeroSection, BookingSearchForm,
    │   │                       # StationAutocomplete, PopularRoutes,
    │   │                       # ServicesSection, WhyRailConnect,
    │   │                       # HowItWorks
    │   ├── booking/            # CoachSelector, SeatLayout, SeatLegend,
    │   │                       # PassengerForm, FareSummary,
    │   │                       # JourneySummaryCard
    │   └── trains/             # train cards, timeline, filters
    ├── pages/                  # one file per route + admin/ subfolder
    ├── context/                # Auth, Booking, Station, Toast
    ├── hooks/                  # useTrainSearch, useSeatAvailability
    ├── services/               # all API calls, one file per resource
    ├── styles/                 # variables, global, components,
    │                           # layout, features, responsive
    └── utils/                  # date, time, currency, route, coach,
                                # validators, constants
```

**Architecture note:** every network call lives in `src/services/`. Components
never call Axios directly, so when an endpoint changes you edit exactly one file.

---

## 9. Routes

**Public**

| Path | Page |
|---|---|
| `/` | Home — hero, search, popular routes, services |
| `/trains` | Search results |
| `/train/:id` | Train details + route timeline + coach selection |
| `/login` | Login |
| `/register` | Register |
| `/about` | About |
| `/contact` | Contact |
| `/services` | Services |

**Authenticated**

| Path | Page |
|---|---|
| `/seats` | Seat and berth selection |
| `/passengers` | Passenger details |
| `/booking-summary` | Summary + fare |
| `/payment` | Payment |
| `/booking-success/:id` | Confirmation |
| `/payment-failed` | Payment failure |
| `/ticket/:id` | Digital ticket |
| `/my-account` | Profile |
| `/my-bookings` | Booking history |
| `/my-bookings/:id` | Booking detail + cancel |

**Admin only**

`/admin`, `/admin/trains`, `/admin/stations`, `/admin/routes`,
`/admin/coaches`, `/admin/seats`, `/admin/bookings`, `/admin/users`

Unauthenticated users hitting a private route are redirected to `/login`.
Signed-in non-admins hitting an admin route land on `/unauthorized`.

---

## 10. API endpoints used

| Area | Method + path |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Stations | `GET /api/stations`, `/api/stations/{id}`, `/api/stations/code/{code}`, `/api/stations/city/{city}`, `/api/stations/search?name=` |
| Trains | `GET /api/trains`, `/api/trains/{id}`, `/api/trains/search?source=&destination=` |
| Train stops | `GET /api/train-stops/...` (route timeline) |
| Coaches | `GET /api/coaches/...` |
| Seats | `GET /api/seats/...` |
| Journey availability | `GET /api/journey-seat-reservations/availability`, `POST /api/journey-seat-reservations` |
| Passengers | `POST /api/passengers` |
| Bookings | `POST /api/bookings`, `GET /api/bookings/my`, `GET /api/bookings/{id}`, `PUT /api/bookings/{id}/cancel` |
| Payments | `POST /api/payments`, `POST /api/payments/verify`, `GET /api/payments` |
| Admin | `GET /api/admin/users`, `GET /api/admin/bookings`, `POST/PUT/DELETE /api/admin/trains` |

---

## 11. Notes and known limitations

- **Authentication is not secure.** The backend has no JWT or Spring Security.
  Login returns a `User` object which is stored in `localStorage`, and the app
  sends `userId` as a query parameter on the endpoints that need it. Anyone who
  reaches the API can call admin endpoints directly. **Add JWT before exposing
  this publicly.**
- **Payments need your own Razorpay keys.** Without them configured on the
  backend, the payment step reports the missing configuration rather than
  faking a successful transaction.
- **Train IDs 2, 3 and 4 have incomplete route data** in the seed set (train 2
  has a single stop, trains 3 and 4 have none). The app filters them out of
  search results instead of showing an impossible journey.
- **Profile editing is unavailable** — the backend exposes no update-profile
  endpoint, so the profile page is read-only.
- **No email is sent** unless your backend has Gmail SMTP configured.

---

## 12. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| "Cannot reach the RailConnect server" | Backend not running, or wrong `VITE_API_BASE_URL`. Check the URL in `.env` and that `mvn spring-boot:run` is up. |
| Blank page after `npm run dev` | Missing `node_modules`. Run `npm install`. |
| 404 on refresh of a deep link | Your host is not rewriting to `index.html`. See section 6. |
| CORS error in the console | Backend is missing `@CrossOrigin`. The delivered backend has it on all controllers. |
| Station list is empty | Run the backend's station import, or check `GET /api/stations` returns rows. |
| Changed `.env` but nothing happened | Vite only reads env at startup. Stop the dev server and run `npm run dev` again. |

---

## 13. Changing the backend URL without a rebuild

The env var is read once at build time. If you need to retarget at runtime,
edit the fallback in `src/services/api.js`:

```js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
```

Change the fallback string, then rebuild.
