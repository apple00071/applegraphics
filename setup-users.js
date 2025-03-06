const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

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
      // Create admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      await pool.query(`
        INSERT INTO users (username, password, role, email, full_name)
        VALUES ('admin', $1, 'admin', 'admin@printpress.com', 'System Administrator')
      `, [adminPassword]);
      console.log('Default admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }

    // Check if regular user already exists
    const userCheck = await pool.query(`SELECT * FROM users WHERE username = 'user'`);
    
    if (userCheck.rows.length === 0) {
      // Create regular user
      const userPassword = await bcrypt.hash('user123', 10);
      await pool.query(`
        INSERT INTO users (username, password, role, email, full_name)
        VALUES ('user', $1, 'user', 'user@printpress.com', 'Regular User')
      `, [userPassword]);
      console.log('Default regular user created successfully');
    } else {
      console.log('Regular user already exists');
    }

    console.log('\nDefault login credentials:');
    console.log('-------------------------');
    console.log('Admin User:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\nRegular User:');
    console.log('Username: user');
    console.log('Password: user123');
    console.log('-------------------------');
    console.log('IMPORTANT: Change these passwords in a production environment!');
    
  } catch (error) {
    console.error('Error setting up users:', error);
  } finally {
    await pool.end();
  }
}

setupUsers(); 