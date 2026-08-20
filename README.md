# 🏦 SyncVista Finance Management Dashboard

A modern multi-bank finance platform that enables users to connect multiple bank accounts, track real-time transactions, transfer funds, and manage their finances in one unified dashboard.

![Banking App](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## ✨ Features

### 🏠 Dashboard Overview
- Real-time balance aggregation from all connected bank accounts
- Recent transaction history with categorization
- Spending analytics by category
- Personalized financial insights

### 🏦 Multi-Bank Integration
- Connect multiple bank accounts via **Plaid API**
- View all connected banks with respective balances
- Real-time synchronization across all accounts
- Secure authentication and data encryption

### 💸 Fund Transfers
- Transfer funds between accounts using **Dwolla** payment integration
- Recipient bank verification
- Transaction status tracking
- Transfer history with filtering options

### 📊 Transaction Management
- Comprehensive transaction history
- Advanced filtering and search capabilities
- Pagination for better performance
- Transaction categorization and analytics

### 📈 Spending Analytics
- Visual spending breakdown by category
- Monthly/yearly spending trends
- Budget tracking and alerts
- Interactive charts and graphs

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS, Shadcn UI
- **Backend:** Next.js API Routes, Appwrite
- **Database:** Appwrite Database
- **Authentication:** Appwrite Auth
- **Bank Integration:** Plaid API
- **Payment Processing:** Dwolla API
- **Charts:** Chart.js / Recharts
- **Form Handling:** React Hook Form, Zod



## 📁 Project Structure

```
syncvista/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (root)/            # Main application pages
│   └── api/               # API routes
├── components/            # Reusable React components
│   ├── ui/               # UI components (Shadcn)
│   └── ...               # Feature components
├── lib/                   # Utility functions and actions
│   ├── actions/          # Server actions
│   └── utils.ts          # Helper functions
├── public/               # Static assets
└── types/                # TypeScript type definitions
```

## 🔒 Security

- All sensitive data is encrypted
- Secure authentication with Appwrite
- HTTPS-only API communications
- Environment variables for credentials
- Regular security audits

