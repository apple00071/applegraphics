const pool = require('../db');
const nodemailer = require('nodemailer');

// Configure email transport (in production, use proper SMTP settings)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'user@example.com',
    pass: process.env.EMAIL_PASSWORD || 'password'
  }
});

const NotificationService = {
  // Create an in-app notification
  async createNotification(type, title, message, userId = null) {
    try {
      const result = await pool.query(
        'INSERT INTO notifications (type, title, message, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [type, title, message, userId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },
  
  // Send an email notification
  async sendEmail(to, subject, htmlContent) {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Inventory System" <inventory@example.com>',
        to,
        subject,
        html: htmlContent
      });
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },
  
  // Create a low stock alert (both in-app and email)
  async createLowStockAlert(material) {
    try {
      // Get admins and inventory managers
      const usersResult = await pool.query(
        'SELECT id, email FROM users WHERE role IN (\'admin\', \'manager\')'
      );
      
      // Create notifications for each relevant user
      for (const user of usersResult.rows) {
        await this.createNotification(
          'low_stock',
          'Low Stock Alert',
          `Material "${material.name}" is below reorder level. Current stock: ${material.current_stock} ${material.unit_of_measure}, Reorder level: ${material.reorder_level} ${material.unit_of_measure}.`,
          user.id
        );
        
        // Send email
        await this.sendEmail(
          user.email,
          `Low Stock Alert: ${material.name}`,
          `
            <h2>Low Stock Alert</h2>
            <p>Material <strong>${material.name}</strong> is below reorder level.</p>
            <p>Current stock: ${material.current_stock} ${material.unit_of_measure}</p>
            <p>Reorder level: ${material.reorder_level} ${material.unit_of_measure}</p>
            <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/materials/${material.id}">View material details</a></p>
          `
        );
      }
    } catch (error) {
      console.error('Error creating low stock alert:', error);
      throw error;
    }
  },
  
  // Get notifications for a user
  async getUserNotifications(userId) {
    try {
      const result = await pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },
  
  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const result = await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *',
        [notificationId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
};

module.exports = NotificationService; 