import pg from 'pg';
const { Pool } = pg;
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupUsers() {
  try {
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Users table does not exist. Please run the database schema creation script first.');
      return;
    }

    // Check if admin user already exists
    const adminCheck = await pool.query(`SELECT * FROM users WHERE username = 'admin'`);

    if (adminCheck.rows.length === 0) {
      console.log('No admin user found.');
      console.log('Please run "node create-admin-user.js" to create a secure admin account.');
    } else {
      console.log('Admin user exists.');
    }

    console.log('\nSecurity Note:');
    console.log('-------------------------');
    console.log('Hardcoded users have been removed from this script for security.');
    console.log('Use the create-admin-user.js script to manage access.');
    console.log('-------------------------');

  } catch (error) {
    console.error('Error setting up users:', error);
  } finally {
    await pool.end();
  }
}

setupUsers();