const nodemailer = require('nodemailer');
const supabase = require('../supabaseClient');
require('dotenv').config();

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
      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            type,
            title,
            message,
            user_id: userId,
            is_read: false,
            created_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (error) {
        console.error('Supabase notification creation error:', error);
        // Fallback: just log the notification for now
        console.log('Creating notification (fallback):', { type, title, message, userId });
        return { type, title, message, user_id: userId, created_at: new Date().toISOString() };
      }
      
      return data[0];
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
      // Create in-app notification
      await this.createNotification(
        'low_stock',
        'Low Stock Alert',
        `Material "${material.name}" is below reorder level. Current stock: ${material.current_stock} ${material.unit_of_measure || ''}, Reorder level: ${material.reorder_level} ${material.unit_of_measure || ''}.`
      );
      
      // Get admin users
      const { data: adminUsers, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('role', 'admin');
      
      if (userError) {
        console.error('Error fetching admin users:', userError);
        // Fallback to env variable
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        
        // Send email notification
        await this.sendEmail(
          adminEmail,
          `Low Stock Alert: ${material.name}`,
          `
            <h2>Low Stock Alert</h2>
            <p>Material <strong>${material.name}</strong> is below reorder level.</p>
            <p>Current stock: ${material.current_stock} ${material.unit_of_measure || ''}</p>
            <p>Reorder level: ${material.reorder_level} ${material.unit_of_measure || ''}</p>
            <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/materials/${material.id}">View material details</a></p>
          `
        );
      } else {
        // Send to all admin users
        for (const admin of adminUsers) {
          if (admin.email) {
            await this.sendEmail(
              admin.email,
              `Low Stock Alert: ${material.name}`,
              `
                <h2>Low Stock Alert</h2>
                <p>Material <strong>${material.name}</strong> is below reorder level.</p>
                <p>Current stock: ${material.current_stock} ${material.unit_of_measure || ''}</p>
                <p>Reorder level: ${material.reorder_level} ${material.unit_of_measure || ''}</p>
                <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/materials/${material.id}">View material details</a></p>
              `
            );
          }
        }
      }
    } catch (error) {
      console.error('Error creating low stock alert:', error);
      throw error;
    }
  },
  
  // Get notifications for a user
  async getUserNotifications(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching notifications from Supabase:', error);
        return []; // Return empty array as fallback
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },
  
  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()
        .single();
      
      if (error) {
        console.error('Error marking notification as read in Supabase:', error);
        // Fallback
        return { id: notificationId, is_read: true };
      }
      
      return data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
};

module.exports = NotificationService; 