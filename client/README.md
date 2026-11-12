# JobTrackr Client Architecture & Day 08 Implementation

This document covers the frontend client architecture, state synchronization strategy, CORS resolution, and DevTools network verification checklist for JobTrackr.

---

## 1. State Synchronization Strategy: Refetch vs. Local State Update

JobTrackr combines **optimistic local state updates with rollback** and **authoritative server refetching** to balance snappy UI responsiveness with server-side data integrity.

### Stage Transitions: Optimistic Local State Updates with Rollback
- **Why Optimistic Updates?**
  When a user moves an application card across Kanban columns (e.g., advancing from `Applied` &rarr; `Interview` &rarr; `Offer` or clicking `Reject`), users expect immediate tactile feedback. Waiting for a round-trip network response before updating the UI creates noticeable latency, sluggish button states, and full-column DOM repainting/flickering.
- **How It Works:**
  1. **Snapshot**: A shallow copy of the current `applications` array is captured as a rollback snapshot.
  2. **Instant UI Mutation**: React local state updates immediately (`setApplications`), visually transitioning the card to the new stage column.
  3. **In-Flight Lock**: The card's ID is registered in `busyCardIds`, disabling action buttons on that card to prevent concurrent conflicting clicks.
  4. **Async API Request**: An asynchronous request is dispatched via `updateApplication(id, { status: newStatus })`.
  5. **Rollback on Error**: If the server rejects the update (e.g., network error or server failure), local state is restored from the snapshot, the card returns to its original column, and a clear error banner alerts the user (`Rollback: ...`).
  6. **Stats Refresh**: Upon success, a lightweight stats refresh is triggered (`refreshKey`) without refetching the entire board.

### Creations, Deletions, Search, and Pagination: Server Refetch Strategy
- **Why Refetch from API?**
  Unlike stage transitions, adding a job, deleting a card, searching by keywords, or navigating pages directly changes:
  - **Server-Side Pagination Boundaries**: `skip((page - 1) * limit).limit(limit)`, `total`, and `totalPages`.
  - **Database Sorting Order**: New entries appear sorted by `createdAt: -1`.
  - **Aggregation Metrics**: MongoDB `$group` and `$avg` stats for dashboard status counters.
- Trying to compute pagination slices and total document counts client-side would lead to **page drift**, missing records, and duplicate items. Refetching via `fetchApplications({ search, status, page, limit })` guarantees that the client view remains 100% synchronized with the database's authoritative state.

---

## 2. CORS Error & Resolution

### The Exact Browser CORS Error
When attempting cross-origin requests from the Vite development server (`http://localhost:5173`) to the Express API (`http://localhost:5000`) without proper CORS headers, modern browsers block the response and log:

```text
Access to XMLHttpRequest at 'http://localhost:5000/api/applications' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Why Browsers Enforce the Same-Origin Policy (SOP) & Preflight Checks
- **Same-Origin Policy**: A fundamental web security mechanism that prevents malicious scripts running on one origin (e.g., `attacker.com` or `localhost:5173`) from reading sensitive data from another origin (e.g., `localhost:5000` or `yourbank.com`).
- **Preflight `OPTIONS` Requests**: When an Axios request includes custom headers (such as `Authorization: Bearer <token>`), a `Content-Type: application/json` payload, or non-simple HTTP methods (`PATCH`, `DELETE`), the browser dispatches an automatic preflight `OPTIONS` handshake before sending the actual request. The browser inspects the response to check whether the server explicitly authorizes the origin, methods, and headers.

### How Express `cors()` Resolves It
In `Job Tracker/server/src/server.js`, the `cors` middleware is configured early in the middleware pipeline:

```javascript
import cors from 'cors';

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
```

When the browser sends the preflight `OPTIONS` request, Express intercepts it and responds with the appropriate HTTP headers:
- `Access-Control-Allow-Origin: http://localhost:5173`
- `Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`
- `Access-Control-Allow-Credentials: true`

This grants permission to the browser to transmit the cross-origin API calls seamlessly.

---

## 3. Network Tab Verification Checklist

Use your browser's Developer Tools (F12 &rarr; **Network** tab &rarr; **Fetch/XHR**) to verify the API integration:

### Checklist & Evidence Placeholders

#### 1. `200 OK`: Authenticated Application Retrieval (`GET /api/applications`)
- **Endpoint**: `GET /api/applications?page=1&limit=10`
- **Expected Status**: `200 OK`
- **Request Headers**: Includes `Authorization: Bearer <JWT_TOKEN>`
- **Response Shape**:
  ```json
  {
    "success": true,
    "count": 10,
    "total": 45,
    "page": 1,
    "totalPages": 5,
    "data": [ ... ]
  }
  ```
