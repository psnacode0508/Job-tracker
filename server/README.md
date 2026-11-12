# JobTrackr API — Express ES Modules Backend

JobTrackr API is a lightweight, high-performance RESTful API built with Node.js and Express using modern ECMAScript Modules (ESM) and MongoDB/Mongoose. It manages job applications across stages (Applied, Interview, Offer, Rejected) with validation, error handling, request logging, database indexing, and event-loop demonstration endpoints.

---

## Table of Contents
1. [Tech Stack & Architecture](#tech-stack--architecture)
2. [Getting Started & Configuration](#getting-started--configuration)
3. [API Endpoints & Query Parameters](#api-endpoints--query-parameters)
4. [JSON Error Contract](#json-error-contract)
5. [Semantic Versioning (SemVer) in package.json](#semantic-versioning-semver-in-packagejson)
6. [Node.js Event Loop: Non-Blocking vs. Blocking](#nodejs-event-loop-non-blocking-vs-blocking)
7. [Database Modeling: Embedding vs. Referencing](#database-modeling-embedding-vs-referencing)
8. [SQL vs. MongoDB: Decision Framework](#sql-vs-mongodb-decision-framework)
9. [Index Benchmark: COLLSCAN vs. IXSCAN](#index-benchmark-collscan-vs-ixscan)
10. [Pagination Trade-offs: Offset vs. Cursor-Based](#pagination-trade-offs-offset-vs-cursor-based)
11. [Postman Collection & Automated Tests](#postman-collection--automated-tests)

---

## Tech Stack & Architecture

- **Runtime**: Node.js (>= 18.x)
- **Framework**: Express.js 4 (`"type": "module"`)
- **Database**: MongoDB with Mongoose ODM
- **Middleware**:
  - `cors`: Cross-Origin Resource Sharing configured for the client application.
  - `express.json`: Body parsing for JSON payloads.
  - Custom `logger`: Request method, URL path, and ISO timestamp logging.
  - Custom `validateApplication` & `validatePatchApplication`: Strict input validation and duplicate prevention.
  - Custom `notFoundHandler`: Catches unmatched routes and throws `ApiError(404, 'Route not found')`.
  - Custom `errorHandler`: Centralized error-handling middleware for custom `ApiError`, Mongoose `CastError`, `ValidationError`, and `MongoServerError` (11000).

---

## Getting Started & Configuration

### 1. Installation
Navigate into the `server` directory and install dependencies:
```bash
cd "Job Tracker/server"
npm install
```

### 2. Environment Variables
Create a `.env` file based on `.env.example`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/jobtrackr
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port number the Express HTTP server listens on | `5000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `CLIENT_URL` | Allowed origin for CORS client requests | `http://localhost:5173` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |

### 3. Database Seeding & Benchmark
Seed the database with 2 users and 1,000 randomized applications and run executionStats:
```bash
npm run seed
```

### 4. Running the Server
- **Development (Live reload with Node native watcher)**:
  ```bash
  npm run dev
  ```
- **Production start**:
  ```bash
  npm start
  ```

---

## API Endpoints & Query Parameters

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/health` | Server health check and timestamp | `200 OK` |
| `GET` | `/applications/stats` | Status counts aggregation & average offer salary | `200 OK` |
| `GET` | `/applications` | List applications with pagination, search regex, & filters | `200 OK` |
| `GET` | `/applications/:id` | Retrieve application by ID populated with owner | `200 OK` / `404 Not Found` |
| `POST` | `/applications` | Create new application with owner validation | `201 Created` / `400 Bad Request` |
| `PATCH`| `/applications/:id` | Update allowed fields with Mongoose validators | `200 OK` / `400 Bad Request` / `404 Not Found` |
| `DELETE`| `/applications/:id` | Delete application by ID | `204 No Content` / `404 Not Found` |
| `POST` | `/applications/:id/notes` | Add a note to the embedded notes array | `201 Created` / `400 Bad Request` / `404 Not Found` |
| `GET` | `/slow` | 3-second non-blocking timer demo | `200 OK` |
| `GET` | `/block` | 3-second synchronous CPU blocking loop demo | `200 OK` |

### Query Parameters for `GET /api/applications`
- **`status`** (optional): Filter applications by status (`Applied`, `Interview`, `Offer`, `Rejected`, or `All`).
- **`search`** (optional): Case-insensitive regex search matching `company` or `role`.
- **`page`** (optional, default: `1`): Current page number for pagination.
- **`limit`** (optional, default: `10`): Number of applications per page.
- **`owner`** (optional): Filter applications owned by a specific User ObjectId.

---

## JSON Error Contract

All errors conform to a predictable, client-friendly JSON structure handled centrally by `errorHandler.js`.

### Standard Error Response Format
```json
{
  "success": false,
  "message": "<Error description>",
  "errors": {
    "<field>": "<Specific validation failure reason>"
  },
  "stack": "<Error stack trace - included only in development mode>"
}
```

### Specific Error Handlers
- **Mongoose `CastError` (400)**: Invalid MongoDB ObjectId in URL params or body:
  ```json
  {
    "success": false,
    "message": "Invalid ID format",
    "errors": { "id": "Invalid ObjectId" }
  }
  ```
- **Mongoose `ValidationError` (400)**: Schema validation rejections:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": { "company": "Company must be between 2 and 60 characters" }
  }
  ```
- **MongoDB Duplicate Key (Code 11000) (400)**:
  ```json
  {
    "success": false,
    "message": "Duplicate field value entered"
  }
  ```
- **Resource Not Found (404)**:
  ```json
  {
    "success": false,
    "message": "Application not found"
  }
  ```

---

## Semantic Versioning (SemVer) in package.json

In `package.json`, dependency versions follow the `MAJOR.MINOR.PATCH` format (e.g., `4.21.0`). Prefix operators specify allowed automatic updates:

### Caret (`^4.21.0`)
- **Range Permitted**: `>= 4.21.0 < 5.0.0`
- **Behavior**: Permits **minor** (feature additions) and **patch** (bug fixes) updates without bumping the major version.
- **Example**: Updates to `4.21.1` or `4.22.0` are accepted; `5.0.0` is blocked.

### Tilde (`~4.21.0`)
- **Range Permitted**: `>= 4.21.0 < 4.22.0`
- **Behavior**: Permits **patch updates only** (bug and security fixes).
- **Example**: Updates to `4.21.1` or `4.21.9` are accepted; `4.22.0` and `5.0.0` are blocked.

---

## Node.js Event Loop: Non-Blocking vs. Blocking

Node.js executes JavaScript on a **single-threaded call stack** powered by the V8 engine and libuv. The routes `/api/slow` and `/api/block` illustrate how asynchronous vs. synchronous operations affect the event loop.

### 1. `/api/slow` — Asynchronous & Non-Blocking
- **Implementation**:
  ```javascript
  router.get('/slow', async (req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    res.status(200).json({ success: true, message: 'Finished 3-second non-blocking delay' });
  });
  ```
- **Why it does NOT block other requests**:
  `setTimeout` delegates timer management to **libuv** (operating system timer mechanisms). Once registered, the callback is removed from the active JavaScript call stack. The main thread immediately becomes free to handle incoming HTTP requests, process database I/O, or execute route handlers. When 3 seconds elapse, libuv queues the timer callback onto the Timers phase of the event loop, and Express sends the response without starving other clients.

### 2. `/api/block` — Synchronous & Blocking
- **Implementation**:
  ```javascript
  router.get('/block', (req, res) => {
    const start = Date.now();
    while (Date.now() < start + 3000) {
      // Synchronous busy loop
    }
    res.status(200).json({ success: true, message: 'Finished 3-second blocking loop' });
  });
  ```
- **Why it freezes the entire server**:
  The `while` loop runs pure computation directly on the **single JavaScript execution thread**. Because the call stack is occupied calculating `Date.now()` continuously, the event loop is entirely frozen. It cannot advance to process network I/O, accept new TCP socket connections, or execute scheduled timers. Every other user requesting `/api/applications` or `/api/health` will experience a total freeze until the 3-second loop terminates.

---

## Database Modeling: Embedding vs. Referencing

In MongoDB schema design, choosing between embedding and referencing is determined by relationship cardinality and query access patterns:

### Why Notes are Embedded (`[noteSchema]`)
- **Bounded 1-to-Few Relationship**: A single job application rarely exceeds a few dozen notes. The array never grows unboundedly toward MongoDB's 16MB document size limit.
- **Atomic Read Patterns**: Notes are almost exclusively read together with the parent job card (e.g., rendering the application detail view). Embedding retrieves the application and all its history in a **single disk read** without requiring `$lookup` joins.
- **Atomic Writes**: Adding a note via `POST /:id/notes` performs an atomic `$push` on the parent document.

### Why Owner is Referenced (`owner: { type: ObjectId, ref: 'User' }`)
- **Unbounded 1-to-Many Growth**: A single user may create hundreds or thousands of job applications over several years. Embedding applications inside a User document would quickly exceed the 16MB BSON ceiling.
- **Shared Entity**: The user profile contains independent authentication data, credentials, and settings. Referencing avoids duplicating user profile fields across every job application document.
- **Prevents Update Anomalies**: When a user changes their name or email, updating one User record immediately reflects everywhere without mutating thousands of individual application documents.

---

## SQL vs. MongoDB: Decision Framework

| Criterion | PostgreSQL / Relational SQL | MongoDB / Document NoSQL |
|---|---|---|
| **Data Structure** | Normalized tables with rigid rows & columns | Flexible, hierarchical JSON/BSON documents |
| **Schema Evolution** | Requires formal DDL migrations (`ALTER TABLE`) | Dynamic schema; fields can be added on-the-fly |
| **Relationships & Joins** | First-class multi-table `JOIN` operations | Denormalization / embedding; `$lookup` for joins |
| **Transactions & ACID** | Strict multi-table ACID transactions by default | Document-level atomicity; multi-document transactions supported |
| **Scalability** | Vertical scaling (CPU/RAM); read replicas | Native horizontal scaling via automatic sharding |

### When to Choose SQL (e.g., PostgreSQL)
- **Financial & Accounting Systems**: Ledgers, payments, and billing where strict referential integrity and multi-table ACID transactions are non-negotiable.
- **Complex Relational Networks**: Highly connected domain models requiring complex multi-table joins and foreign key constraints.
- **Fixed Enterprise Schemas**: Core business domains where data shapes are well-defined and consistency outweighs schema flexibility.

### When to Choose MongoDB
- **Rapidly Evolving Applications**: Early-stage products or fast-moving features (like JobTrackr) where fields and nested properties change frequently.
- **Hierarchical / Nested Documents**: Records that naturally map to nested objects (e.g., an application with embedded notes, activity logs, and interview rounds).
- **High-Throughput / Big Data**: Applications requiring massive horizontal scale and rapid document reads without multi-table join overhead.

---

## Index Benchmark: COLLSCAN vs. IXSCAN

To evaluate query performance, we benchmarked the query:
```javascript
Application.find({ owner: user1._id, status: 'Interview' }).explain('executionStats');
```
Across a collection of **1,000 job applications**:

### 1. Unindexed Baseline (`COLLSCAN`)
- **Query Execution Stage**: `COLLSCAN` (Collection Scan)
- **Total Documents Examined**: `1,000`
- **Documents Returned**: `~125`
- **Ratio (Examined : Returned)**: `8 : 1`
- **Time Complexity**: $O(N)$
- **Explanation**: Without an index, the database engine must load and scan every single document from disk to check the filter criteria. As the collection grows to 1,000,000 records, query latency degrades linearly.

### 2. Compound Index (`{ owner: 1, status: 1 }` &rarr; `IXSCAN`)
- **Query Execution Stage**: `FETCH` &larr; `IXSCAN` (Index Scan)
- **Total Documents Examined**: `~125` (only matching entries)
- **Total Keys Examined**: `~125`
- **Documents Returned**: `~125`
- **Ratio (Examined : Returned)**: `1 : 1`
- **Time Complexity**: $O(\log N)$
- **Explanation**: The B-tree compound index allows the database engine to traverse directly to the keys matching `(owner, status)` and only fetch the exact matching documents. This eliminates 87.5% of disk reads on just 1,000 records, preserving CPU and RAM.

---

## Pagination Trade-offs: Offset vs. Cursor-Based

### Why Offset Pagination (`.skip(N).limit(L)`) Degrades at Scale
Express pagination often uses:
```javascript
Application.find(filter).skip((page - 1) * limit).limit(limit);
```
- **The Problem**: MongoDB does not magically jump to record `N`. To execute `.skip(100000).limit(10)`, MongoDB must iterate through and discard all `100,000` preceding index or document entries before collecting the 10 requested documents.
- **Resource Exhaustion**: At high page numbers, `.skip(N)` degrades into an $O(N)$ operation, consuming massive CPU and disk I/O.
- **Page Drift**: If records are inserted or deleted while a user navigates between pages, items can be duplicated or skipped.

### Scalable Alternative: Cursor-Based (Keyset) Pagination
Instead of skipping records, cursor-based pagination queries relative to the last retrieved record:
```javascript
// Fetch page using last seen _id or timestamp
Application.find({
  ...filter,
  _id: { $lt: lastSeenId }
})
.sort({ _id: -1 })
.limit(10);
```
- **Constant Time ($O(\log N)$)**: The database engine utilizes the `_id` B-tree index to locate the starting point in logarithmic time, regardless of whether you are retrieving the 1st page or the 10,000th page.
- **Immune to Page Drift**: Insertions or deletions do not shift the cursor boundary, ensuring clean pagination without duplicate or missing items.

---

## Day 07: Security & Hardening Architecture

### 1. Helmet Security Headers
JobTrackr registers `helmet()` as the very first middleware in `src/server.js`. Helmet automatically sets essential HTTP response headers to protect against common web vulnerabilities:

- **`X-Content-Type-Options: nosniff`**: Instructs browsers to strictly adhere to the MIME type declared in the `Content-Type` response header and disables MIME-type sniffing. This prevents malicious files uploaded or returned as images/text from being executed as JavaScript.
- **`X-Frame-Options: SAMEORIGIN`**: Restricts the page from being rendered inside an `<iframe>`, `<frame>`, or `<object>` on third-party websites. This eliminates **Clickjacking** attacks, where an attacker transparently overlays an invisible iframe to trick authenticated users into clicking sensitive UI elements.
- **`Strict-Transport-Security` (HSTS)**: Enforces that the client browser must only communicate with the server over secure HTTPS connections (`max-age=15552000; includeSubDomains`). This defends against SSL-stripping and man-in-the-middle (MITM) downgrade attacks.
- **`Content-Security-Policy` (CSP)**: Defines an approved whitelist of trusted domains and sources for scripts, stylesheets, fonts, and images, dramatically reducing the blast radius of injection vulnerabilities.

---

### 2. Cross-Site Scripting (XSS) Defence
In JobTrackr, notes can be added to applications with arbitrary text payloads, including malicious strings like `<img src=x onerror=alert(1)>`.

- **Safe Storage in MongoDB**: Storing `<img src=x onerror=alert(1)>` in MongoDB documents is completely safe on the API server. MongoDB stores data as BSON text strings and does not execute or evaluate HTML markup or scripts.
- **React Automatic JSX Escaping**: On the frontend, React protects against XSS by default. When rendering dynamic values in JSX expressions—such as `{note.text}`—React treats the input strictly as a string and automatically escapes dangerous characters (converting `<` to `&lt;`, `>` to `&gt;`, `"` to `&quot;`, and `&` to `&amp;`). Because the browser's DOM parser receives plain HTML entities, the `<img>` tag is rendered as visible text on screen rather than an executable DOM node.
- **The Danger of `dangerouslySetInnerHTML`**: React provides the `dangerouslySetInnerHTML` prop for rendering raw HTML. If a developer uses `dangerouslySetInnerHTML={{ __html: note.text }}` without sanitization, the browser bypasses React's escaping mechanism, parses the `onerror` event handler, and executes `alert(1)`. If raw HTML rendering is ever required, developers must sanitize the payload using a trusted sanitizer such as **DOMPurify** (`DOMPurify.sanitize(note.text)`) prior to rendering.

---

### 3. NoSQL Injection Defence
MongoDB query selectors accept nested objects containing query operators. For example, if an unhardened endpoint performs `User.findOne({ email: req.body.email, password: req.body.password })`, an attacker could send a JSON payload such as:
```json
{
  "email": { "$ne": null },
  "password": { "$ne": null }
}
```
In an unprotected server, this query evaluates to *find any user where email is not null*, completely bypassing credential checks.

JobTrackr implements a strict two-layer defense against NoSQL injection:
1. **Explicit Type Validation**: In [authRoutes.js](file:///C:/Users/Aasritha/OneDrive/Desktop/Job%20Tracker/server/src/routes/authRoutes.js), route handlers explicitly enforce `typeof email === 'string'` and `typeof password === 'string'`. If an attacker submits an object (such as `{ "$ne": null }`), the server instantly rejects the request with HTTP `400 Bad Request` before invoking any database queries.
2. **Global Query Sanitization (`mongoose.set('sanitizeFilter', true)`)**: In [db.js](file:///C:/Users/Aasritha/OneDrive/Desktop/Job%20Tracker/server/src/config/db.js), Mongoose is configured globally with `sanitizeFilter: true`. This feature automatically strips or disables MongoDB query operators (`$`-prefixed keys) from filter arguments across all Mongoose queries (`find`, `findOne`, `findOneAndUpdate`, etc.), guaranteeing that even unexpected user objects cannot manipulate query operators.

---

## Postman Collection & Automated Tests

The collection file [`JobTrackr_API.postman_collection.json`](./JobTrackr_API.postman_collection.json) is formatted according to the Postman v2.1.0 schema and includes 22 automated test requests across 3 distinct test suites.

### Included Test Cases

#### Positive Tests (Status Assertions)
1. `GET /applications (filters: ?status=Interview&search=google)` &rarr; Asserts `200 OK` & data array
2. `GET /applications/:id` &rarr; Asserts `200 OK` & matching `id`
3. `POST /applications (valid body)` &rarr; Asserts `201 Created` & created record with ID
4. `PATCH /applications/:id (partial update)` &rarr; Asserts `200 OK` & updated fields
5. `DELETE /applications/:id` &rarr; Asserts `204 No Content`
6. `GET /slow` &rarr; Asserts `200 OK` & non-blocking completion message
7. `GET /block` &rarr; Asserts `200 OK` & blocking completion message

#### Error Tests (`{ success: false }` Assertions)
1. `POST /applications (company < 2 chars)` &rarr; Asserts `400 Bad Request` & `errors.company`
2. `POST /applications (future date)` &rarr; Asserts `400 Bad Request` & `errors.appliedOn`
3. `POST /applications (duplicate company & role)` &rarr; Asserts `400 Bad Request` & duplicate error
4. `GET /applications/:id (non-existent id)` &rarr; Asserts `404 Not Found` & `Application not found`
5. `GET /unknown-route` &rarr; Asserts `404 Not Found` & `Route not found`

#### Day 07 Auth & Security Tests
1. `POST /auth/register` (User A) &rarr; Asserts `201 Created` & saves `tokenA`
2. `POST /auth/register` (User B) &rarr; Asserts `201 Created` & saves `tokenB`
3. `POST /auth/login` (Admin User) &rarr; Asserts `200 OK` & saves `adminToken`
4. `POST /applications` (User A creates card) &rarr; Asserts `201 Created` & saves `appAId`
5. `GET /applications/{{appAId}}` (User B access attempt) &rarr; Asserts `404 Not Found` (ownership isolation)
6. `GET /admin/stats` (User B role access attempt) &rarr; Asserts `403 Forbidden` (role authorization)
7. `GET /admin/stats` (Admin access) &rarr; Asserts `200 OK` & returns platform stats
8. `POST /auth/login` (NoSQL injection `{ "email": { "$ne": null } }`) &rarr; Asserts `400`/`401` rejection
9. `POST /applications/{{appAId}}/notes` (XSS payload `<img src=x onerror=alert(1)>`) &rarr; Asserts `201 Created` & safe string storage
10. `POST /auth/login` (Rate limit 6th failed attempt) &rarr; Asserts `429 Too Many Requests`

### How to Import and Run
1. Open **Postman**.
2. Click **Import** and select `JobTrackr_API.postman_collection.json`.
3. Verify the collection variable `baseUrl` is set to `http://localhost:5000/api`.
4. Run the entire collection using **Run Collection** or execute individual requests.
