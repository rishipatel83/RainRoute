# 🌧️ RainRoute — Smart Monsoon Navigation & Crowdsourced Hazard Detection

[![React Native](https://img.shields.io/badge/React_Native-v0.76-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_52-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_v4-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_TTL_Cache-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_CDN-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **RainRoute** is a fullstack, crowd-powered mobile navigation system engineered to solve urban waterlogging and monsoon commuting hazards. It delivers real-time hazard mapping, community-driven photo verification, proactive route risk evaluation, and intelligent detour routing around flooded road segments.

---

## 📌 Table of Contents

- [Problem Statement & Impact](#-problem-statement--impact)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack & Software Ecosystem](#-tech-stack--software-ecosystem)
- [Security & Engineering Design Decisions](#-security--engineering-design-decisions)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Step-by-Step Installation & Setup](#-step-by-step-installation--setup)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup-rainroute-backend)
  - [2. Mobile App Setup](#2-mobile-app-setup-rainroute)
- [Roadmap & Enhancements](#-roadmap--enhancements)
- [Author & Acknowledgements](#-author--acknowledgements)

---

## 🌊 Problem Statement & Impact

During heavy rainfalls and monsoon conditions, urban commuters frequently encounter unmapped flash floods, severe waterlogging, open manholes, and impassable roads. Conventional navigation applications prioritize traffic congestion or highway speeds, but lack granular, real-time awareness of transient localized water hazards.

**RainRoute bridges this critical safety gap:**
1. **Empowers Commuters**: Anyone can flag a waterlogged section in under 5 seconds with geo-tagged photographic evidence.
2. **Proactive Hazard Detection**: When calculating routes, RainRoute checks proximity against live hazard coordinates and warns drivers before they drive into waterlogged streets.
3. **Smart Detours**: Provides alternate paths navigating around active flood sectors.
4. **Self-Cleaning Data Pipeline**: Using MongoDB TTL indexes, hazards naturally decay and expire after 6 hours, ensuring maps never stay cluttered with stale conditions after waters recede.

---

## ✨ Key Features

### 🗺️ Dynamic Interactive Map
* **Leaflet + OpenStreetMap Integration**: Rendered inside a high-performance React Native `WebView`, eliminating vendor lock-in and high Google Maps billing fees.
* **Animated Radar Pulse Marker**: Live GPS visualizer with concentric animated pulse rings reflecting user tracking precision.
* **Interactive Hazard Pins**: Color-coded danger markers with interactive popups displaying verified photos, timestamps, and hazard coordinates.

### 🚗 Intelligent Routing & Detour Engine
* **Turn-by-Turn Path Calculation**: Powered by OSRM (Open Source Routing Machine) with real-time distance (km) and estimated travel duration (minutes).
* **Proximity Hazard Intersection**: Mathematical geo-fencing checks if the suggested polyline intersects within a 75-meter radius of any reported waterlogging zone.
* **Multi-Route Analysis**: Provides recommended routes alongside calculated detours that steer clear of high-risk flood corridors.

### 📸 Streamlined Community Reporting
* **Instant In-App Capture**: Seamless camera and gallery integration via `expo-image-picker`.
* **Client-Side Compression**: Uses `expo-image-manipulator` to downscale and compress images before transfer, saving mobile cellular data and accelerating upload speed.
* **Direct CDN Offloading**: Uploads directly to Cloudinary media servers via unsigned presets, avoiding server memory bottlenecks.

### ⏱️ Automatic 6-Hour Hazard Lifecycle (TTL)
* Flash floods recede over time. Rather than relying on manual administrative moderation, reports automatically expire and self-delete from the database 6 hours after submission via MongoDB TTL indexes.

### 🔍 Real-Time Geocoding Search
* Fast address search powered by OpenStreetMap Nominatim with debounced keyboard query inputs.

---

## 🏗️ System Architecture

```text
               +------------------------------------------------------+
               |             React Native / Expo Mobile App           |
               |                                                      |
               |   [Leaflet WebView] <---> [OSRM Route Engine]        |
               |          |                           |               |
               |   [Camera / GPS]              [Search Nominatim]     |
               +----------+---------------------------+---------------+
                          |                           |
                 (1) Upload Photo            (2) Post Coordinate Report
                          |                           |
                          v                           v
              +----------------------+     +----------------------+
              |    Cloudinary CDN    |     | Express REST API     |
              | (Image Optimization) |     |  Node.js Microservice|
              +----------+-----------+     +----------+-----------+
                         |                            |
                         +---- (Stores Image URL) ----+
                                                      |
                                                      v
                                           +----------------------+
                                           |  MongoDB Atlas       |
                                           |  - Geospatial Data   |
                                           |  - 6hr TTL Auto-Purge|
                                           +----------------------+
```

---

## 🛠️ Tech Stack & Software Ecosystem

| Layer | Technology | Purpose & Rationale |
| :--- | :--- | :--- |
| **Mobile Frontend** | **React Native (0.76)** & **Expo (SDK 52)** | Cross-platform native mobile experience with rapid iteration and device hardware access. |
| **Map Engine** | **Leaflet (1.9.4)** + **OpenStreetMap** | Open-source, lightweight vector mapping rendered in an optimized WebView with custom CSS animations. |
| **Routing & Geocoding** | **OSRM API** & **OSM Nominatim** | Turn-by-turn route geometry calculation and debounced global address search. |
| **Media Pipeline** | **Cloudinary CDN** + **Expo Image Manipulator** | Client-side compression and direct CDN distribution for high-availability image hosting. |
| **Backend Framework** | **Node.js** & **Express.js (v4)** | Lightweight, non-blocking asynchronous RESTful API architecture. |
| **Database** | **MongoDB Atlas** & **Mongoose (v8)** | NoSQL document storage with native schema validation and TTL (Time-To-Live) index expiration. |
| **Security & Middleware** | **CORS**, **Dotenv**, **Custom Error Handling** | Network boundary safety, environment isolation, and structured JSON error reporting. |

---

## 🔒 Security & Engineering Design Decisions

### 1. Why is `.env` Isolated from Git?
* The backend interacts with a live **MongoDB Atlas cluster**. Database connection strings contain embedded database user credentials (`mongodb://username:password@...`).
* Exposing connection strings on public GitHub repositories allows automated credential-scraping bots to compromise data integrity.
* **Solution**: All sensitive credentials reside strictly in local `.env` files protected by `.gitignore`. A sample [.env.example](file:///d:/CODES/RainRoute/rainroute-backend/.env.example) template is provided for quick environment setup.

### 2. Client-Side Image Offloading (Cloudinary Unsigned Preset)
* Mobile images are sent directly to Cloudinary using an **unsigned upload preset** with restricted asset folder access.
* This avoids piping large binary multipart form streams through the Express server, drastically reducing backend CPU/RAM usage and protecting Cloudinary API master secrets from being decompiled out of client-side mobile bundles.

### 3. Coordinate Bounds Validation
* Strict server-side coordinate sanitation enforces Latitude `[-90, 90]` and Longitude `[-180, 180]` before any record is committed to the database, preventing injection attacks and malformed spatial points.

### 4. Automated Data Lifecycle via TTL Indexes
* Monsoon hazards are temporary by nature. RainRoute utilizes a MongoDB TTL index on the `createdAt` field (`expires: 21600` seconds / 6 hours). Once the time threshold is passed, the database background thread cleans up expired documents automatically without requiring cron jobs.

---

## 📡 API Reference

Base URL: `http://<SERVER_IP>:3000/api/reports`

| Method | Endpoint | Description | Request Body / Query | Status Code |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/reports` | Submit a new waterlog hazard report | `{ "latitude": Number, "longitude": Number, "imageUrl": String }` | `201 Created` |
| `GET` | `/api/reports` | Retrieve all active, non-expired reports | None | `200 OK` |
| `GET` | `/api/reports/stats` | System health check and active hazard count | None | `200 OK` |

#### Sample Report Payload (`POST /api/reports`)
```json
{
  "latitude": 22.7196,
  "longitude": 75.8577,
  "imageUrl": "https://res.cloudinary.com/dn8mfr6sw/image/upload/v1729000000/rainroute/sample.jpg"
}
```

---

## 📁 Project Structure

```text
RainRoute/
├── README.md                      # Comprehensive project documentation
├── .gitignore                     # Root-level ignore rules (node_modules, .env, build artifacts)
│
├── rainroute-backend/             # Express.js REST API
│   ├── .env.example               # Safe environment variable template
│   ├── .gitignore                 # Backend-specific ignore rules
│   ├── server.js                  # Express entry point & middleware registration
│   ├── package.json               # Backend dependencies and scripts
│   └── src/
│       ├── config/
│       │   └── db.js              # MongoDB Atlas Mongoose connection handler
│       ├── controllers/
│       │   └── reportController.js# Request parsing, coordinate validation & status codes
│       ├── middleware/
│       │   ├── errorHandler.js    # Centralized JSON error response handler
│       │   └── logger.js          # Request method and path logging
│       ├── models/
│       │   └── Report.js          # Mongoose schema with 6-hour TTL expiration
│       ├── routes/
│       │   └── reportRoutes.js    # Express route declarations
│       └── services/
│           └── reportService.js   # Database querying abstraction
│
└── rainroute/                     # React Native / Expo Mobile App
    ├── app.json                   # Expo configuration & app permissions
    ├── App.js                     # Main application logic, state, and routing coordinator
    ├── package.json               # Mobile frontend dependencies
    ├── assets/                    # App icons, splash screens, and visuals
    └── src/
        ├── components/
        │   ├── MapScreen.js       # Leaflet map container embedded in WebView
        │   └── ActionButtons.js   # Floating action bar (Camera, Location, Route, Hazard)
        ├── config/
        │   └── cloudinary.js      # Cloudinary cloud name & unsigned upload preset
        └── services/
            ├── apiService.js      # Backend API communication, OSRM routing & geocoding
            ├── locationService.js # High-accuracy & fast GPS acquisition via Expo Location
            └── uploadService.js   # Camera picker, image compression & CDN upload
```

---

## 🚀 Step-by-Step Installation & Setup

### Prerequisites
* **Node.js**: v18.x or v20.x installed ([Download Node.js](https://nodejs.org/))
* **Git**: Installed on your system
* **Expo Go**: Installed on your physical iOS or Android device ([Expo Go](https://expo.dev/client))
* **MongoDB Atlas Database**: Free cluster connection string ([MongoDB Atlas](https://www.mongodb.com/atlas))

---

### 1. Backend Setup (`rainroute-backend`)

1. **Navigate to the backend directory**:
   ```bash
   cd rainroute-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file from the provided template:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and enter your MongoDB connection string and port:
   ```env
   PORT=3000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/rainroute?retryWrites=true&w=majority
   ```

4. **Start the backend server**:
   ```bash
   npm start
   ```
   *Expected Output:*
   ```text
   🚀 RainRoute Backend listening on port 3000
   ✅ MongoDB Connected: cluster0-shard-00-00.mongodb.net
   ```

---

### 2. Mobile App Setup (`rainroute`)

1. **Open a new terminal and navigate to the frontend**:
   ```bash
   cd rainroute
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Backend IP**:
   * Open [rainroute/src/services/apiService.js](file:///d:/CODES/RainRoute/rainroute/src/services/apiService.js).
   * Update `DEFAULT_SERVER_URL` with your development machine's local Wi-Fi IP:
     ```javascript
     export const DEFAULT_SERVER_URL = 'http://<YOUR_LOCAL_IP>:3000/api/reports';
     ```
   *(Note: You can also update the server URL dynamically inside the running app using the Server Settings modal).*

4. **Start the Expo development server**:
   ```bash
   npx expo start
   ```

5. **Run on Device**:
   * Scan the displayed QR code with your phone camera (iOS) or the **Expo Go** app (Android).
   * Ensure your mobile device and computer are connected to the same Wi-Fi network.

---

## 🔮 Roadmap & Enhancements

- [ ] **AI Water Depth Estimation**: Integrate a computer vision model to infer flood depth (e.g. ankle, knee, vehicle hood) directly from user-submitted photos.
- [ ] **Official Weather Radar Overlay**: Integrate OpenWeatherMap precipitative radar layers directly onto the Leaflet map.
- [ ] **Push Notification Geofencing**: Alert users when entering an active high-density flood sector.
- [ ] **Offline Hazard Caching**: Cache recent hazard points locally using AsyncStorage / SQLite for offline navigation when mobile data drops during storms.

---

## 👤 Author & Acknowledgements

* **Developer**: Rishi Patel ([@rishipatel83](https://github.com/rishipatel83))
* **Contact**: [rishi.777.patel@gmail.com](mailto:rishi.777.patel@gmail.com)
* **Open Source Attribution**:
  * [OpenStreetMap](https://www.openstreetmap.org/) & [Leaflet](https://leafletjs.com/) for mapping infrastructure
  * [OSRM Project](https://project-osrm.org/) for routing computations
  * [Expo](https://expo.dev/) for React Native developer tooling