- **Screenshot Evidence Placeholder**:
  ```markdown
  ![DevTools Network: 200 OK GET /api/applications](screenshots/network-200-get-applications.png)
  ```
  *(Attach screenshot showing the 200 status, request headers with Bearer token, and JSON response body)*

---

#### 2. `401 Unauthorized`: Session Expiration & Automatic Logout
- **Endpoint**: `GET /api/applications` (with an expired, tampered, or missing token)
- **Expected Status**: `401 Unauthorized`
- **Response Shape**:
  ```json
  {
    "success": false,
    "message": "Not authorised"
  }
  ```
- **Client Interceptor Action**: The Axios response interceptor intercepts the `401`, executes `localStorage.removeItem('token')`, triggers `AuthContext.logout()`, and redirects to `/login` with navigation state `{ message: 'Your session has expired' }`.
- **Screenshot Evidence Placeholder**:
  ```markdown
  ![DevTools Network: 401 Unauthorized Session Expired](screenshots/network-401-unauthorized.png)
  ```
  *(Attach screenshot showing the 401 response and subsequent redirect to /login with banner)*

---

#### 3. `400 Bad Request`: Input Validation Failure
- **Endpoint**: `POST /api/applications`
- **Expected Status**: `400 Bad Request`
- **Payload**: `{ "company": "A", "role": "" }` (violates 2-60 character constraint)
- **Response Shape**:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": {
      "company": "Company is required and must be between 2 and 60 characters",
      "role": "Role is required and must be between 2 and 60 characters"
    }
  }
  ```
- **Client Handling**: Form displays inline red error messages beneath the offending fields and restores the submit button to active state.
- **Screenshot Evidence Placeholder**:
  ```markdown
  ![DevTools Network: 400 Bad Request Validation Error](screenshots/network-400-validation-error.png)
  ```
  *(Attach screenshot showing the 400 Bad Request status and validation error response payload)*

---

## 4. Live Production Deployment & Architecture

- **Live Frontend (Vercel)**: [https://jobtrackr-app.vercel.app](https://jobtrackr-app.vercel.app) *(Replace with your deployed Vercel domain)*
- **Live API Health Check (Render)**: [https://jobtrackr-api.onrender.com/api/health](https://jobtrackr-api.onrender.com/api/health) *(Replace with your deployed Render domain)*

### Recruiter Demo Accounts
| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Admin** | `alice.johnson@example.com` | `Password123!` | Full Kanban Board + Platform Analytics (`/api/admin/stats`) |
| **User** | `demo@jobtrackr.com` | `Password123!` | Personal Kanban Board + Ownership Isolated Data |
| **User (Alt)** | `bob.smith@example.com` | `Password123!` | Personal Kanban Board + Ownership Isolated Data |

### Architecture Overview
```mermaid
flowchart LR
    User([User Browser]) <-->|"HTTPS / WSS"| Frontend["React 19 SPA\n(Vercel Global CDN)"]
    Frontend <-->|"REST API + JWT Bearer\n(CORS Authorized)"| Backend["Express 4 API\n(Render Docker Container)"]
    Backend <-->|"TLS / Mongoose ODM"| Database[("MongoDB Atlas\n(Replica Set Cluster)")]
```

---

## 5. Production Build: `dist/` vs. `src/` + `node_modules/`

Running `npm run build` compiles the application into the `dist/` directory:
- **What Vite Outputs in `dist/`**: Minified, tree-shaken JS/CSS bundles + `index.html`.
- **Why `dist/` is Dramatically Smaller**:
  1. **Tree-Shaking**: Rollup analyzes static ES module graphs and strips unused library functions and classes.
  2. **Exclusion of `devDependencies`**: Development tooling (Vite, ESLint, TypeScript types) present in `node_modules` (~100+ MB) are completely omitted.
  3. **Minification & Mangling**: Variable identifiers, whitespace, comments, and redundant syntax are minified into ultra-compact, high-density machine code.

---

## 6. Docker & CI/CD Concepts

### Image vs. Container
A Docker image is an immutable, read-only template packaging application code, dependencies, and system runtime libraries.
A container is a lightweight, isolated execution instance created at runtime from an underlying image.
Multiple stateful or stateless containers can be instantiated from a single image across any platform.

### CI vs. CD
Continuous Integration (CI) automatically builds, lints, and tests code changes on every pull request to catch defects early.
Continuous Delivery/Deployment (CD) automatically packages and releases verified build artifacts directly to production infrastructure.
CI guarantees code quality and prevents merge conflicts, while CD eliminates manual deployment overhead and reduces time-to-market.

