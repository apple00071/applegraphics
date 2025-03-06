# PrintPress Inventory Management System

A comprehensive inventory management system for printing press businesses, built with React, Node.js, and Supabase.

## Features

- User authentication and role-based access control
- Materials inventory management
- Equipment tracking
- Order management
- Production job scheduling
- Reporting and analytics
- Low stock alerts
- Barcode scanning for inventory operations

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT and Supabase Auth
- **Styling**: TailwindCSS

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Supabase account (free tier works fine)

### Supabase Setup

1. Sign up for a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project
3. Take note of your Supabase URL and API Key (found in Project Settings > API)
4. Go to the SQL Editor in your Supabase dashboard
5. Copy the contents of `setup-supabase.sql` from this repository
6. Paste and run the SQL commands in the Supabase SQL Editor to create all required tables and default data

### Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```
   cp .env.example .env
   ```
2. Update the `.env` file with your Supabase credentials:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_KEY=your-supabase-anon-key
   REACT_APP_SUPABASE_URL=your-supabase-url
   REACT_APP_SUPABASE_KEY=your-supabase-anon-key
   ```

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/printing-press-inventory.git
   cd printing-press-inventory
   ```

2. Install dependencies:
   ```
   npm install --legacy-peer-deps
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Deployment

To create a production build:

```
npm run prod
```

This will build the React app and serve it from the Express server on port 5000.

## Default Login Credentials

The system comes with two default users:

- **Admin User**:
  - Username: admin
  - Password: admin123

- **Regular User**:
  - Username: user
  - Password: user123

*Note: For security, please change these passwords after initial login in a production environment.*

## License

MIT 