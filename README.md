# 🌧️ RainRoute — Smart Monsoon Navigation & Hazard Detection

<div align="center">

[![React Native](https://img.shields.io/badge/React_Native-v0.76-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_52-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_v5-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_TTL_Cache-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_CDN-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)

**A full-stack, crowd-powered mobile navigation engine designed to combat urban waterlogging and monsoon commuting hazards.**

[Explore Features](#-key-features) • [System Architecture](#-system-architecture) • [Tech Stack](#-technical-stack) • [Quick Start](#-quick-start--installation) • [API Docs](#-rest-api-reference) • [Production Launch Guide](#-production-deployment-guide-100-free)

</div>

---

### ⚡ Quick Glance / Executive Summary

| Category | Key Highlight |
| :--- | :--- |
| **Problem** | Commuters encounter **unmapped flash floods, waterlogged roads, open manholes, and blocked paths** during heavy rains that standard GPS apps fail to identify. |
| **Solution** | **Real-time crowd-sourced hazard reporting**, photographic evidence verification, **proactive route risk assessment**, and **automatic flood-avoidance detours**. |
| **Engineering Highlights** | **Role-based admin moderation (JWT)**, 60m geo-fence proximity collision detection, multi-hazard category tagging, **zero-cost Leaflet vector mapping via WebView**, and **self-purging 6-hour TTL database indexing**. |
| **Core Stack** | **Frontend:** React Native (Expo SDK 52) • **Backend:** Node.js (Express v5) • **Database:** MongoDB Atlas • **Media:** Cloudinary CDN |

---

## 🏗️ System Architecture

<p align="center">
  <img src="docs/architecture.png" alt="RainRoute System Architecture" width="100%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);" />
</p>

### 🔄 End-to-End Data Flow

1. **Capture & Categorize**: User snaps a hazard photo; selects category (**Waterlogging, Pothole, Construction, Road Obstacle, Accident**) and adds an optional description.
2. **Direct CDN Distribution**: `expo-image-manipulator` compresses the asset on-device, and uploads **directly to Cloudinary** via an unsigned preset, returning an optimized secure URL.
3. **Geo-Tagged Persistence**: The mobile client sends coordinate pairs (`latitude`, `longitude`), hazard metadata, and image URL to the **Node.js/Express REST API**.
4. **Self-Expiring Storage**: The report is saved to **MongoDB Atlas**, where a native **TTL (Time-To-Live) index automatically deletes the document after 6 hours**.
5. **Real-Time Polling & Detour Calculation**: Active reports are distributed to all connected clients. When calculating navigation, the **OSRM routing engine checks if routes intersect any active hazard zones** and recalculates safe detours dynamically.
6. **Admin Authorization**: Municipal admins can log in to **mark hazards as resolved (Fixed)** or **purge reports permanently**, updating the live map instantly for all users.

---

## ✨ Key Features

### 🗺️ Google Maps-Grade Navigation Interface
* **Floating Search & Navigation Bar**: Clean Google Maps aesthetic featuring live report count, address search with debounce, and quick menu access.
* **Turn-by-Turn Navigation Card**: Large ETA minutes, arrival time, total distance, and live hazard collision alerts with one-tap detour switching.
* **Simulated Navigation Mode**: Real-time turn-by-turn guidance banner with keep-right and bypass instructions.

### 🛡️ Role-Based Access Control (Admin vs. Commuter)
* **Zero-Friction Public Use**: Normal users can freely view maps, calculate routes, report incidents, and submit feedback without needing an account.
* **Secured Admin Control Center**: Municipal staff can sign in using JWT credentials to review reports, toggle status to "Fixed", or delete obsolete entries.

### ⚠️ Multi-Category Hazard Tagging
* Supports distinct incident categories:
  * 🌊 **Waterlogging / Flood**
  * 🕳️ **Pothole / Open Manhole**
  * 🚧 **Road Construction**
  * ⛔ **Road Obstacle / Blockage**
  * 💥 **Accident / Congestion**
  * ⚠️ **General Road Danger**
* Color-coded pins and interactive Leaflet popup cards displaying category badges, severity levels, photos, and admin actions.

### 🚨 Emergency SOS Assistance
* **One-Tap Emergency Hotlines**: Immediate phone dialer triggers for Police (112), Disaster Management / Flood Control (1077), Ambulance (108), and Fire & Rescue (101).
* **Live GPS Location Broadcast**: Instantly packages live GPS coordinates into an emergency Google Maps link for sharing via WhatsApp or SMS.
* **Monsoon Safety Protocol**: Practical rules on water depth limits (6" stalls engines, 12" floats vehicles) and electrical hazards.

### 💬 Community Feedback & FAQs
* **Interactive FAQ Hub**: Explains hazard decay, routing calculations, and privacy protocols.
* **Feedback Engine**: Allows users to rate the app (1-5 stars), select topics, and submit suggestions directly to the MongoDB backend.

---

## 🛠️ Technical Stack

### **Frontend (Mobile App)**
* **Framework:** React Native (0.76) via Expo (SDK 52)
* **Map Container:** React Native WebView + Leaflet 1.9.4 & OpenStreetMap
* **Routing Engine:** Open Source Routing Machine (OSRM) REST API
* **Geocoding:** OSM Nominatim Search API
* **Media & Hardware:** Expo Camera, Image Picker, Image Manipulator, Expo Location
* **Icons & UI:** Ionicons, Material Community Icons, Feather

### **Backend (API Service)**
* **Runtime:** Node.js & Express.js (v5)
* **Database:** MongoDB Atlas with Mongoose (v9)
* **Authentication:** JSON Web Tokens (JWT) & bcrypt
* **Data Lifecycle:** MongoDB Native TTL Indexes (6 hours)
* **Media Storage:** Cloudinary Cloud Media CDN

---

## 📡 REST API Reference

Base Endpoint: `http://<SERVER_HOST>:3000/api`

### 1. Public Endpoints (No Auth Required)

| Method | Endpoint | Description | Request Body | Status Code |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/reports` | Submit a new hazard report | `{ latitude, longitude, imageUrl, hazardType, description, severity }` | `201 Created` |
| `GET` | `/api/reports` | Retrieve all active, non-expired reports | None | `200 OK` |
| `GET` | `/api/reports/stats` | System health check and active hazard count | None | `200 OK` |
| `POST` | `/api/feedback` | Submit community feedback | `{ rating, category, message, contactEmail }` | `201 Created` |

### 2. Admin Endpoints (Requires `Authorization: Bearer <TOKEN>`)

| Method | Endpoint | Description | Request Body | Status Code |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Admin login & token generation | `{ username, password }` | `200 OK` |
| `GET` | `/api/auth/verify` | Verify active admin session | None | `200 OK` |
| `GET` | `/api/reports/all` | Fetch all reports (active + resolved) | None | `200 OK` |
| `PATCH` | `/api/reports/:id/status` | Mark hazard as resolved or active | `{ status: "resolved" \| "active" }` | `200 OK` |
| `DELETE` | `/api/reports/:id` | Permanently remove hazard report | None | `200 OK` |
| `GET` | `/api/feedback` | Review submitted user feedback | None | `200 OK` |

---

## 📂 Project Structure

```text
RainRoute/
├── docs/
│   └── architecture.png           # System architecture infographic
├── README.md                      # Primary project documentation
├── .gitignore                     # Repository-wide ignore definitions
│
├── rainroute-backend/             # Express.js REST API
│   ├── .env.example               # Environment variables template
│   ├── server.js                  # App bootstrap and middleware registration
│   ├── package.json               # Backend dependencies
│   └── src/
│       ├── config/db.js           # Mongoose Atlas connection client
│       ├── controllers/
│       │   ├── authController.js     # Admin login & JWT generation
│       │   ├── reportController.js   # Hazard submission, status toggle & deletion
│       │   └── feedbackController.js # Feedback handling
│       ├── middleware/
│       │   ├── authAdmin.js          # JWT Bearer token verification
│       │   ├── errorHandler.js       # Centralized error handler
│       │   └── logger.js             # HTTP request logging
│       ├── models/
│       │   ├── Report.js             # Hazard schema with 6-hour TTL index
│       │   └── Feedback.js           # Community feedback schema
│       ├── routes/
│       │   ├── authRoutes.js         # /api/auth routes
│       │   ├── reportRoutes.js       # /api/reports routes
│       │   └── feedbackRoutes.js     # /api/feedback routes
│       └── services/
│           └── reportService.js      # Database query abstractions
│
└── rainroute/                     # React Native / Expo Mobile App
    ├── app.json                   # App manifest & permissions
    ├── App.js                     # Root controller, state & routing orchestrator
    ├── package.json               # Mobile frontend dependencies
    ├── assets/                    # Icons and splash branding
    └── src/
        ├── components/
        │   ├── MapScreen.js          # Leaflet vector map inside native WebView
        │   ├── ActionButtons.js      # Floating action controls (Report, SOS, GPS)
        │   ├── ReportHazardModal.js  # Multi-category hazard report dialog
        │   ├── SosModal.js           # Emergency helplines & location broadcast
        │   ├── FaqModal.js           # Interactive accordion questions
        │   ├── FeedbackModal.js      # Star ratings & suggestion box
        │   ├── AdminModal.js         # Admin authentication & hazard manager
        │   └── MenuDrawer.js         # Quick hub menu & backend IP switcher
        ├── config/cloudinary.js      # Cloudinary configuration
        └── services/
            ├── apiService.js         # Backend client, OSRM routing & geocoding
            ├── locationService.js    # High-precision GPS tracking
            └── uploadService.js      # Media capture, compression & CDN pipeline
```

---

## 🚀 Quick Start & Installation

### Prerequisites
* **Node.js** (v18.x or v20.x)
* **Git**
* **Expo Go App** installed on your physical mobile device ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

---

### 1. Backend Setup (`rainroute-backend`)

```bash
cd rainroute-backend
npm install
cp .env.example .env
npm start
```

### 2. Frontend Setup (`rainroute`)

```bash
cd rainroute
npm install
npx expo start
```

---

## 🌐 Production Deployment Guide (100% Free)

You can launch RainRoute as a fully functional, public production app without spending a single penny:

### 1. Free Backend Hosting (Render / Koyeb)
1. Sign up at **[render.com](https://render.com)** (Free Web Service tier).
2. Connect your GitHub repository: `https://github.com/rishipatel83/RainRoute`.
3. Set the Root Directory to: `rainroute-backend`.
4. Set Build Command: `npm install` and Start Command: `npm start`.
5. Under **Environment Variables**, add:
   - `MONGO_URI`: Your MongoDB Atlas connection string.
   - `JWT_SECRET`: A secure random string.
   - `ADMIN_USER`: `admin`
   - `ADMIN_PASSWORD`: Your secret admin password.
6. Click **Deploy**. Render gives you a free HTTPS URL: `https://rainroute-backend.onrender.com`.

### 2. Connect Frontend to Production Backend
1. Open [rainroute/src/services/apiService.js](file:///d:/CODES/RainRoute/rainroute/src/services/apiService.js).
2. Update `DEFAULT_BASE_API_URL`:
   ```javascript
   export const DEFAULT_BASE_API_URL = 'https://rainroute-backend.onrender.com/api';
   ```

### 3. Generate Standalone Android App (.APK) for Free
Using Expo Application Services (EAS Build), you can compile a production `.apk` file that anyone can download and install:

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Login to your free Expo account
eas login

# 3. Configure build profile
eas build:configure

# 4. Trigger free cloud APK build
eas build -p android --profile preview
```
* Once complete, Expo provides a direct download link for your standalone `.apk` file!

### 4. Free App Distribution via GitHub Releases
1. Take the generated `.apk` file.
2. In your GitHub repository, navigate to **Releases** > **Draft a new release**.
3. Upload `RainRoute.apk` as a binary asset.
4. Any user around the world can download and install the app directly on their Android phone!

---

## 👨‍💻 Author & Contributions

* **Author:** Rishi Patel ([@rishipatel83](https://github.com/rishipatel83))
* **Contact:** [rishi.777.patel@gmail.com](mailto:rishi.777.patel@gmail.com)
* **Contributions:** Open-source contributions and feature requests are welcome via Pull Requests.
