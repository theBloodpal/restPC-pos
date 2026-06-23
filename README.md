# Restro POS — Restaurant Management Suite

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://pcrest-app.vercel.app/)
![React](https://img.shields.io/badge/React-20232A?logo=react)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase)
![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react)

Production-grade point-of-sale system for restaurants. Cross-platform architecture with real-time sync between desktop (Python/CustomTkinter) and mobile (React Native) clients via Firebase.

## Live Demo

**Web app:** [pcrest-app.vercel.app](https://pcrest-app.vercel.app/)

## Features

- Order processing and billing with real-time sync
- Inventory tracking across multiple platforms
- Admin dashboard with analytics and performance metrics
- Desktop command center (Python/CustomTkinter)
- Mobile remote oversight (React Native)
- Dark mode support
- Cross-platform data integrity via Firebase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (Web) | React, Vite, Tailwind CSS |
| Mobile | React Native |
| Desktop | Python, CustomTkinter |
| Database & Sync | Firebase (Realtime DB, Auth) |
| Deployment | Vercel |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Desktop (Py)   │     │  Mobile (RN)    │     │  Web (React)    │
│  CustomTkinter  │◄───►│  React Native   │◄───►│  Vite + Tailwind│
│  Order Mgmt     │     │  Remote Access  │     │  Admin Dashboard│
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                ▼
                     ┌──────────────────┐
                     │    Firebase      │
                     │  Realtime DB     │
                     │  Authentication  │
                     └──────────────────┘
```

## Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Firebase project with Realtime Database enabled

### Web App
```bash
cd web
npm install
cp .env.example .env  # Add your Firebase config
npm run dev
```

### Desktop App
```bash
cd desktop
pip install -r requirements.txt
python main.py
```

### Mobile App
```bash
cd mobile
npm install
npx react-native run-android
```

## Screenshots

> Add screenshots here:
> - Dashboard view
> - Order management interface
> - Mobile app screens
> - Dark mode toggle

---

*Built as part of my portfolio at [pcrest-app.vercel.app](https://pcrest-app.vercel.app/)*
