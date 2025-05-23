const admin = require("firebase-admin");
// const {CloudTasksClient} = require("@google-cloud/tasks");
const db = admin.firestore();

// Function to handle the M-Pesa callback
exports.handleMpesaCallback = async (snap, context) => {
  const userid = context.params.userid;
  const planType = context.params.plan;
  const uniqueKey = context.params.uniqueKey;

  console.log(`Processing M-Pesa callback for user: ${userid}, plan: ${planType}, uniqueKey: ${uniqueKey}`);
  
  const callbackData = snap.val();
  const resultCode = callbackData.ResultCode;
  const resultDesc = callbackData.ResultDesc;
  
  // Log the callback data for debugging
  console.log(`M-Pesa callback data: ${JSON.stringify(callbackData)}`);
  
  try {
    // Check if the payment was successful (ResultCode === 0 indicates success)
    if (resultCode === 0) {
      const userRef = db.collection("users").doc(userid);
      const userSnap = await userRef.get();
      
      if (!userSnap.exists) {
        console.error(`User ${userid} not found`);
        return;
      }
      
      const userData = userSnap.data();
      let subscription = userData.subscription || {};
      const currentDate = new Date();
      let newEndDate = new Date();
      
      // Determine if this is an upgrade from monthly to yearly
      const isUpgrade = planType === "yearly" && 
                      subscription.subscriptionType === "monthly" && 
                      subscription.status === "active";
                      
      console.log(`Subscription update - isUpgrade: ${isUpgrade}, current type: ${subscription.subscriptionType}, new type: ${planType}`);
      const now = new Date();
      // const diffInMs = subscription.endDate - now;
      // const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); // Round up partial days
    
      const daysPassed = Math.ceil((now - subscription.endDate) / (1000 * 60 * 60 * 24));
    
      // Calculate subscription end date based on plan type
      if (planType === "monthly") {
        // Monthly plan - 30 days
        if (subscription.endDate && daysPassed > 6) {
          // If active subscription exists, extend from current end date
          const currentEndDate = subscription.endDate.toDate();
          newEndDate = new Date(currentEndDate);
          newEndDate.setDate(newEndDate.getDate() + 30);
        } else {
          // New subscription or inactive - start from now
          newEndDate.setDate(currentDate.getDate() + 30);
        }
      } else if (planType === "yearly") {
        if (isUpgrade) {
          // Upgrading from monthly to yearly - extend from current end date
          const currentEndDate = subscription.endDate.toDate();
          newEndDate = new Date(currentEndDate);
          
          // Calculate remaining days in monthly subscription
          const remainingDays = Math.max(0, Math.floor((currentEndDate - currentDate) / (1000 * 60 * 60 * 24)));
          
          // Add 365 days minus remaining monthly days (prorated calculation)
          // This ensures they don't lose their remaining time from monthly plan
          newEndDate.setDate(newEndDate.getDate() + 365 - 30 + remainingDays);
          
          console.log(`Upgrade calculation: Current end date: ${currentEndDate.toISOString()}, Remaining days: ${remainingDays}, New end date: ${newEndDate.toISOString()}`);
        } else if (subscription.endDate && daysPassed > 6 && subscription.subscriptionType === "yearly") {
          // If active yearly subscription exists, extend from current end date
          const currentEndDate = subscription.endDate.toDate();
          newEndDate = new Date(currentEndDate);
          newEndDate.setDate(newEndDate.getDate() + 365);
        } else {
          // New subscription or inactive - start from now
          newEndDate.setDate(currentDate.getDate() + 365);
        }
      } else {
        console.error(`Invalid plan type: ${planType}`);
        return;
      }
      
      // Extract payment details from callback metadata
      let paymentDetails = {};
      
      try {
        if (callbackData.CallbackMetadata && callbackData.CallbackMetadata.Item) {
          const items = callbackData.CallbackMetadata.Item;
          
          // Extract individual fields from metadata
          const amount = items.find((item) => item.Name === "Amount").Value || 0;
          const mpesaReceiptNumber = items.find((item) => item.Name === "MpesaReceiptNumber").Value || "";
          const transactionDate = items.find((item) => item.Name === "TransactionDate").Value || "";
          const phoneNumber = items.find((item) => item.Name === "PhoneNumber").Value || "";
          
          paymentDetails = {
            transactionId: uniqueKey,
            amount,
            mpesaReceiptNumber,
            transactionDate,
            phoneNumber
          };
        }
      } catch (error) {
        console.error("Error extracting payment details:", error);
        // Use default values if metadata extraction fails
        paymentDetails = {
          transactionId: uniqueKey,
          amount: 0,
          phoneNumber: "",
          transactionDate: "",
          mpesaReceiptNumber: ""
        };
      }
      
      // Create or update subscription data
      subscription = {
        plan: planType === "monthly" ? "Monthly Plan" : "Yearly Plan",
        startDate: admin.firestore.Timestamp.fromDate(currentDate),
        endDate: admin.firestore.Timestamp.fromDate(newEndDate),
        status: "active",
        accountType: userData.isbusinessaccount ? "business" : "normal",
        subscriptionType: planType,
        lastPayment: admin.firestore.Timestamp.fromDate(currentDate),
        paymentMethod: "M-Pesa",
        // Reset grace period notification flag if it exists
        graceNotificationSent: false,
        // Store payment details for reference
        lastPaymentDetails: paymentDetails
      };
      
      // Update user with subscription data
      await userRef.update({
        subscription: subscription,
        isbusinessaccount: true // Ensure the user is marked as a business account
      });
      
      console.log(`Subscription updated for user ${userid} with end date ${newEndDate.toISOString()}`);
      
      // Schedule TTL function to check subscription after expiry + grace period
      // Calculate TTL delay in seconds (endDate + 5 days grace period)
      /** const gracePeriodDays = 5;
      const ttlDate = new Date(newEndDate);
      ttlDate.setDate(ttlDate.getDate() + gracePeriodDays);
      
      const delaySeconds = Math.floor((ttlDate.getTime() - currentDate.getTime()) / 1000);
      
      // Schedule the TTL task
      /**  await createSubscriptionExpiryTask({
        userid: userid,
        planType: planType
      }, delaySeconds); **/
      
      // console.log(`Scheduled subscription expiry task for user ${userid} in ${delaySeconds} seconds`);
      
      // Create a notification for the user
      const notificationText = isUpgrade ? 
        "Your subscription has been upgraded to the Yearly Plan successfully." :
        `Your ${planType === "monthly" ? "Monthly" : "Yearly"} subscription has been activated successfully.`;
      
      await createNotificationForUser(userid, {
        title: isUpgrade ? "Subscription Upgraded" : "Subscription Activated",
        body: notificationText,
        type: "subscription",
        data: {
          subscriptionType: planType,
          endDate: newEndDate.toISOString(),
          receiptNumber: paymentDetails.mpesaReceiptNumber || uniqueKey
        },
        timestamp: admin.firestore.Timestamp.fromDate(currentDate)
      });
      
      return;
    } else {
      // Payment failed
      console.error(`Payment failed for user ${userid}. Result code: ${resultCode}, Result description: ${resultDesc}`);
      
      // Create a notification for the user about the failed payment
      await createNotificationForUser(userid, {
        title: "Payment Failed",
        body: `Your subscription payment could not be processed. ${resultDesc}`,
        type: "payment_failed",
        data: {
          resultCode: resultCode,
          resultDesc: resultDesc
        },
        timestamp: admin.firestore.Timestamp.fromDate(new Date())
      });
      
      return;
    }
  } catch (error) {
    console.error(`Error processing M-Pesa callback for user ${userid}:`, error);
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

// Function to schedule a task for subscription expiry check
/** async function createSubscriptionExpiryTask(data, delaySeconds) {
  const project = "flaya-9ebb2"; // Replace with your actual project ID if different
  const location = "us-central1"; // Update if your functions are in a different region
  const queue = "subscriptionExpiryCheck"; 
  
  const payload = {...data};
  
  const taskClient = new CloudTasksClient();
  const parent = taskClient.queuePath(project, location, queue);
  
  const taskName = `projects/${project}/locations/${location}/queues/${queue}/tasks`;
  
  // Create the task with the delay
  const task = {
    name: `${taskName}/subscription-${data.userid}-${Date.now()}`,
    httpRequest: {
      httpMethod: "POST",
      url: `https://${location}-${project}.cloudfunctions.net/checkSubscriptionExpiry`,
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
      headers: {"Content-Type": "application/json"},
    },
    scheduleTime: {
      seconds: delaySeconds + (Date.now() / 1000),
    },
  };
  
  // Create the task
  return taskClient.createTask({parent, task});
} **/
