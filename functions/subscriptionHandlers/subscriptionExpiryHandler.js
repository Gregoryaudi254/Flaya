const admin = require("firebase-admin");
const db = admin.firestore();

exports.checkSubscriptionExpiry = async (req, res) => {
  // Check if the request is properly authenticated
  // Note: In production, you should implement proper authentication for Cloud Tasks
  
  try {
    // Extract user ID and plan type from the request body
    const {userid, planType} = req.body;
    
    if (!userid) {
      console.error("Missing userid in request");
      return res.status(400).send("Missing userid parameter");
    }
    
    console.log(`Checking subscription expiry for user: ${userid}, plan: ${planType}`);
    
    // Get the user document
    const userRef = db.collection("users").doc(userid);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      console.error(`User ${userid} not found`);
      return res.status(404).send("User not found");
    }
    
    const userData = userSnap.data();
    const subscription = userData.subscription || {};
    
    // Check if user has already renewed their subscription
    // If they have a valid active subscription, no action needed
    if (subscription.status === "active") {
      const endDate = subscription.endDate.toDate() || new Date(0);
      const now = new Date();
      
      // If the subscription end date is in the future, the user has renewed
      if (endDate > now) {
        console.log(`User ${userid} has an active subscription until ${endDate.toISOString()}, no action needed`);
        return res.status(200).send("User has active subscription");
      }
      
      // Subscription has expired but is still within grace period
      const gracePeriodDays = 5;
      const gracePeriodEnd = new Date(endDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);
      
      if (now <= gracePeriodEnd) {
        // User is in grace period
        console.log(`User ${userid} is in grace period until ${gracePeriodEnd.toISOString()}`);
        
        // Check if we've already sent a grace period notification
        if (!subscription.graceNotificationSent) {
          // Send grace period notification
          await createNotificationForUser(userid, {
            title: "Subscription Grace Period",
            body: `Your ${subscription.plan} has expired. You have ${gracePeriodDays} days to renew before your business account features are disabled.`,
            type: "subscription_grace",
            data: {
              subscriptionType: subscription.subscriptionType,
              gracePeriodEnd: gracePeriodEnd.toISOString()
            },
            timestamp: admin.firestore.Timestamp.fromDate(now)
          });
          
          // Update subscription to mark that we've sent the notification
          await userRef.update({
            "subscription.graceNotificationSent": true
          });
          
          console.log(`Sent grace period notification to user ${userid}`);
        }
        
        return res.status(200).send("User in grace period");
      } else {
        // Grace period has ended, update subscription status to inactive
        await userRef.update({
          "subscription.status": "inactive",
          "isbusinessaccount": false // Remove business account privileges
        });
        
        // Send expiry notification
        await createNotificationForUser(userid, {
          title: "Subscription Expired",
          body: "Your subscription has expired. Renew now to continue enjoying business account features.",
          type: "subscription_expired",
          data: {
            subscriptionType: subscription.subscriptionType
          },
          timestamp: admin.firestore.Timestamp.fromDate(now)
        });
        
        console.log(`User ${userid} subscription expired and grace period ended, status updated to inactive`);
        return res.status(200).send("Subscription expired and updated");
      }
    } else if (subscription.status === "inactive") {
      // Subscription is already marked as inactive, nothing to do
      console.log(`User ${userid} subscription is already inactive`);
      return res.status(200).send("Subscription already inactive");
    } else {
      // No subscription or unknown status
      console.log(`User ${userid} has no active subscription`);
      return res.status(200).send("No active subscription");
    }
  } catch (error) {
    console.error("Error checking subscription expiry:", error);
    return res.status(500).send("Internal server error");
  }
};

// Helper function to create notification for a user
async function createNotificationForUser(userId, notificationData) {
  try {
    const notificationsRef = db.collection("users").doc(userId).collection("notifications").doc();
    await notificationsRef.set({
      ...notificationData,
      read: false,
      id: notificationsRef.id
    });
    
    console.log(`Notification created for user ${userId}`);
  } catch (error) {
    console.error(`Error creating notification for user ${userId}:`, error);
  }
} 
