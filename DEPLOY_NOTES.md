# JobTrackr Production Deployment Failure Drills & Troubleshooting

This document details the three intentional production failure drills conducted to validate our monitoring, root-cause diagnosis, and recovery workflows across Render, Vercel, and MongoDB Atlas.

---

## Failure Drill 1: Database Connection Failure (Wrong MONGODB_URI / Missing Atlas IP Allowlist)

### 1. Symptoms & Observed Error Message
When the backend service deployed or spun up a container on Render, the process crashed or hung before serving HTTP requests:
```text
MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster.
One common reason is that you're trying to access the database from an IP that isn't whitelisted.
[MongoServerError: bad auth : authentication failed]
```

### 2. Diagnostic Location
- **Render Dashboard**: Service &rarr; **Logs** &rarr; **Events / Deploy Logs**.
- Health check requests to `https://<render-app>.onrender.com/api/health` returned HTTP `502 Bad Gateway` or timed out.

### 3. Root Cause
1. **Network Access Block**: MongoDB Atlas by default restricts database access to known static IPs. Because Render assigns dynamic, ephemeral egress IPs to web service containers, Atlas drops incoming TCP connection handshakes.
2. **Invalid URI Credentials**: Special characters in the MongoDB password were not properly URL-encoded, or the URI referenced a nonexistent database user.

### 4. Resolution Steps
1. Navigate to **MongoDB Atlas** &rarr; **Security** &rarr; **Network Access**.
2. Click **Add IP Address** &rarr; Choose **Allow Access from Anywhere** (`0.0.0.0/0`) &rarr; **Confirm**.
3. Navigate to **Render Dashboard** &rarr; Select Web Service &rarr; **Environment**.
4. Update `MONGODB_URI` with the valid connection string:
   ```env
   MONGODB_URI=mongodb+srv://<db_user>:<encoded_password>@cluster0.ttinnps.mongodb.net/jobtrackr?retryWrites=true&w=majority
   ```
5. Trigger **Manual Deploy** &rarr; **Clear build cache & deploy**.
6. Verify deployment log output: `MongoDB Connected: cluster0-shard-00-01.ttinnps.mongodb.net`.

---

## Failure Drill 2: Cross-Origin Resource Sharing (CORS) Policy Mismatch

### 1. Symptoms & Observed Error Message
When submitting the login or registration form from the Vercel frontend, the UI remained on a loading spinner, and the browser blocked all network traffic:
```text
Access to XMLHttpRequest at 'https://jobtrackr-api.onrender.com/api/auth/login' from origin 'https://jobtrackr.vercel.app' has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 'http://localhost:5173' that is not equal to the supplied origin.
```

### 2. Diagnostic Location
- **Browser Developer Tools**: `F12` &rarr; **Console** tab (red CORS policy violation message).
- **Network Tab**: The preflight `OPTIONS /api/auth/login` request returned status `403 Forbidden` or `404` without `Access-Control-Allow-Origin` headers.

### 3. Root Cause
The backend Express `cors()` middleware in `server.js` was reading `CLIENT_URL`, which was either unset in Render's environment (falling back to `http://localhost:5173`) or contained an unintended trailing slash (`https://jobtrackr.vercel.app/`), which does not strictly match the browser's exact `Origin: https://jobtrackr.vercel.app`.

### 4. Resolution Steps
1. Navigate to **Render Dashboard** &rarr; Web Service &rarr; **Environment**.
2. Set `CLIENT_URL` to the exact Vercel production domain:
   ```env
   CLIENT_URL=https://jobtrackr.vercel.app
   ```
3. Verified `server.js` regex stripping logic to ensure trailing slashes are safely pruned:
   ```javascript
   const clientOrigin = process.env.CLIENT_URL
     ? process.env.CLIENT_URL.replace(/\/+$/, '')
     : 'http://localhost:5173';
   ```
4. Click **Save Changes** & wait for Render auto-deploy.
5. In Chrome DevTools, verify preflight `OPTIONS` returns HTTP `204 No Content` with:
   - `Access-Control-Allow-Origin: https://jobtrackr.vercel.app`
   - `Access-Control-Allow-Credentials: true`

---

## Failure Drill 3: Missing Build-Time VITE_API_URL on Vercel

### 1. Symptoms & Observed Error Message
The frontend rendered cleanly on Vercel, but interacting with forms resulted in immediate network failures:
```text
GET https://jobtrackr.vercel.app/api/auth/login 404 (Not Found)
// OR
POST undefined/auth/login net::ERR_NAME_NOT_RESOLVED
```

### 2. Diagnostic Location
- **Browser Developer Tools**: `F12` &rarr; **Network** tab &rarr; **Fetch/XHR**. Inspecting the request URL showed requests targeting relative paths on Vercel (`https://jobtrackr.vercel.app/api/...`) rather than the remote Render backend (`https://jobtrackr-api.onrender.com/api/...`).

### 3. Root Cause
Vite client-side environment variables prefixed with `VITE_` are **injected statically at build time** into client bundles. If `VITE_API_URL` is missing from Vercel's Environment Variables during the build step, Vite substitutes `import.meta.env.VITE_API_URL` with `undefined`. Simply adding the variable in the Vercel dashboard does not affect previously deployed static assets until a fresh build is executed.

### 4. Resolution Steps
1. Navigate to **Vercel Project Dashboard** &rarr; **Settings** &rarr; **Environment Variables**.
2. Add new variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://<your-render-app>.onrender.com/api`
   - **Environments**: Production, Preview, Development.
3. **Execute Full Redeploy**: Navigate to **Deployments** tab &rarr; Click `...` on the latest deployment &rarr; Select **Redeploy**.
4. Once deployment finishes, refresh `https://jobtrackr.vercel.app/` and inspect Network tab to confirm calls target `https://<your-render-app>.onrender.com/api/applications`.
