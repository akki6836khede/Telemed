# Production Deployment Guide: Patient Telehealth Portal

This guide provides step-by-step instructions to deploy the entire MERN Telehealth platform **100% free** using:
- **Database:** MongoDB Atlas (M0 Free Tier)
- **Backend API:** Render / Railway (Node.js Service)
- **Frontend App:** Vercel (React + Vite SPA)

---

## Part 1: Setup MongoDB Atlas (Free Cloud Database)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account.
2. Create a new cluster and select **M0 (Shared Free)** tier.
3. Under **Security → Database Access**:
   - Create a database user (e.g., `telemed_admin`) with a secure password.
4. Under **Security → Network Access**:
   - Click **Add IP Address** → Choose **Allow Access from Anywhere (`0.0.0.0/0`)** so your deployed backend host can connect.
5. Under **Database Deployments**:
   - Click **Connect** → Choose **Drivers (Node.js)**.
   - Copy your connection string:
     ```
     mongodb+srv://telemed_admin:<password>@cluster0.xxxxx.mongodb.net/telehealth_db?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your database user password.

---

## Part 2: Deploy Backend on Render (Free)

1. Push your project repository to **GitHub** (or deploy directly from Render).
2. Go to [render.com](https://render.com) and create a **New Web Service**.
3. Connect your GitHub repository.
4. Fill in the service configuration:
   - **Name:** `telehealth-backend` (or your choice)
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

5. In the **Environment Variables** tab, add:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Port assigned by Render (or leave default) |
   | `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string |
   | `JWT_SECRET` | `generate_a_random_64_char_string` | Secure JWT encryption key |
   | `JWT_EXPIRES_IN` | `7d` | Token lifetime |
   | `USE_LOCAL_STORAGE` | `true` | Uses local disk fallback for uploaded PDF reports |
   | `CLIENT_URL` | `https://your-frontend.vercel.app` | Your Vercel frontend URL (can update after Part 3) |
   | `SMTP_HOST` | `smtp.gmail.com` | (Optional) Email host for real OTP delivery |
   | `SMTP_PORT` | `587` | (Optional) SMTP port |
   | `SMTP_USER` | `your_email@gmail.com` | (Optional) Gmail address |
   | `SMTP_PASS` | `xxxx xxxx xxxx xxxx` | (Optional) 16-digit Google App Password |
   | `EMAIL_FROM` | `"TeleMed Portal" <your_email@gmail.com>` | (Optional) Sender label |

6. Click **Deploy Web Service**.
7. Once deployed, Render will give you a public URL, for example:
   ```
   https://telehealth-backend.onrender.com
   ```
   Verify it by opening `https://telehealth-backend.onrender.com/api/health` in your browser. You should see `{"status":"ok"}`.

### (Optional) Run Database Seed on Render
To seed the initial admin, verified doctors, and sample patients:
- Go to the Render service dashboard → **Shell** tab.
- Run:
  ```bash
  npm run seed
  ```

---

## Part 3: Deploy Frontend on Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New... → Project**.
3. Select your repository.
4. Configure the project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click `Edit` and select `frontend`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://telehealth-backend.onrender.com/api` |
   *(Important: Replace with your actual Render backend URL followed by `/api`)*
6. Click **Deploy**.
7. Vercel will build and assign you a live domain, for example:
   ```
   https://telehealth-portal.vercel.app
   ```

---

## Part 4: Final 1-Minute Synchronization

1. Copy your live Vercel URL (e.g. `https://telehealth-portal.vercel.app`).
2. Go back to Render → your backend service → **Environment Variables**:
   - Update `CLIENT_URL` = `https://telehealth-portal.vercel.app`.
   - Render will automatically re-deploy with CORS aligned.
3. Done! Open your Vercel URL and test:
   - Patient Registration & Login
   - Doctor Consultation Booking
   - Jitsi Video Telehealth Call
   - DPDP Consent OTP Flow
   - Emergency QR Card & Live Scanner (`/emergency/scan`)
