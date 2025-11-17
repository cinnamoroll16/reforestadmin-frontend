// routes/notifications.js - FIXED FOR PLANTER NOTIFICATIONS
const express = require('express');
const admin = require('firebase-admin');
const { db } = require('../config/firebaseAdmin');
const router = express.Router();

// Get all notifications
router.get('/', async (req, res) => {
  try {
    const { limit = 100, targetRole, targetUser } = req.query;
    
    console.log('🔔 Fetching notifications with filters:', { targetRole, targetUser });
    
    let query = db.collection('notifications');
    
    // Apply filters if provided
    if (targetRole) {
      query = query.where('targetRole', '==', targetRole);
    }
    
    if (targetUser) {
      // Ensure targetUser is in correct format
      const formattedUser = targetUser.startsWith('/users/') 
        ? targetUser 
        : `/users/${targetUser}`;
      query = query.where('targetUser', '==', formattedUser);
    }
    
    // Try to order by timestamp
    try {
      query = query.orderBy('notif_timestamp', 'desc').limit(parseInt(limit));
    } catch (error) {
      console.log('⚠️ notif_timestamp ordering failed, trying createdAt...');
      try {
        query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));
      } catch (error2) {
        console.log('⚠️ All orderings failed, getting without order...');
        query = query.limit(parseInt(limit));
      }
    }
    
    const snapshot = await query.get();

    const notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Convert Firestore timestamps to ISO strings
      const processTimestamp = (timestamp) => {
        if (!timestamp) return new Date().toISOString();
        if (typeof timestamp === 'string') return timestamp;
        if (timestamp.toDate) return timestamp.toDate().toISOString();
        if (timestamp._seconds) return new Date(timestamp._seconds * 1000).toISOString();
        return new Date(timestamp).toISOString();
      };

      notifications.push({
        id: doc.id,
        notification_type: data.notification_type,
        notif_message: data.notif_message,
        data: data.data || {},
        targetUser: data.targetUser,
        targetRole: data.targetRole,
        read: data.read || false,
        priority: data.priority,
        notif_timestamp: processTimestamp(data.notif_timestamp),
        createdAt: processTimestamp(data.createdAt)
      });
    });

    console.log(`✅ Returning ${notifications.length} notifications`);
    
    res.json({
      success: true,
      notifications: notifications,
      total: notifications.length
    });
    
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Get notification by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔔 Fetching notification: ${id}`);
    
    const doc = await db.collection('notifications').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Notification not found',
        id: id
      });
    }

    const data = doc.data();
    
    const processTimestamp = (timestamp) => {
      if (!timestamp) return new Date().toISOString();
      if (typeof timestamp === 'string') return timestamp;
      if (timestamp.toDate) return timestamp.toDate().toISOString();
      if (timestamp._seconds) return new Date(timestamp._seconds * 1000).toISOString();
      return new Date(timestamp).toISOString();
    };

    const notification = {
      id: doc.id,
      notification_type: data.notification_type,
      notif_message: data.notif_message,
      data: data.data || {},
      targetUser: data.targetUser,
      targetRole: data.targetRole,
      read: data.read,
      priority: data.priority,
      notif_timestamp: processTimestamp(data.notif_timestamp),
      createdAt: processTimestamp(data.createdAt)
    };

    console.log(`✅ Found notification: ${notification.notif_message}`);
    
    res.json({
      success: true,
      notification: notification
    });
  } catch (error) {
    console.error('❌ Get notification by ID error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Create notification - MATCH FIRESTORE STRUCTURE EXACTLY
router.post('/', async (req, res) => {
  try {
    const {
      notification_type,
      notif_message,
      data: notificationData,
      targetUser,
      targetRole,
      priority = 'medium',
      read = false,
      notif_timestamp,
      createdAt
    } = req.body;

    // Validate required fields
    if (!notification_type || !notif_message || !targetUser || !targetRole) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'notification_type, notif_message, targetUser, and targetRole are required',
        received: {
          notification_type: !!notification_type,
          notif_message: !!notif_message,
          targetUser: !!targetUser,
          targetRole: !!targetRole
        }
      });
    }

    // Ensure targetUser is in correct format: /users/{userId}
    let formattedTargetUser = targetUser;
    if (!formattedTargetUser.startsWith('/users/')) {
      if (formattedTargetUser.includes('/')) {
        const userId = formattedTargetUser.split('/').pop();
        formattedTargetUser = `/users/${userId}`;
      } else if (formattedTargetUser.startsWith('users/')) {
        formattedTargetUser = `/${formattedTargetUser}`;
      } else {
        formattedTargetUser = `/users/${formattedTargetUser}`;
      }
    }

    // Convert timestamp from frontend format to Firestore Timestamp
    const convertToFirestoreTimestamp = (timestamp) => {
      if (!timestamp) {
        return admin.firestore.Timestamp.now();
      }
      
      // If already has _seconds and _nanoseconds, convert to Firestore Timestamp
      if (timestamp._seconds !== undefined) {
        return new admin.firestore.Timestamp(timestamp._seconds, timestamp._nanoseconds || 0);
      }
      
      // If it's a Date object or ISO string
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return admin.firestore.Timestamp.fromDate(date);
    };
    
    const notificationDoc = {
      notification_type,
      notif_message,
      data: notificationData || {},
      targetUser: formattedTargetUser,
      targetRole,
      priority,
      read,
      notif_timestamp: convertToFirestoreTimestamp(notif_timestamp),
      createdAt: convertToFirestoreTimestamp(createdAt)
    };

    console.log('📝 Creating notification:', {
      notification_type: notificationDoc.notification_type,
      targetRole: notificationDoc.targetRole,
      targetUser: notificationDoc.targetUser,
      message: notificationDoc.notif_message
    });

    const docRef = await db.collection('notifications').add(notificationDoc);
    
    console.log(`✅ Notification created with ID: ${docRef.id}`);
    
    // Return the created notification with proper timestamp format
    const responseNotification = {
      id: docRef.id,
      ...notificationDoc,
      notif_timestamp: notificationDoc.notif_timestamp.toDate().toISOString(),
      createdAt: notificationDoc.createdAt.toDate().toISOString()
    };
    
    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification: responseNotification
    });
  } catch (error) {
    console.error('❌ Create notification error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Update notification (mark as read, etc.)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    console.log(`📝 Updating notification ${id}:`, Object.keys(updateData));

    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Notification not found',
        id: id
      });
    }

    await docRef.update(updateData);
    
    // Get the updated document
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    
    const processTimestamp = (timestamp) => {
      if (!timestamp) return new Date().toISOString();
      if (typeof timestamp === 'string') return timestamp;
      if (timestamp.toDate) return timestamp.toDate().toISOString();
      if (timestamp._seconds) return new Date(timestamp._seconds * 1000).toISOString();
      return new Date(timestamp).toISOString();
    };

    const responseNotification = {
      id,
      notification_type: updatedData.notification_type,
      notif_message: updatedData.notif_message,
      data: updatedData.data || {},
      targetUser: updatedData.targetUser,
      targetRole: updatedData.targetRole,
      read: updatedData.read,
      priority: updatedData.priority,
      notif_timestamp: processTimestamp(updatedData.notif_timestamp),
      createdAt: processTimestamp(updatedData.createdAt),
      updatedAt: processTimestamp(updatedData.updatedAt)
    };

    console.log(`✅ Notification ${id} updated successfully`);
    
    res.json({
      success: true,
      message: 'Notification updated successfully',
      notification: responseNotification
    });
  } catch (error) {
    console.error('❌ Update notification error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting notification ${id}`);

    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Notification not found',
        id: id
      });
    }

    await docRef.delete();
    
    console.log(`✅ Notification ${id} deleted successfully`);
    
    res.json({ 
      success: true,
      message: 'Notification deleted successfully',
      id,
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Delete notification error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Mark all as read for a specific user
router.patch('/actions/mark-all-read', async (req, res) => {
  try {
    const { targetUser, targetRole } = req.body;
    
    if (!targetUser) {
      return res.status(400).json({
        success: false,
        error: 'targetUser is required'
      });
    }

    // Format targetUser correctly
    const formattedUser = targetUser.startsWith('/users/') 
      ? targetUser 
      : `/users/${targetUser}`;
    
    console.log('📝 Marking all notifications as read for:', formattedUser);
    
    let query = db.collection('notifications')
      .where('targetUser', '==', formattedUser)
      .where('read', '==', false);
    
    if (targetRole) {
      query = query.where('targetRole', '==', targetRole);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.json({
        success: true,
        message: 'No unread notifications found',
        updatedCount: 0
      });
    }
    
    const batch = db.batch();
    const updateTime = new Date();
    
    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        updatedAt: updateTime
      });
    });
    
    await batch.commit();
    
    console.log(`✅ Marked ${snapshot.size} notifications as read`);
    
    res.json({
      success: true,
      message: `Successfully marked ${snapshot.size} notifications as read`,
      updatedCount: snapshot.size,
      updatedAt: updateTime.toISOString()
    });
  } catch (error) {
    console.error('❌ Mark all as read error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
