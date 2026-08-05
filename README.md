# DelhiveryWay Personal Shopper Portal

The mobile-first web app Personal Shoppers use to go online, pick up assigned
orders, shop at the store, and hand off for delivery — the operational heart
of DelhiveryWay's fulfillment side.

## ✨ Key Features

- **🟢 Online / Offline Availability**
  - Toggle availability to start or stop receiving new order assignments.
  - Live connection status shown on the dashboard (Socket.io).

- **📋 Order Management**
  - Accept incoming orders and walk them through the full fulfillment
    lifecycle — accepted → at shop → shopping in progress → revised
    (if items are unavailable) → out for delivery → delivered.
  - Customer and shop details surfaced per order.

- **📊 Earnings Dashboard**
  - Today / yesterday order counts and earnings at a glance.

- **🔔 Real-time & Mobile Notifications**
  - Live order and status updates via Socket.io.
  - Service-worker-backed push notifications (works even when the app
    isn't in the foreground on mobile).

- **🔐 Authentication**
  - Dedicated Personal Shopper login/signup, separate from customer
    accounts — new signups require admin verification before going live.

## 🛠️ Technology Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **State Management**: React Context API & Hooks
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Real-time**: Socket.io client for live order/status updates
- **Mobile Push**: Service worker (`public/sw.js`) for background notifications
- **Build Tool**: Create React App 5.0.1

## 📂 Project Structure

```
delhiveryway-shopper/
├── .env.development            # Committed, non-secret dev config (see backend README)
├── env.example                 # Template for a real .env (production)
├── package.json
├── vercel.json                 # Deployment config
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── delhiveryway-logo.jpg
│   ├── notification.mp3        # Sound played on new-order notifications
│   └── sw.js                   # Service worker for mobile push notifications
└── src/
    ├── App.js                  # Root component and route definitions
    ├── index.js / index.css    # App entry point and global styles
    └── modules/                 # Feature modules
        ├── auth/                 # LoginPage, SignupPage
        ├── core/                  # Shared building blocks
        │   ├── components/         # ErrorBoundary, Logo, MobileNotificationHelper
        │   ├── context/            # AuthContext, SocketContext
        │   └── services/           # api.js
        ├── dashboard/              # Dashboard — online status, earnings, order stats
        └── orders/                 # OrderManagement — accept & fulfill orders
```

For the complete local development setup — installing WSL, Docker, Node, cloning
all five DelhiveryWay repos, seeding the database, and running everything
together — see the
[`backend` repo's README](https://github.com/mnpatel007/delhiveryway-backend#readme).
That's the single source of truth for setup; once it's done, come back here and
run `npm start` in this repo (`http://localhost:3002`).
