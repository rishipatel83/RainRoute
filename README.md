# RainRoute 🌧️🗺️

RainRoute is an intelligent navigation and hazard-reporting application designed to help users navigate safely during rain and waterlogging events.

## 📂 Project Structure

```text
RainRoute/
├── rainroute/          # Frontend mobile application (React Native / Expo)
└── rainroute-backend/  # Backend API server (Node.js / Express / MongoDB)
```

---

## 🚀 Getting Started

### 1. Backend Setup (`rainroute-backend`)

1. Navigate to the backend directory:
   ```bash
   cd rainroute-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update `MONGO_URI` and `PORT` with your MongoDB credentials and desired port.
4. Start the server:
   ```bash
   npm start
   ```

### 2. Frontend Setup (`rainroute`)

1. Navigate to the frontend directory:
   ```bash
   cd rainroute
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```

---

## 🔒 Security Note
Sensitive files such as `.env` and `node_modules/` are excluded from version control via `.gitignore`.
