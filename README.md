# Printing Press Inventory System

A real-time inventory management system for printing press businesses.

## Features

- **Real-time Inventory Updates**: Changes made on one device are instantly reflected on all connected devices
- **Barcode/QR Scanning**: Quickly find and update inventory items
- **Dashboard**: See current inventory status, low-stock items, and recent orders
- **Material Management**: Track materials, stock levels, and reorder points
- **User Authentication**: Secure access control

## System Architecture

This application uses:

- **React.js**: Frontend UI framework with TypeScript
- **Express.js**: Backend server for API and Socket.io
- **Socket.io**: Provides real-time bi-directional communication
- **Supabase**: PostgreSQL database with authentication and real-time capabilities
- **JWT**: For secure authentication tokens

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher
- Supabase account (free tier works well)

### Supabase Setup

1. Sign up for a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project
3. Use the setup scripts in `setup-supabase.sql` to create the necessary tables
4. Take note of your Supabase URL and API Key

### Environment Variables

Create a `.env` file in the project root with the following variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret_key
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

### Running the Application

#### Development Mode

To run both the server and client in development mode:

```
npm run dev
```

This will start:
- The backend server on port 5000 (API + Socket.io)
- The React frontend on port 3000

#### Production Mode

To build and run in production mode:

```
npm run prod
```

### Accessing the Application

- Open your browser and go to `http://localhost:3000`
- Login with the demo credentials:
  - Username: admin
  - Password: admin123

## Mobile Access

To access the application from mobile devices on your local network:

1. Find your computer's IP address on your local network
2. Create a `.env.development` file with:
   ```
   REACT_APP_SOCKET_URL=http://YOUR_IP_ADDRESS:5000
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_KEY=your_supabase_key
   ```
3. Run the application with `npm run dev`
4. On your mobile device, navigate to `http://YOUR_IP_ADDRESS:3000`

## Fallback Mode

If Supabase is not available or not configured, the application will run in fallback mode using demo data. This is useful for development and testing.

## Data Persistence

All inventory data is stored in a file called `inventory_data.json` in the project root. This allows data to persist between server restarts while keeping the solution simple.

## License

MIT 