# 🚀 Tirta Warehouse - Backend API

The core engine of the Tirta Warehouse Management System. This repository contains the RESTful API, Database Logic, and Real-time WebSocket services.

## 🛠️ Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Real-time**: Socket.io
- **Security**: JWT (JSON Web Token), bcrypt

## 📦 Key Modules
- **Auth**: User registration, login, and session management.
- **Inventory**: CRUD operations for stock items with QR Code generation.
- **Approval System**: Logic for multi-tier requisition workflows.
- **Reporting**: Excel & PDF export services.

## 🚦 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Setup**:
   - Create a MySQL database named `inventory_gudang_pdam`.
   - Import the provided SQL schema.

3. **Environment Variables**:
   Create a `.env` file with:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=inventory_gudang_pdam
   JWT_SECRET=your_secret_key
   PORT=5000
   ```

4. **Run Server**:
   ```bash
   npm start # Production
   # or
   npm run dev # Development with Nodemon
   ```
