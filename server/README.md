# JobTrackr API — Express ES Modules Backend

JobTrackr API is a lightweight, high-performance RESTful API built with Node.js and Express using modern ECMAScript Modules (ESM). It serves as the backend service for the JobTrackr application, managing job applications across stages (Applied, Interview, Offer, Rejected) with validation, error handling, request logging, and event-loop demonstration endpoints.

---

## Table of Contents
1. [Tech Stack & Architecture](#tech-stack--architecture)
2. [Getting Started & Configuration](#getting-started--configuration)
3. [API Endpoints & Query Parameters](#api-endpoints--query-parameters)
4. [JSON Error Contract](#json-error-contract)
5. [Semantic Versioning (SemVer) in package.json](#semantic-versioning-semver-in-packagejson)
6. [Node.js Event Loop: Non-Blocking vs. Blocking](#nodejs-event-loop-non-blocking-vs-blocking)
7. [Postman Collection & Automated Tests](#postman-collection--automated-tests)

---

## Tech Stack & Architecture

- **Runtime**: Node.js (>= 18.x)
- **Framework**: Express.js 4 (`"type": "module"`)
- **Middleware**:
  - `cors`: Cross-Origin Resource Sharing configured for the client application.
  - `express.json`: Body parsing for JSON payloads.
  - Custom `logger`: Request method, URL path, and ISO timestamp logging.
  - Custom `validateApplication` & `validatePatchApplication`: Strict input validation and duplicate prevention.
  - Custom `notFoundHandler`: Catches unmatched routes and throws `ApiError(404, 'Route not found')`.
  - Custom `errorHandler`: Centralized error-handling middleware.

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
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port number the Express HTTP server listens on | `5000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `CLIENT_URL` | Allowed origin for CORS client requests | `http://localhost:5173` |

### 3. Running the Server
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
| `GET` | `/applications` | List applications (supports `?status=` and `?search=`) | `200 OK` |
| `GET` | `/applications/:id` | Retrieve application by unique ID | `200 OK` / `404 Not Found` |
| `POST` | `/applications` | Create new application with validation | `201 Created` / `400 Bad Request` |
| `PATCH`| `/applications/:id` | Update existing application fields | `200 OK` / `400 Bad Request` / `404 Not Found` |
| `DELETE`| `/applications/:id` | Delete application by ID | `204 No Content` / `404 Not Found` |
| `GET` | `/slow` | 3-second non-blocking timer demo | `200 OK` |
| `GET` | `/block` | 3-second synchronous CPU blocking loop demo | `200 OK` |

### Query Parameters for `GET /api/applications`
- **`status`** (optional): Filters applications by stage (`Applied`, `Interview`, `Offer`, `Rejected`, or `All`).
- **`search`** (optional): Case-insensitive search keyword matched against `company` or `role`.

**Example Request:**
```http
GET /api/applications?status=Interview&search=bright HTTP/1.1
Host: localhost:5000
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "2",
      "company": "Bright Labs",
      "role": "Product Designer",
      "status": "Interview",
      "appliedOn": "2026-10-15",
      "priority": "Medium"
    }
  ]
}
```

---

## JSON Error Contract

All errors thrown or intercepted by the API conform to a predictable, client-friendly JSON structure.

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

### Validation Error (400 Bad Request) Example
Triggered by `validateApplication` or `validatePatchApplication`:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "company": "Company is required and must be between 2 and 60 characters",
    "appliedOn": "appliedOn cannot be in the future"
  }
}
```

### Resource Not Found (404 Not Found) Example
Triggered when an application ID does not exist or an unmatched route is requested:
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
- **Breaking Changes Risk**: Low to moderate. Minor releases in compliant packages are backward-compatible, but may occasionally introduce regressions.
- **Example**: An update to `4.21.1` or `4.22.0` is accepted, but `5.0.0` is blocked.

### Tilde (`~4.21.0`)
- **Range Permitted**: `>= 4.21.0 < 4.22.0`
- **Behavior**: Permits **patch updates only** (bug and security fixes).
- **Breaking Changes Risk**: Minimal. Freezes the feature set to the specified minor release line.
- **Example**: An update to `4.21.1` or `4.21.9` is accepted, but `4.22.0` and `5.0.0` are blocked.

---

## Node.js Event Loop: Non-Blocking vs. Blocking

Node.js executes JavaScript on a **single-threaded call stack** powered by the V8 engine and libuv. The routes `/api/slow` and `/api/block` illustrate how asynchronous vs. synchronous operations affect the event loop.

```
       +-----------------------------------------------+
       |             Single Main Thread                |
       |  +-----------------------------------------+  |
       |  |               Call Stack                |  |
       |  +-----------------------------------------+  |
       |  |               Event Loop                |  |
       |  +-----------------------------------------+  |
       +-------+-------------------------------+-------+
               |                               |
       Offloads Timers / I/O          Synchronous CPU Loop
               v                               v
       +---------------+               [ Freezes Stack ]
       | libuv Worker  |               No other request
       | Thread / OS   |               can be processed!
       +---------------+
```

### 1. `/api/slow` — Asynchronous & Non-Blocking
- **Implementation**:
  ```javascript
  router.get('/slow', async (req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    res.status(200).json({ success: true, message: 'Finished 3-second non-blocking delay' });
  });
  ```
- **Why it does NOT block other requests**:
  `setTimeout` delegates timer management to **libuv** (operating system timer mechanisms). Once registered, the callback is removed from the active JavaScript call stack. The main thread immediately becomes free to handle incoming HTTP requests, process database I/O, or execute route handlers. When 3 seconds elapse, libuv queues the timer callback onto the Timers phase of the event loop, and Express sends the response without ever starving other clients.

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

## Postman Collection & Automated Tests

The collection file [`JobTrackr_API.postman_collection.json`](./JobTrackr_API.postman_collection.json) is formatted according to the Postman v2.1.0 schema and includes 12 automated test requests.

### Included Test Cases

#### Positive Tests (Status Assertions)
1. `GET /applications (filters: ?status=Interview&search=google)` -> Asserts `200 OK` & data array
2. `GET /applications/:id` -> Asserts `200 OK` & matching `id`
3. `POST /applications (valid body)` -> Asserts `201 Created` & created record with ID
4. `PATCH /applications/:id (partial update)` -> Asserts `200 OK` & updated fields
5. `DELETE /applications/:id` -> Asserts `204 No Content`
6. `GET /slow` -> Asserts `200 OK` & non-blocking completion message
7. `GET /block` -> Asserts `200 OK` & blocking completion message

#### Error Tests (`{ success: false }` Assertions)
1. `POST /applications (company < 2 chars)` -> Asserts `400 Bad Request` & `errors.company`
2. `POST /applications (future date)` -> Asserts `400 Bad Request` & `errors.appliedOn`
3. `POST /applications (duplicate company & role)` -> Asserts `400 Bad Request` & duplicate error
4. `GET /applications/:id (non-existent id)` -> Asserts `404 Not Found` & `Application not found`
5. `GET /unknown-route` -> Asserts `404 Not Found` & `Route not found`

### How to Import and Run
1. Open **Postman**.
2. Click **Import** and select `JobTrackr_API.postman_collection.json`.
3. Verify the collection variable `baseUrl` is set to `http://localhost:5000/api`.
4. Run the entire collection using **Run Collection** or execute individual requests.
