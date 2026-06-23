# Restro POS — Restaurant Management Suite

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://pcrest-app.vercel.app/)
![React](https://img.shields.io/badge/React-20232A?logo=react)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase)
![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react)

Production-grade point-of-sale system for restaurants. Cross-platform architecture with real-time sync between desktop (Python/CustomTkinter) and mobile (React Native) clients via Firebase.

## Live Demo

**Web app:** [pcrest-app.vercel.app](https://pcrest-app.vercel.app/)
**Mobile app:** [mobile-rest-app.vercel.app](https://resto-mobile.vercel.app/)

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
<img width="1914" height="1013" alt="image" src="https://github.com/user-attachments/assets/48f9f10a-3a2d-4b63-a4e0-43bd76bcae0a" />

> - Order management interface
<img width="1909" height="898" alt="image" src="https://github.com/user-attachments/assets/9db7bd02-54a9-45b2-b76b-e0c6325971eb" />

> - Mobile app screens
<img width="443" height="1074" alt="image" src="https://github.com/user-attachments/assets/a57b4663-c238-46a2-bf69-1360f3bf3a37" />
<img width="443" height="1082" alt="image" src="https://github.com/user-attachments/assets/22f22f75-0f20-4fa9-a0dc-3b87bc0a3edb" />

> - Dark mode toggle
<img width="1909" height="1000" alt="image" src="https://github.com/user-attachments/assets/32c8a8a1-63d1-4f54-b185-a82ed7013f8b" />

---

*Built as part of my portfolio at [pcrest-app.vercel.app](https://pcrest-app.vercel.app/)*
