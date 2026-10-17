# 🌧️ RainRoute — Smart Monsoon Navigation & Hazard Detection

<div align="center">

[![React Native](https://img.shields.io/badge/React_Native-v0.76-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_52-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_v4-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_TTL_Cache-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_CDN-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)

**A full-stack, crowd-powered mobile navigation engine designed to combat urban waterlogging and monsoon commuting hazards.**

[Explore Features](#-key-features) • [System Architecture](#-system-architecture) • [Tech Stack](#-technical-stack) • [Quick Start](#-quick-start--installation) • [API Docs](#-rest-api-reference)

</div>

---

### ⚡ Quick Glance / Executive Summary

| Category | Key Highlight |
| :--- | :--- |
| **Problem** | Commuters encounter **unmapped flash floods, waterlogged roads, and vehicle-damaging hazards** during heavy rains that standard GPS apps fail to identify. |
| **Solution** | **Real-time crowd-sourced hazard reporting**, photographic evidence verification, **proactive route risk assessment**, and **automatic flood-avoidance detours**. |
| **Engineering Highlights** | **75m geo-fence proximity collision detection**, client-side image compression, **zero-cost Leaflet vector mapping via WebView**, and **self-purging 6-hour TTL database indexing**. |
| **Core Stack** | **Frontend:** React Native (Expo) • **Backend:** Node.js (Express) • **Database:** MongoDB Atlas • **Media:** Cloudinary CDN |

---

## 🏗️ System Architecture

<p align="center">
  <img src="docs/architecture.png" alt="RainRoute System Architecture" width="100%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);" />
</p>

### 🔄 End-to-End Data Flow

1. **Capture & Optimize**: User takes a photo of waterlogging; **`expo-image-manipulator` downscales and compresses** the image on-device to conserve user bandwidth.
2. **Direct CDN Distribution**: The compressed asset is uploaded **directly to Cloudinary** via an unsigned preset, returning an optimized secure URL.
3. **Geo-Tagged Persistence**: The mobile client sends coordinate pairs (`latitude`, `longitude`) along with the image URL to the **Node.js/Express REST API**.
4. **Self-Expiring Storage**: The report is saved to **MongoDB Atlas**, where a native **TTL (Time-To-Live) index automatically deletes the document after 6 hours**.
5. **Real-Time Polling & Detour Calculation**: Active reports are distributed to all connected clients. When calculating navigation, the **OSRM routing engine checks if routes intersect any active hazard zones** and recalculates safe detours dynamically.

---

## ✨ Key Features

### 🗺️ Dynamic Interactive Map
* **Lightweight Leaflet & OpenStreetMap**: Embedded inside a native `WebView`, delivering **fluid 60fps pan/zoom interactions** without expensive proprietary map SDK licenses.
* **Animated Radar Pulse Tracking**: Live GPS visualizer with **CSS concentric pulse rings** indicating current user coordinate lock.
* **Interactive Hazard Markers**: Custom map pins showing **real-time hazard cards with photo evidence**, exact timestamps, and coordinates upon tapping.

### 🚗 Proactive Hazard Detection & Detour Engine
* **Turn-by-Turn Route Engine**: Powered by **OSRM (Open Source Routing Machine)**, providing precise distance (km) and estimated travel duration (minutes).
* **75-Meter Hazard Collision Geometry**: Proactively evaluates if the suggested polyline **passes within 75 meters of an active flood zone**.
* **Intelligent Detours**: Flags compromised paths in warning amber/red and **computes alternate bypass routes** to keep drivers safe.

### 📸 Rapid Crowdsourced Reporting (< 5 Seconds)
* **One-Tap Reporting**: Immediate hardware camera/gallery access via **`expo-image-picker`**.
* **Client-Side Optimization**: Shrinks raw phone captures into lightweight web-ready payloads before network dispatch.
* **Zero Backend Media Bottleneck**: Bypasses server memory by offloading large image transfers straight to Cloudinary CDN.

### ⏱️ Automated 6-Hour Hazard Decay (TTL Pipeline)
* Monsoon hazards recede naturally. RainRoute leverages **native MongoDB TTL indexes (`expires: 21600`)**, ensuring old hazard markers **automatically expire without manual admin moderation or cron scripts**.

### 🔍 Debounced Global Geocoding
* Real-time destination lookup backed by **OpenStreetMap Nominatim**, complete with **query debouncing** to prevent rate-limiting during typing.

---

## 🛠️ Technical Stack

### **Frontend (Mobile App)**
* **Framework:** React Native (0.76) via Expo (SDK 52)
* **Map Container:** React Native WebView + Leaflet 1.9.4 & OpenStreetMap
* **Routing Engine:** Open Source Routing Machine (OSRM) REST API
* **Geocoding:** OSM Nominatim Search API
* **Media & Hardware:** Expo Camera, Image Picker, Image Manipulator, Expo Location
* **UI & Styling:** Custom dark/light responsive layout with Lucide & Ionicons

### **Backend (API Service)**
* **Runtime:** Node.js (LTS) & Express.js (v4)
* **Database:** MongoDB Atlas with Mongoose (v8) ORM
* **Data Lifecycle:** MongoDB Native TTL Indexes
* **Media Storage:** Cloudinary Cloud Media CDN
* **Security & Utility:** CORS configuration, custom error-handling middleware, and coordinate sanitization

---

## 📐 Engineering Design Highlights

### ⚡ Client-Side Media Offloading
Piping large multi-megabyte image payloads through an Express server consumes critical CPU threads and memory. RainRoute leverages **client-side compression paired with direct CDN uploads**. The backend API only handles lightweight JSON coordinate payloads (~200 bytes), **maximizing API throughput and scalability**.

### 🔄 Zero-Maintenance Data Hygiene (MongoDB TTL)
Temporary hazards should not linger forever. Rather than running scheduled cron jobs or server background timers, RainRoute offloads expiration to **MongoDB’s internal TTL engine**. Documents are indexed on `createdAt` with an expiration window of 21,600 seconds (6 hours), guaranteeing **zero database bloat with zero infrastructure maintenance**.

### 🛡️ Strict Coordinate Boundary Sanitization
To prevent injection attacks and corrupt geospatial geometry, all incoming coordinate inputs are strictly validated on the backend:
$$\text{Latitude} \in [-90, 90] \quad\text{and}\quad \text{Longitude} \in [-180, 180]$$
Non-numeric or out-of-bounds inputs are rejected before reaching database operations.

---

## 📡 REST API Reference

Base Endpoint: `http://<SERVER_HOST>:3000/api/reports`

### 1. Submit Waterlog Report
* **Endpoint:** `POST /api/reports`
* **Status:** `201 Created`
* **Request Payload:**
```json
{
  "latitude": 22.7196,
  "longitude": 75.8577,
  "imageUrl": "https://res.cloudinary.com/dn8mfr6sw/image/upload/v1729000000/rainroute/hazard.jpg"
}
```

### 2. Fetch Active Hazards
* **Endpoint:** `GET /api/reports`
* **Status:** `200 OK`
* **Description:** Retrieves all active, non-expired reports for dynamic map plotting.

### 3. Service Health & Hazard Statistics
* **Endpoint:** `GET /api/reports/stats`
* **Status:** `200 OK`
* **Response:**
```json
{
  "success": true,
  "activeReportsCount": 14,
  "serverTime": "2026-10-17T12:00:00.000Z"
}
```

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
│       ├── controllers/           # Request parsing & input validation
│       ├── middleware/            # Error handling & HTTP logging
│       ├── models/Report.js       # Data schema with 6-hour TTL index
│       ├── routes/reportRoutes.js # REST endpoint definitions
│       └── services/              # Database query abstractions
│
└── rainroute/                     # React Native / Expo Mobile App
    ├── app.json                   # App manifest & permissions
    ├── App.js                     # Root controller, state & routing orchestrator
    ├── package.json               # Mobile frontend dependencies
    ├── assets/                    # Icons and splash branding
    └── src/
        ├── components/
        │   ├── MapScreen.js       # Leaflet vector map inside native WebView
        │   └── ActionButtons.js   # Floating action bar controls
        ├── config/cloudinary.js   # Cloudinary configuration
        └── services/
            ├── apiService.js      # Backend client, OSRM routing & geocoding
            ├── locationService.js # High-precision GPS tracking
            └── uploadService.js   # Media capture, compression & CDN pipeline
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
# 1. Navigate to the backend directory
cd rainroute-backend

# 2. Install dependencies
npm install

# 3. Create your environment config
cp .env.example .env

# 4. Add your MongoDB connection string in .env:
# PORT=3000
# MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/rainroute?retryWrites=true&w=majority

# 5. Start the server
npm start
```

---

### 2. Frontend Setup (`rainroute`)

```bash
# 1. In a new terminal, navigate to the mobile app directory
cd rainroute

# 2. Install dependencies
npm install

# 3. Configure backend IP address
# Open src/services/apiService.js and set your machine's Wi-Fi IP:
# export const DEFAULT_SERVER_URL = 'http://<YOUR_LOCAL_IP>:3000/api/reports';

# 4. Start the Expo bundler
npx expo start
```

> **Tip:** Scan the generated terminal QR code with your phone camera (iOS) or **Expo Go** app (Android) to launch the app on your device instantly.

---

## 🔮 Future Enhancements

- [ ] **AI Water Depth Classification**: Implement a computer vision pipeline (TensorFlow.js) to classify flood severity (e.g., *Passable*, *Caution*, *Critical*) from photos.
- [ ] **Precipitation Radar Layer**: Overlay live satellite rain Doppler radar imagery directly onto Leaflet.
- [ ] **Proximity Geofence Push Notifications**: Notify drivers when approaching a known hazard hotspot within 500 meters.

---

## 👨‍💻 Author & Contributions

* **Author:** Rishi Patel ([@rishipatel83](https://github.com/rishipatel83))
* **Contact:** [rishi.777.patel@gmail.com](mailto:rishi.777.patel@gmail.com)
* **Contributions:** Open-source contributions, feature requests, and bug reports are welcome via Pull Requests.
