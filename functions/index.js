const functions = require("firebase-functions");
const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp();
}

const {GeoFirestore} = require("geofirestore");

const firestore = admin.firestore();
const geofirestore = new GeoFirestore(firestore);
const geocollection = geofirestore.collection("areas");
const turf = require("@turf/turf");

const db = admin.firestore();
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

const MAX_POSTS_PER_DOC = 1000;

const {PubSub} = require("@google-cloud/pubsub");
const pubsub = new PubSub();

const {CloudTasksClient} = require("@google-cloud/tasks");


const ffmpeg = require("fluent-ffmpeg");
const {getStorage} = require("firebase-admin/storage");
const path = require("path");
const os = require("os");
const fs = require("fs");
const sharp = require("sharp"); // For image processing


const ALGOLIA_APP_ID = functions.config().algolia.app_id;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.admin_key;

const algoliasearch = require("algoliasearch");

// The client must be called as a function
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

const CONSUMER_KEY = functions.config().mpesa.consumer_key;
const CONSUMER_SECRET = functions.config().mpesa.consumer_secret;
const SHORTCODE = functions.config().mpesa.shortcode;
const PASSKEY = functions.config().mpesa.passkey;

const Mpesa = require("mpesa-api").Mpesa;
const credentials = {
  clientKey: CONSUMER_KEY,
  clientSecret: CONSUMER_SECRET,
  initiatorPassword: "YOUR_INITIATOR_PASSWORD_HERE",
  securityCredential: "YOUR_SECURITY_CREDENTIAL",
  certificatePath: null
};

exports.ActionOnReport = functions.firestore
  .document("reports/{reportType}/reports/{reportid}")
  .onUpdate(async (change, context) => {
    const afterData = change.after.data();
    const beforeData = change.before.data();

    if (afterData.delete !== undefined && beforeData.delete === undefined) {
      const deviceId = afterData.reporteduserdeviceid;
      if (!deviceId) {
        console.log("No deviceId found in the report.");
        return null;
      }

      const firestore = admin.firestore();
      const blacklistCollection = firestore.collection("blacklisted");

      // Find the latest blacklist document
      const latestBlacklistDocs = await blacklistCollection
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      let blacklistDocRef;
      let blacklistData = {blacklist: [], createdAt: admin.firestore.FieldValue.serverTimestamp()};

      if (!latestBlacklistDocs.empty) {
        const latestDoc = latestBlacklistDocs.docs[0];
        blacklistDocRef = latestDoc.ref;
        blacklistData = latestDoc.data();
      } else {
        // If no blacklist document exists, create a new one
        blacklistDocRef = blacklistCollection.doc();
      }

      // Check if we reached the 1000 limit
      if (blacklistData.blacklist.length >= 1000) {
        // Create a new blacklist document
        blacklistDocRef = blacklistCollection.doc();
        blacklistData = {blacklist: [], createdAt: admin.firestore.FieldValue.serverTimestamp()};
      }

      // Add deviceId to the blacklist
      blacklistData.blacklist.push(deviceId);

      // Update the document
      await blacklistDocRef.set(blacklistData);
      console.log(`Device ${deviceId} added to blacklist in ${blacklistDocRef.id}`);

      // Query users with matching deviceCreatorId
      const usersSnapshot = await firestore.collection("users").where("devicecreatorid", "==", deviceId).get();

      if (!usersSnapshot.empty) {
        const batch = firestore.batch();
        usersSnapshot.forEach((userDoc) => {
          batch.update(userDoc.ref, {status: "blacklisted"});
        });

        await batch.commit();
        console.log(`Users with deviceId ${deviceId} blacklisted.`);
      } else {
        console.log(`No users found with deviceId ${deviceId}.`);
      }
    }

    return null;
  });


exports.handleSensitiveReports = functions.firestore
  .document("users/{uid}/posts/{postid}/reports/{reporterid}")
  .onCreate(async (snapshot, context) => {
    const {uid, postid, reporterid} = context.params;
    const reportData = snapshot.data();

    if (!reportData || !reportData.report) {
      console.log("Invalid report data");
      return null;
    }

    const reportType = reportData.report.toLowerCase();
    const createdAt = reportData.createdAt || admin.firestore.FieldValue.serverTimestamp();

    let targetDOC = null;
    if (reportType === "child abuse") {
      targetDOC = "childabusereports";
    } else if (reportType === "nudity or sexual activity") {
      targetDOC = "sexualcontentreports";
    }

    if (!targetDOC) {
      console.log("Report type does not match sensitive categories");
      return null;
    } 

    // Fetch original post
    const postRef = db.doc(`users/${uid}/posts/${postid}`);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      console.log(`Post ${postid} not found`);
      return null;
    }

    const postData = postSnap.data();

    // Save the report
    const reportRef = db.collection("reports").doc(targetDOC).collection("reports").doc(reporterid+postid);

    // get deviceid of the reported user
    const reportedUserSnap = await db.collection("users").doc(uid).get();
    const reporteduserdeviceid = reportedUserSnap.data().devicecreatorid;

    if (!reporteduserdeviceid) return;

    await reportRef.set({
      ...reportData,
      ...postData,
      reporterid,
      createdAt,
      reporteduserdeviceid
    });

    console.log(`Sensitive report saved to ${targetDOC}/${snapshot.id} and post archived in sensitivereports/posts/${postid}`);
    return null;
  });


exports.getWatermarkedUrl = functions.https.onCall(async (data, context) => {
  const {mediaUrl, uid, type} = data;

  if (!mediaUrl || !uid || !type) {
    return {success: false, error: "Missing required parameters."};
  }

  try {
    const bucket = getStorage().bucket();

    // Extract filename from the original URL
    const filePath = decodeURIComponent(mediaUrl.split("/o/")[1].split("?")[0]);
    const fileName = path.basename(filePath);

    // Determine content type folder
    const contentTypeFolder = type === "video" ? "videos" : "images";

    // Construct the expected watermarked file path
    const watermarkedFilePath = `processed/${contentTypeFolder}/${uid}/watermarked-${fileName}`;

    console.log(`Checking for watermarked file: ${watermarkedFilePath}`);

    // Get reference to the file
    const watermarkedFile = bucket.file(watermarkedFilePath);

    // Check if the file exists
    const [exists] = await watermarkedFile.exists();
    if (!exists) {
      return {success: true, watermarkedUrl:mediaUrl};
    }

    // Generate signed URL
    const [watermarkedUrl] = await watermarkedFile.getSignedUrl({
      action: "read",
      expires: "03-01-2030",
    });

    return {success: true, watermarkedUrl};
  } catch (error) {
    console.error("Error fetching watermarked URL:", error);
    return {success: false, error: error.message};
  }
});


exports.addWatermark = functions
  .runWith({memory: "2GB", timeoutSeconds: 200}) // More memory for video processing
  .storage.object()
  .onFinalize(async (object) => {
    const filePath = object.name; // Full path in storage
    const contentType = object.contentType; // MIME type
    const bucket = getStorage().bucket(object.bucket);
    
    console.log(`Processing file: ${filePath}, Type: ${contentType}`);

    // Prevent infinite loop: Ignore already watermarked files
    if (filePath.startsWith("processed/")) {
      console.log("Skipping already processed file...");
      return null;
    }

    // Extract file info
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const outputFileName = `watermarked-${fileName}`;
    const outputFilePath = path.join(os.tmpdir(), outputFileName);

    // Determine if it's an image or video
    const isVideo = contentType.startsWith("video/");
    const isImage = contentType.startsWith("image/");
    
    if (!isVideo && !isImage) {
      console.log("Not an image or video. Skipping...");
      return null;
    }

    // Extract UID from path (assumes structure: uploads/{type}/{uid}/{filename})
    const pathParts = filePath.split("/");
    if (pathParts.length < 3) {
      console.log("Invalid file path structure");
      return null;
    }
    
    const contentTypeFolder = pathParts[1]; // "images" or "videos"
    const uid = pathParts[2]; // Extract UID from path
    console.log(`Detected UID: ${uid}`);

    // Fetch username from Firestore (Assumes Firestore stores user info under `users/{uid}`)
    const userDoc = await db.collection("users").doc(uid).get();
    const username = userDoc.exists ? "@" + userDoc.data().username : "Unknown";
    console.log(`Username: ${username}`);

    // Download the file
    await bucket.file(filePath).download({destination: tempFilePath});

    if (isVideo) {
      // Path to font file (ensure the font exists in the function directory)
      const fontPath = path.join(__dirname, "fonts", "Lato.ttf");

      await new Promise((resolve, reject) => {
        ffmpeg(tempFilePath)
          .videoCodec("libx264") // Efficient compression
          .audioCodec("aac") // Better audio compression
          .outputOptions([
            "-preset veryfast", // Balance between speed & size
            "-crf 28", // Increase CRF (higher = lower size, 28 is good for social media)
            "-b:v 800k", // Bitrate control (adjust if needed)
            "-maxrate 900k", // Ensures no excessive bitrate spikes
            "-bufsize 1000k",
            "-vf",
            `drawtext=text='Flaya':fontfile='${fontPath}':fontcolor=orange:fontsize=26:x=90:y=(h-text_h)-90, \
            drawtext=text='${username}':fontfile='${fontPath}':fontcolor=white:fontsize=17:x=90:y=(h-text_h)-67`
          ])
          .on("end", resolve)
          .on("error", reject)
          .save(outputFilePath);
      });
    } else if (isImage) {
      // Add text watermark for images using Sharp
      const svgOverlay = Buffer.from(`
        <svg width="300" height="200">
          <text x="30%" y="90" font-size="40" fill="orange" font-family="Arial">Flaya</text>
          <text x="30%" y="130" font-size="30" fill="white" font-family="Arial">${username}</text>
        </svg>
      `);

      await sharp(tempFilePath)
        .composite([{input: svgOverlay, gravity: "south"}])
        .toFile(outputFilePath);
    }

    // Upload the watermarked file back to Firebase Storage
    const newFilePath = `processed/${contentTypeFolder}/${uid}/${outputFileName}`;
    await bucket.upload(outputFilePath, {
      destination: newFilePath,
      metadata: {contentType: contentType},
    });

    console.log(`Watermarked file uploaded to: ${newFilePath}`);

    // Clean up temporary files
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(outputFilePath);

    return null; // Required for background functions
  });

exports.onTagAdded = functions.firestore.document("users/{userid}/tags/{tagid}")
.onCreate(async (snap, context) =>{
  const taggerid = snap.data().user;

  const currentuserid = context.params.userid;

  const taggerInfoSnap = await db.collection("users").doc(taggerid).get();

  const currentUserInfoSnap = await db.collection("users").doc(currentuserid).get();
  const token = currentUserInfoSnap.data().token;
  
  const payload = {
    profilephoto:taggerInfoSnap.data().profilephoto,
    body:"tagged you in a post",
    title:taggerInfoSnap.data().username
   };
   await sendNotification(token, payload);
});

exports.getChangedPosts = functions.https.onCall(async (data, context) => {
  const {posts} = data; // Client sends an array of posts
  if (!posts || !Array.isArray(posts)) {
    console.log("something went wrong");
    return;
  }

  const changedPosts = [];

  // Iterate through the posts from the client
  for (const post of posts) {
    const {user, id, likes, shares, comments, sharings} = post;

    if (!user || !id) {
      console.warn(`Invalid post: ${JSON.stringify(post)}`);
      continue;
    }

    try {
      const docRef = db.doc(`users/${user}/posts/${id}`);
      const snapshot = await docRef.get();

      if (snapshot.exists) {
        const dbPost = snapshot.data();

        // Compare fields (likes, shares, comments)
        if (
          dbPost.likes !== likes ||
          dbPost.shares !== shares ||
          dbPost.comments !== comments ||
          dbPost.sharings !== sharings  
        ) {
          changedPosts.push({
            ...post,
            likes: dbPost.likes,
            shares: dbPost.shares,
            comments: dbPost.comments,
            sharings: dbPost.sharings,
          });
        }
      }
    } catch (error) {
      console.error(`Error processing post ${id}:`, error);
    }
  }

  console.log("changed posts "+changedPosts.length);

  return {posts:changedPosts};
});

exports.onUpdate = functions.firestore.document("users/{userid}/updates/{updateid}")
.onWrite(async (snap, context) => {
  const uid = context.params.userid;

  const info = snap.after.data();
  const sendeeSnap = await db.collection("users").doc(uid).get();

  const token = sendeeSnap.data().token;
  if (!token) {
    return;
  }
  
  let message = info.message;

  if (info.extramessage) {
    message = info.extramessage + " " + message;
  }

  const payload = {
    title:info.username,
    body:message,
    profilephoto:info.profilephoto,
  };

  if (info.postphoto) {
    payload.postphoto = info.postphoto;
  }

  await sendNotification(token, payload);

  return;
});
async function sendNotification(token, payload) { 
  const notification = {
    token:token, // FCM token of the recipient device
    data: payload,
    android: {
      priority: "high", // Ensure the message gets delivered promptly
    },
    apns: {
      headers: {
        "apns-priority": "10", // High priority for iOS
      },
      payload: {
        aps: {
          "content-available": 1, // Silent push notification
        },
      },
    },
  };

  try {
  // Send the message using Firebase Admin SDK
  const response = await admin.messaging().send(notification);
  console.log("response", JSON.stringify(response));
  } catch (error) {
    if (error.code === "messaging/registration-token-not-registered") {
      // Remove this token from your database
      console.log("token error");
    } else {
      console.error("Unexpected FCM error:", error);
    }
  }
  
  return;
}

exports.OnTesting = functions.firestore.document("testing/{id}")
.onCreate(async (snap, content) => {
  const message = {
    token:"epDNt_q-TFCGHHbYtz5L9O:APA91bFc8azaGDUDuCh3m3YogpH6eXJQLMWP8Ve6ekrdfeCJuBC56ilMz1ZCLBtz4YMSel3Mv289X-ynYJ2jA9hzfj9wdrAUhLVwoPzhRyqvUtd21J6puns", // FCM token of the recipient device
    data: {
      title:"title",
      body:"body",
      image:"https://img.freepik.com/free-photo/colorful-design-with-spiral-design_188544-9588.jpg", 
    },
    android: {
      priority: "high", // Ensure the message gets delivered promptly
    },
    apns: {
      headers: {
        "apns-priority": "10", // High priority for iOS
      },
      payload: {
        aps: {
          "content-available": 1, // Silent push notification
        },
      },
    },
  };

  // Send the message using Firebase Admin SDK
  const response = await admin.messaging().send(message);
  console.log("Successfully sent message:", JSON.stringify(response));
});

exports.onUserBlockedDelete = functions.firestore.document("users/{userid}/blockedusers/{blockeduserid}")
.onDelete(async (snap, content) => {
  const userid = content.params.userid;
  const userRef = db.collection("users").doc(userid);

  const blockeduserid = content.params.blockeduserid;

  await userRef.update({blockedusers:admin.firestore.FieldValue.arrayRemove(blockeduserid)});
});

exports.onBlockersDeleted = functions.firestore.document("users/{userid}/blockers/{blockeruserid}")
.onDelete(async (snap, content) => {
  const userid = content.params.userid;
  const userRef = db.collection("users").doc(userid);

  const blockeruserid = content.params.blockeruserid;

  await userRef.update({blockers:admin.firestore.FieldValue.arrayRemove(blockeruserid)});
});

exports.onUserBlocked = functions.firestore.document("users/{userid}/blockedusers/{blockeduserid}")
.onCreate(async (snap, content) => {
  const userid = content.params.userid;
  const userRef = db.collection("users").doc(userid);

  const blockeduserid = content.params.blockeduserid;

  await userRef.update({blockedusers:admin.firestore.FieldValue.arrayUnion(blockeduserid)});
});

exports.onBlockersAdded = functions.firestore.document("users/{userid}/blockers/{blockeruserid}")
.onCreate(async (snap, content) => {
  const userid = content.params.userid;
  const userRef = db.collection("users").doc(userid);

  const blockeruserid = content.params.blockeruserid;

  await userRef.update({blockers:admin.firestore.FieldValue.arrayUnion(blockeruserid)});
});

exports.onCommentLike = functions.firestore.document("users/{userid}/posts/{postid}/comments/{commentid}/likes/{likerid}")
.onCreate(async (snap, content) => {
  const data = snap.data();
  const postcreatorid = content.params.userid;
  const postid = content.params.postid;
  const commentid = content.params.commentid;

  const likerid = content.params.likerid;

  const postSnap = await db.collection("users").doc(postcreatorid).collection("posts").doc(postid).get();

  const commentRef = db.collection("users").doc(postcreatorid).collection("posts").doc(postid).collection("comments").doc(commentid);
  const commentSnap = await commentRef.get();
  const commentcreatorid = commentSnap.data().commentcreatorid;

  const senderinfo = {
    username:data.username,
    profilephoto:data.profilephoto,
    uid:data.uid
  };

  const postphoto = postSnap.data().contentType === "video" ? postSnap.data().thumbnail : postSnap.data().content[0];

  await sendUpdateToUser(commentcreatorid, likerid, postid, senderinfo, postphoto, "likecomment", postcreatorid);

  await commentRef.update({likes:admin.firestore.FieldValue.increment(1)});

  return;
});


exports.onCommentRepliLike = functions.firestore.document("users/{userid}/posts/{postid}/comments/{commentid}/replies/{id}/likes/{likerid}")
.onCreate(async (snap, content) => {
  const data = snap.data();
  const postcreatorid = content.params.userid;
  const postid = content.params.postid;
  const commentid = content.params.commentid;

  const likerid = content.params.likerid;

  const repliId = content.params.id;

  const postSnap = await db.collection("users").doc(postcreatorid).collection("posts").doc(postid).get();

  const repliRef = db.collection("users").doc(postcreatorid).collection("posts").doc(postid).collection("comments").doc(commentid).collection("replies").doc(repliId);
  const repliSnap = await repliRef.get();
  const replicreatorid = repliSnap.data().uid;

  const senderinfo = {
    username:data.username,
    profilephoto:data.profileimage,
    uid:data.uid
  };

  const postphoto = postSnap.data().contentType === "video" ? postSnap.data().thumbnail : postSnap.data().content[0];
  
  await sendUpdateToUser(replicreatorid, likerid, postid, senderinfo, postphoto, "likereply", postcreatorid);

  const commentRef = db.collection("users").doc(postcreatorid).collection("posts").doc(postid).collection("comments").doc(commentid);
  await db.runTransaction(async (transaction) =>{
    const commentItemSnap = await transaction.get(commentRef);

    const replies = commentItemSnap.data().replies;
    const replyIndex = replies.findIndex((reply) => reply.id === repliId);

    if (replyIndex === -1) {
      return;
    }

    // Increase the like count of the reply
    replies[replyIndex].likes = (replies[replyIndex].likes || 0) + 1;

    // Write the updated replies array back to Firestore
    transaction.update(commentRef, {replies});
  });
});


exports.onCommentRepli = functions.firestore.document("users/{userid}/posts/{postid}/comments/{commentid}/replies/{id}")
.onCreate(async (snap, content) => {
  const data = snap.data();
  const postcreatorid = content.params.userid;
  const postid = content.params.postid;
  const commentid = content.params.commentid;

  const postSnap = await db.collection("users").doc(postcreatorid).collection("posts").doc(postid).get();

  const commentRef = db.collection("users").doc(postcreatorid).collection("posts").doc(postid).collection("comments").doc(commentid);
  const commentSnap = await commentRef.get();
  const commentcreatorid = commentSnap.data().commentcreatorid;

  await commentRef.update({replies:admin.firestore.FieldValue.arrayUnion({...data, status:"sent"})});

  const senderinfo = {
    username:data.username,
    profilephoto:data.profileimage,
    uid:data.uid
  };

  const postphoto = postSnap.data().contentType === "video" ? postSnap.data().thumbnail : postSnap.data().content[0];
  
  await sendUpdateToUser(commentcreatorid, data.uid, postid, senderinfo, postphoto, "replycomment", postcreatorid);
});

exports.onPostViewed = functions.firestore.document("users/{userid}/posts/{postid}/views/{viewerid}")
.onCreate( async (snap, context) => {
  const viewerid = context.params.viewerid;
  const postcreatorid = context.params.userid;
  const postid = context.params.postid;

  const postref = db.collection("users").doc(postcreatorid).collection("posts").doc(postid);
  const snapshot = await postref.get();
  const post = snapshot.data();

  const interactionref = geofirestore.collection("users").doc(viewerid).collection("interactions").doc(postid);

  const itemToUpdate = {
    coordinates: new admin.firestore.GeoPoint(post.coordinates.latitude, post.coordinates.longitude),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    postid: postid,
    radius: post.radius || null,
    postcreatorid: postcreatorid,
    viewed: true
  };

  // upload to seen posts of the interacting user
  // const postInfo = {
  //   id:postid,
  //   postcreatorid:postcreatorid,
  //   coordinates:{latitude:post.coordinates.latitude, longitude:post.coordinates.longitude}
  // };
  

  await interactionref.set(itemToUpdate, {merge:true});
  return;
});


exports.onPostShared = functions.firestore.document("users/{userid}/posts/{postid}/shares/{sharerid}")
.onCreate( async (snap, context) => {
  const sharerid = context.params.sharerid;
  const postcreatorid = context.params.userid;
  const postid = context.params.postid;

  const postref = db.collection("users").doc(postcreatorid).collection("posts").doc(postid);
  const snapshot = await postref.get();
  const post = snapshot.data();

  const interactionref = geofirestore.collection("users").doc(sharerid).collection("interactions").doc(postid);

  const itemToUpdate = {
    coordinates: new admin.firestore.GeoPoint(post.coordinates.latitude, post.coordinates.longitude),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    postid: postid,
    radius: post.radius || null,
    postcreatorid: postcreatorid,
    shared: true
  };

  await interactionref.set(itemToUpdate, {merge:true});
  return;
});


exports.onCollectionCreated = functions.firestore
  .document("users/{userid}/updates/{id}/collections/{likerid}")
  .onCreate(async (snap, context) => {
    const userid = context.params.userid;
    const id = context.params.id;

    const ref = db.collection("users").doc(userid).collection("updates").doc(id);

    // Run a Firestore transaction
    await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) {
      console.error("Document does not exist:", ref.path);
      return;
    }

    const count = snapshot.data().count || 0;

    // Update the document within the transaction
    transaction.update(ref, {
      count: count + 1,
    });
  });

    return;
  });

  async function sendUpdateToUser(receiverid, senderid, postid, data, postphoto, postType, postcreatorid) {
      if (senderid === receiverid) {
        return;
      }
      let message;

      let extramessage = null;

      if (postType === "like") {
        message = "likes your post";
      } else if (postType === "likecomment" || postType === "likereply") {
        message = "comment on a post";
        extramessage = "liked your";
      } else if (postType === "comment") {
        message = "commented on your post";
      } else if (postType === "replycomment") {
        extramessage = "replied to your";
         message = "comment on a post";
      }


        // send updates to the user
      const userUpdatesRef = db.collection("users").doc(receiverid).collection("updates");
      const q = await userUpdatesRef.where("postid", "==", postid).where("postType", "==", postType).get();

      // get coordinates of senderid
      const senderSnap = await db.collection("users").doc(senderid).get();
      const senderData = senderSnap.data();
      const senderCoordinates = {
        latitude:senderData.coordinates.latitude,
        longitude:senderData.coordinates.longitude
      };

      // get coordinates of the post
      const postSnap = await db.collection("users").doc(postcreatorid).collection("posts").doc(postid).get();
      const postData = postSnap.data();
      const postCoordinates = {
        latitude:postData.coordinates.latitude,
        longitude:postData.coordinates.longitude
      };

      // check if a collection
      if (q.docs.length === 1 && q.docs[0].data().iscollection === true) {
        const userinfo = {
          username:data.username,
          senderid:senderid,
          profilephoto:data.profilephoto,
          createdAt:admin.firestore.FieldValue.serverTimestamp(),
          coordinates:senderCoordinates
        };

        await userUpdatesRef.doc(q.docs[0].data().id).collection("collections").doc(senderid).set(userinfo);

        return;
      }


      await db.runTransaction(async (transaction) => {
        const userUpdatesSnapshot = await transaction.get(
          userUpdatesRef.where("postid", "==", postid).where("postType", "==", postType)
        );

        const docs = userUpdatesSnapshot.docs;
        if (docs.length < 5) {
          const id = generateRandomString(15);
          const update = {
            id: id,
            iscollection: false,
            postid: postid,
            coordinates:senderCoordinates,
            username: data.username,
            senderid:senderid,
            postcreatorid:postcreatorid,
            postType: postType,
            extramessage:extramessage,
            postphoto: postphoto,
            message: message,
            profilephoto: data.profilephoto,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          };
      
          transaction.set(userUpdatesRef.doc(id), update);
        } else {
          const id = generateRandomString(15);
      
          const update = {
            id: id,
            iscollection: true,
            postid: postid,
            username: data.username,
            senderid:senderid,
            postcreatorid:postcreatorid,
            postcoordinates:postCoordinates,
            postType: postType,
            count: 0, // Updated dynamically within the transaction
            extramessage: extramessage,
            postphoto: postphoto,
            message: message,
            profilephoto: data.profilephoto,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          };
      
          transaction.set(userUpdatesRef.doc(id), update, {merge:true});
      
          const destinationRef = db
            .collection("users")
            .doc(receiverid)
            .collection("updates")
            .doc(id)
            .collection("collections");
      
          docs.forEach((doc) => {
            const docData = doc.data();
      
            const userinfo = {
              username: docData.username,
              senderid: docData.senderid,
              profilephoto: docData.profilephoto,
              coordinates:docData.coordinates,
              createdAt:admin.firestore.FieldValue.serverTimestamp()
            };
      
            const destinationDocRef = destinationRef.doc(docData.senderid);
      
            // Add the document to the 'collections' subcollection
            transaction.set(destinationDocRef, userinfo);
      
            // Delete the document from the original 'updates' collection
            transaction.delete(userUpdatesRef.doc(doc.id));
          });
        }
      });
  }


  exports.onPostSharing = functions.firestore.document("users/{userid}/posts/{postid}/sharings/{sharerid}")
  .onCreate( async (snap, context) => {
    const sharerid = context.params.sharerid;
    const postcreatorid = context.params.userid;
    const postid = context.params.postid;

    // const data = snap.data();

    const postref = db.collection("users").doc(postcreatorid).collection("posts").doc(postid);
    const snapshot = await postref.get();
    const post = snapshot.data();

    const interactionref = geofirestore.collection("users").doc(sharerid).collection("interactions").doc(postid);

    const itemToUpdate = {
      coordinates: new admin.firestore.GeoPoint(post.coordinates.latitude, post.coordinates.longitude),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      postid: postid,
      radius: post.radius || null,
      postcreatorid: postcreatorid,
      sharings: true
    };

    await interactionref.set(itemToUpdate, {merge:true});
    // // send updates to the user
    // const userUpdatesRef = db.collection("users").doc(postcreatorid).collection("updates");
    // const q = await userUpdatesRef.where("postid", "==", postid).where("postType", "==", "like").get();

    // if (q.docs.length === 1 && q.docs[0].data().iscollection === true) {
    //   const userinfo = {
    //     username:data.username,
    //     likerid:likerid,
    //     profilephoto:data.profilephoto
    //   };

    //   await userUpdatesRef.doc(q.docs[0].data().id).collection("collections").doc(likerid).set(userinfo);

    //   return;
    // }
    // await db.runTransaction(async (transaction) => {
    //   const userUpdatesSnapshot = await transaction.get(
    //     userUpdatesRef.where("postid", "==", postid).where("postType", "==", "like")
    //   );
    //   const docs = userUpdatesSnapshot.docs;
    
    //   if (docs.length < 2) {
    //     const id = generateRandomString(15);
    
    //     const update = {
    //       id: id,
    //       iscollection: false,
    //       postid: postid,
    //       username: data.username,
    //       postType: "like",
    //       postphoto: post.content[0],
    //       message: "likes your post",
    //       profilephoto: data.profilephoto,
    //       timestamp: admin.firestore.FieldValue.serverTimestamp(),
    //     };
    
    //     transaction.set(userUpdatesRef.doc(id), update);
    //   } else {
    //     const id = generateRandomString(15);
    
    //     const update = {
    //       id: id,
    //       iscollection: true,
    //       postid: postid,
    //       username: data.username,
    //       postType: "like",
    //       count: docs.length, // Updated dynamically within the transaction
    //       extramessage: `and ${docs.length} others`,
    //       postphoto: post.content[0],
    //       message: "liked your post",
    //       profilephoto: data.profilephoto,
    //       timestamp: admin.firestore.FieldValue.serverTimestamp(),
    //     };
    
    //     transaction.set(userUpdatesRef.doc(id), update);
    
    //     const destinationRef = db
    //       .collection("users")
    //       .doc(postcreatorid)
    //       .collection("updates")
    //       .doc(id)
    //       .collection("collections");
    
    //     docs.forEach((doc) => {
    //       const docData = doc.data();
    
    //       const userinfo = {
    //         username: docData.username,
    //         likerid: likerid,
    //         profilephoto: data.profilephoto,
    //       };
    
    //       const destinationDocRef = destinationRef.doc(likerid);
    
    //       // Add the document to the 'collections' subcollection
    //       transaction.set(destinationDocRef, userinfo);
    
    //       // Delete the document from the original 'updates' collection
    //       transaction.delete(userUpdatesRef.doc(doc.id));
    //     });
    //   }
    // });

    return;
  });

exports.onPostLiked = functions.firestore.document("users/{userid}/posts/{postid}/likes/{likerid}")
.onCreate( async (snap, context) => {
  const likerid = context.params.likerid;
  const postcreatorid = context.params.userid;
  const postid = context.params.postid;

  const data = snap.data();

  // add popularity
  const likerRef = db.collection("users").doc(likerid);
  const likerSnap = await likerRef.get();
  await snap.ref.update({popularity:likerSnap.data().popularity});

  const postref = db.collection("users").doc(postcreatorid).collection("posts").doc(postid);

  await storeLikerInPeopleLiked(postref, likerSnap.data());

  
  const snapshot = await postref.get();
  const post = snapshot.data();

  const interactionref = geofirestore.collection("users").doc(likerid).collection("interactions").doc(postid);

  const itemToUpdate = {
    coordinates: new admin.firestore.GeoPoint(post.coordinates.latitude, post.coordinates.longitude),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    postid: postid,
    radius: post.radius || null,
    postcreatorid: postcreatorid,
    liked: true
  };

  await interactionref.set(itemToUpdate, {merge:true});

  const postphoto = post.contentType === "video" ? post.thumbnail : post.content[0];

  await sendUpdateToUser(postcreatorid, likerid, postid, {username:data.username, profilephoto:data.profilephoto}, postphoto, "like", postcreatorid);

  // // send updates to the user
  // const userUpdatesRef = db.collection("users").doc(postcreatorid).collection("updates");
  // const q = await userUpdatesRef.where("postid", "==", postid).where("postType", "==", "like").get();

  // if (q.docs.length === 1 && q.docs[0].data().iscollection === true) {
  //   const userinfo = {
  //     username:data.username,
  //     likerid:likerid,
  //     profilephoto:data.profilephoto
  //   };

  //   await userUpdatesRef.doc(q.docs[0].data().id).collection("collections").doc(likerid).set(userinfo);

  //   return;
  // }
  // await db.runTransaction(async (transaction) => {
  //   const userUpdatesSnapshot = await transaction.get(
  //     userUpdatesRef.where("postid", "==", postid).where("postType", "==", "like")
  //   );
  //   const docs = userUpdatesSnapshot.docs;
  
  //   if (docs.length < 2) {
  //     const id = generateRandomString(15);
  
  //     const update = {
  //       id: id,
  //       iscollection: false,
  //       postid: postid,
  //       username: data.username,
  //       postType: "like",
  //       postphoto: post.content[0],
  //       message: "likes your post",
  //       profilephoto: data.profilephoto,
  //       timestamp: admin.firestore.FieldValue.serverTimestamp(),
  //     };
  
  //     transaction.set(userUpdatesRef.doc(id), update);
  //   } else {
  //     const id = generateRandomString(15);
  
  //     const update = {
  //       id: id,
  //       iscollection: true,
  //       postid: postid,
  //       username: data.username,
  //       postType: "like",
  //       count: docs.length, // Updated dynamically within the transaction
  //       extramessage: `and ${docs.length} others`,
  //       postphoto: post.content[0],
  //       message: "liked your post",
  //       profilephoto: data.profilephoto,
  //       timestamp: admin.firestore.FieldValue.serverTimestamp(),
  //     };
  
  //     transaction.set(userUpdatesRef.doc(id), update);
  
  //     const destinationRef = db
  //       .collection("users")
  //       .doc(postcreatorid)
  //       .collection("updates")
  //       .doc(id)
  //       .collection("collections");
  
  //     docs.forEach((doc) => {
  //       const docData = doc.data();
  
  //       const userinfo = {
  //         username: docData.username,
  //         likerid: likerid,
  //         profilephoto: data.profilephoto,
  //       };
  
  //       const destinationDocRef = destinationRef.doc(likerid);
  
  //       // Add the document to the 'collections' subcollection
  //       transaction.set(destinationDocRef, userinfo);
  
  //       // Delete the document from the original 'updates' collection
  //       transaction.delete(userUpdatesRef.doc(doc.id));
  //     });
  //   }
  // });

  return;
});

exports.onUserJoined = functions.firestore.document("users/{userid}")
.onCreate( async (snap, context) => {
  const userid = context.params.userid;
  const ref = db.collection("users").doc(userid);
  await ref.update({devicecreatorid:""});
});

exports.onReplied = functions.firestore
.document("users/{userid}/stories/{storyid}/replies/{viewerid}")
.onCreate(async (snapshot, context) => {
  const creatorid = context.params.userid;
  const storiId = context.params.storyid;

  if (snapshot.data().response === undefined) return;
  console.log("respose is available");

  const storiRef = db.collection("users").doc(creatorid).collection("stories").doc(storiId);
  await storiRef.update({replies:admin.firestore.FieldValue.increment(1)});

  const activestoriRef = db.collection("users").doc(creatorid).collection("activestories").doc(storiId);
  await activestoriRef.update({replies:admin.firestore.FieldValue.increment(1)});

  return;
});


exports.onRepliedUpdated = functions.firestore
.document("users/{userid}/stories/{storyid}/replies/{viewerid}")
.onUpdate(async (change, context) => {
  const creatorid = context.params.userid;
  const storiId = context.params.storyid;

  const responseBefore = change.before.data().response;

  if (responseBefore !== undefined) return;
  console.log("respose created");

  const storiRef = db.collection("users").doc(creatorid).collection("stories").doc(storiId);
  await storiRef.update({replies:admin.firestore.FieldValue.increment(1)});

  const activestoriRef = db.collection("users").doc(creatorid).collection("activestories").doc(storiId);
  await activestoriRef.update({replies:admin.firestore.FieldValue.increment(1)});
});

exports.onStoriViewed = functions.firestore
.document("users/{userid}/stories/{storyid}/views/{viewerid}")
.onCreate(async (snapshot, context) => {
  const creatorid = context.params.userid;
  const storiId = context.params.storyid;
  const viewerid = context.params.viewerid;

  const storiRef = db.collection("users").doc(creatorid).collection("stories").doc(storiId);
  await storiRef.update({views:admin.firestore.FieldValue.increment(1)});

  const activestoriRef = db.collection("users").doc(creatorid).collection("activestories").doc(storiId);
  await activestoriRef.update({views:admin.firestore.FieldValue.increment(1)});

  // add to replies
  const repliRef = db.collection("users").doc(creatorid).collection("stories").doc(storiId).collection("replies").doc(viewerid);
  const snap = await repliRef.get();

  if (snap.exists) return;
  console.log("passing here");

  await repliRef.set(snapshot.data());
  return;
});


exports.onPostDeleted = functions.firestore
.document("users/{userid}/posts/{postid}")
.onDelete(async (snapshot, context) => {
  const data = snapshot.data();
  const period = data.period;

  const postid = context.params.postid;
  const areas = await queryAreasPostIsLocated(postid);
  for (const areaid of areas) {
    const ref = admin.firestore().collection("areas").doc(areaid)
    .collection(period);

    const docs = await ref.get();

    docs.forEach(async (snapshot)=>{
      const data = snapshot.data();
      const postsArray = data.posts;

      const savedpost = postsArray.find((post) => post.id === postid);

      if (savedpost) {
         const latestref = admin.firestore().collection("areas")
         .doc(areaid).collection(period).doc(data.id);

         await latestref.update({posts: admin.firestore.FieldValue.arrayRemove(savedpost)});
         console.log("post found");
      }
    });

    const postareaRef = admin.firestore().collection("areas").doc(areaid)
    .collection("posts").doc(postid);

    await postareaRef.delete();
  }
});

exports.onActiveStoryAdded = functions.firestore
  .document("users/{userid}/activestories/{storyid}")
  .onCreate(async (snapshot, context) => {
    const userid = context.params.userid;

    // Get all active stories for this user
    const activestoriessnap = await db.collection("users").doc(userid).collection("activestories").get();

    // Check if this is the first active story
    if (activestoriessnap.docs.length === 1) {
      try {
        // Initialize batch for updating related collections
        const batch = db.batch();

        // Update `messages` collection group
        const querySnapshotMessages = await db.collectionGroup("messages")
          .where("id", "==", userid)
          .get();

        querySnapshotMessages.docs.forEach((doc) => {
          batch.update(doc.ref, {hasstories: true});
        });

        // Update `onlineusers` collection group
        const querySnapshotAreas = await db.collectionGroup("onlineusers")
          .where("id", "==", userid)
          .get();

        querySnapshotAreas.docs.forEach((doc) => {
          batch.update(doc.ref, {hasstories: true});
        });

        // Update user's main document
        const userRef = db.collection("users").doc(userid);
        batch.update(userRef, {hasstories: true});

        // Commit all updates in a single batch
        await batch.commit();
      } catch (error) {
        console.error("Error updating story status:", error);
      }
    }

    return;
  });


  exports.onActiveStoryDeleted = functions.firestore
  .document("users/{userid}/activestories/{storyid}")
  .onDelete(async (snapshot, context) => {
    const userid = context.params.userid;

    try {
      // Fetch remaining active stories
      const activestoriessnap = await db.collection("users").doc(userid).collection("activestories").get();

      // Check if there are no more active stories
      if (activestoriessnap.empty) {
        const batch = db.batch();

        // Update `messages` collection group
        const querySnapshotMessages = await db.collectionGroup("messages")
          .where("id", "==", userid)
          .get();

        querySnapshotMessages.docs.forEach((doc) => {
          batch.update(doc.ref, {hasstories: false});
        });

        // Update `onlineusers` collection group
        const querySnapshotAreas = await db.collectionGroup("onlineusers")
          .where("id", "==", userid)
          .get();

        querySnapshotAreas.docs.forEach((doc) => {
          batch.update(doc.ref, {hasstories: false});
        });

        // Update user's main document
        const userRef = db.collection("users").doc(userid);
        batch.update(userRef, {hasstories: false});

        // Commit all updates in a single batch
        await batch.commit();
      }
    } catch (error) {
      console.error("Error updating story status on delete:", error);
    }

    return;
  });


  const storeReferal = async (referralCode, deviceId, deviceInfo, userId, username) => {
    if (!referralCode || !deviceId || !deviceInfo || !userId || !username) return;

    const usersRef = db.collection("users");
    const referralRef = db.collection("referals").doc(referralCode);
    const groupBatchesRef = referralRef.collection("groupbatches");

    // **Step 1: Ensure device uniqueness**
    const existingUserWithDevice = await usersRef.where("devicecreatorid", "==", deviceId).get();
    const isUniqueDevice = existingUserWithDevice.empty;

    // **Step 2: Find the latest group batch**
    const latestBatchQuery = await groupBatchesRef.orderBy("createdAt", "desc").limit(1).get();

    let batchId;
    let realcount = 0;

    if (!latestBatchQuery.empty) {
      const latestBatchDoc = latestBatchQuery.docs[0];
      batchId = latestBatchDoc.id;
      const batchData = latestBatchDoc.data();
      realcount = batchData.realcount || 0;
    }

    // **Step 3: If batch is full, create a new one**
    if (!batchId || realcount >= 25) {
      batchId = `batch_${Date.now()}`;
      await groupBatchesRef.doc(batchId).set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        count: 0,
        realcount: 0,
        duplicates: [], // Initialize an empty duplicates array
      });
    }

    const batchRef = groupBatchesRef.doc(batchId);

    // **Step 4: Add new user to batch**
    await batchRef.collection("referalusers").doc(userId).set({
      uid:userId,
      batchid:batchId,
      deviceid:deviceId,
      devicedetails:deviceInfo.deviceName,
      username,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // **Step 5: Update batch counters and handle duplicates**
    const updates = {
      count: admin.firestore.FieldValue.increment(1), // Total count (includes duplicates)
    };

    if (isUniqueDevice) {
      updates.realcount = admin.firestore.FieldValue.increment(1); // Only for unique devices
    } else {
      updates.duplicates = admin.firestore.FieldValue.arrayUnion({
        uid:userId,
        deviceid:deviceId,
        devicedetails:deviceInfo.deviceName,
        username,
      });
    }

    await batchRef.update(updates);

    console.log(`User ${userId} added to referral batch ${batchId}. Unique: ${isUniqueDevice}`);
  };

async function deleteBusiness(userid, businessid) {
  const businessRef = db.collection("businesses").doc(businessid);
  await businessRef.delete();
  return "Deleted";
} 


  exports.onBusinessUpdate = functions.firestore
  .document("locationchanges/{userid}")
  .onUpdate(async (snapshot, context) => {
    const userid = context.params.userid;
    const beforeData = snapshot.before.data();
    const afterData = snapshot.after.data();

    // Check if status changed from 'pending' to 'approved' or 'denied'
    if (beforeData.status === "pending" && (afterData.status === "approved" || afterData.status === "denied")) {
      if (afterData.status === "approved") {
        // Approve the location change
        try {
          // Update coordinates in the businesses collection
          const businessesDoc = geofirestore.collection("businesses").doc(afterData.businessid);
          await businessesDoc.update({
            coordinates: new admin.firestore.GeoPoint(afterData.newLocation.latitude, afterData.newLocation.longitude)
          });

          // Update user's business coordinates
          const accountRef = db.collection("users").doc(userid);
          await accountRef.update({
            "business.coordinates": {
              _latitude: afterData.newLocation.latitude,
              _longitude: afterData.newLocation.longitude
            },
            "business.locationchange": false
          });

          console.log(`Location change approved for user ${userid}`);
        } catch (error) {
          console.error("Error approving location change:", error);
        }
      } else if (afterData.status === "denied") {
        // Deny the location change
        try {
          // Just reset the locationchange flag
          const accountRef = db.collection("users").doc(userid);
          await accountRef.update({
            "business.locationchange": false
          });


          console.log(`Location change denied for user ${userid}`);
        } catch (error) {
          console.error("Error denying location change:", error);
        }
      }

      // Delete the locationchange document after processing
      try {
        await snapshot.after.ref.delete();
        console.log(`Location change document deleted for user ${userid}`);
      } catch (error) {
        console.error("Error deleting location change document:", error);
      }
    }
  });

exports.OnUserUpdate = functions.firestore
  .document("users/{userid}")
  .onUpdate(async (snapshot, context) => {
    const beforeData = snapshot.before.data();
    const afterData = snapshot.after.data();
    const userId = context.params.userid;

    const userCoordinates = afterData.coordinates;

    // submit business for approval
    if (afterData.isbusinessaccount === false && (beforeData.isbusinessaccount === null || beforeData.isbusinessaccount === undefined)) {
      const businessProcessingRef = db.collection("businessprocessing").doc(userId);
      await businessProcessingRef.set({business:afterData.business, uid:userId});
      console.log("submitted");
    }


    // approve business
    if (afterData.isbusinessaccount === true && beforeData.isbusinessaccount === false) {
      const status = await approveBusiness(userId);
      console.log(JSON.stringify(status));
    }

    // delete business
    if (afterData.isbusinessaccount === null && beforeData.isbusinessaccount === true) {
      const status = await deleteBusiness(userId, beforeData.business.businessid);
      console.log(status);
    }

    // Change profile photo to business
    if (afterData.profilephoto !== beforeData.profilephoto && afterData.isbusinessaccount === true) {
      const businessesDoc = geofirestore.collection("businesses").doc(afterData.business.businessid);
      await businessesDoc.update({poster:afterData.profilephoto, ownerphoto:afterData.profilephoto});
    }

    // add username to infoarray
    const beforeusername = beforeData.username;
    if (beforeusername === undefined && afterData.username !== undefined) {
      await snapshot.after.ref.update({infoarray:admin.firestore.FieldValue.arrayUnion(afterData.username)});

      // store referal if any
      await storeReferal(afterData.referal, afterData.devicecreatorid, afterData.devicedetails, userId, afterData.username);
    }

    // if there was an update in username
    if (beforeusername!== undefined && afterData.username != undefined && beforeusername !== afterData.username) {
      const infoarray = [];
      infoarray.push(afterData.email);
      infoarray.push(afterData.username);

      await snapshot.after.ref.update({infoarray:infoarray});
    }

    async function getTouchingAreas(userCoordinates) {
      const query = geocollection.near({
        center: new admin.firestore.GeoPoint(userCoordinates.latitude, userCoordinates.longitude),
        radius: 1.5, // Radius in kilometers
      });

      const snapshot = await query.get();
      
      return snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const areaLat = data.coordinates.latitude;
          const areaLng = data.coordinates.longitude;
          const areaRadius = data.radius || 500;
    
          return doCirclesTouch(userCoordinates.latitude, userCoordinates.longitude, 500, areaLat, areaLng, areaRadius) ? 
            data.id : 
            null;
        })
        .filter((area) => area !== null);
    }

    async function updateOnlineUsers(userCoordinates, touchingAreas) {
      const batch = db.batch();

      const updateData = {
        coordinates: new admin.firestore.GeoPoint(userCoordinates.latitude, userCoordinates.longitude),
        hasstories: afterData.hasstories,
        isshowingdistance: true,
        profilephoto: afterData.profilephoto,
        random: getRandomString(),
        username: afterData.username,
        id: afterData.uid
      };

      touchingAreas.forEach((areaId) => {
        const onlineUsersRef = db.collection(`areas/${areaId}/onlineusers`).doc(userId);
        batch.set(onlineUsersRef, updateData);
      });
      console.log("online updated");
      await batch.commit();
    }

    if (beforeData.isshowingonlinearea !== afterData.isshowingonlinearea) {
      if (afterData.isshowingonlinearea) {
        try {
          const touchingAreas = await getTouchingAreas(userCoordinates);
          console.log("touching areas "+touchingAreas);
          await updateOnlineUsers(userCoordinates, touchingAreas);
        } catch (error) {
          console.error("Error updating online users:", error);
        }
      } else {
        const querySnapshot = await db.collectionGroup("onlineusers")
          .where("id", "==", userId)
          .get();

        const deletePromises = querySnapshot.docs.map((doc) => doc.ref.delete());
        await Promise.all(deletePromises);
      }
      return;
    }

    if (!afterData.isshowingonlinearea) {
      console.log("online setting false");
      return;
    }

    if (
      beforeData.coordinates.latitude !== afterData.coordinates.latitude ||
      beforeData.coordinates.longitude !== afterData.coordinates.longitude
    ) {
      const distanceChange = turf.distance(
        [beforeData.coordinates.longitude, beforeData.coordinates.latitude],
        [afterData.coordinates.longitude, afterData.coordinates.latitude],
        {units: "meters"}
      );

      if (distanceChange < 50) return;

      const querySnapshot = await db.collectionGroup("onlineusers")
        .where("id", "==", userId)
        .get();

      const deletePromises = querySnapshot.docs.map((doc) => doc.ref.delete());
      await Promise.all(deletePromises);

      try {
        const touchingAreas = await getTouchingAreas(userCoordinates);
        await updateOnlineUsers(userCoordinates, touchingAreas);
      } catch (error) {
        console.error("Error updating online users:", error);
      }
    }

    if (afterData.business && beforeData.business && afterData.business.coordinates._latitude !== beforeData.business.coordinates._latitude || afterData.business.coordinates._longitude !== beforeData.business.coordinates._longitude) {
      const locationChangesRef = db.collection("locationchanges").doc(userId);
        await locationChangesRef.set({
          userid: userId,
          businessid: afterData.business.businessid,
          businessName: afterData.business.name,
          businessPhoto: afterData.profilephoto,
          businessCategory: afterData.business.category,
          username: afterData.username,
          previousLocation: {
            latitude: beforeData.business.coordinates._latitude,
            longitude: beforeData.business.coordinates._longitude,
            address: beforeData.business.address || "Previous location"
          },
          newLocation: {
            latitude: afterData.business.coordinates._latitude,
            longitude: afterData.business.coordinates._longitude,
            address: afterData.business.address || "New location"
          },
          status: "pending",
          requestedAt: admin.firestore.FieldValue.serverTimestamp(),
          reason: "Business location update requested"
        });
      

        // set 'locationchange' to true on the business document
        snapshot.after.ref.update({"business.locationchange":true});

        console.log("location change requested");
    }

    if (beforeData.isonline !== afterData.isonline) {
      const querySnapshot = await db.collectionGroup("onlineusers")
        .where("id", "==", userId)
        .get();

      const onlinePromises = querySnapshot.docs.map((doc) => doc.ref.update({isonline:afterData.isonline}));
      await Promise.all(onlinePromises);
    }
    return;
  });


  exports.updateFirestoreOnConnectionChange = functions.database
    .ref("/users/{uid}/connections")
    .onUpdate(async (change, context) => {
        const {uid} = context.params;

        const beforeStatus = change.before.val();
        const afterStatus = change.after.val();

        if (beforeStatus === afterStatus) {
            // No change in the connection status
            return null;
        }

        // Update the Firestore document with the new connection status
        try {
            await db.collection("users").doc(uid).update({
                isonline: afterStatus,
                lastactive: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Firestore updated for user ${uid} with online status: ${afterStatus}`);
        } catch (error) {
            console.error(`Failed to update Firestore for user ${uid}:`, error);
        }
        return null;
    });

  function getRandomString(length = 5) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    
    return result;
  }


exports.getOnlineUsers = functions.https.onCall(async (data, context) => {
  const {id} = data; // Parse the coordinates and user ID

  console.log("running");

  if (!id) {
    console.log("id not found");
    return;
  }

  try {
    const userSnap = await db.collection("users").doc(id).get();
    const userCoordinates = userSnap.data().coordinates;

    const query = geocollection.near({
      center: new admin.firestore.GeoPoint(userCoordinates.latitude, userCoordinates.longitude),
      radius: 1.5, // Radius in kilometers
    });

    const snapshot = await query.get();

    // Find areas that touch or overlap with the user's radius
    const touchingAreas = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const areaLat = data.coordinates.latitude;
        const areaLng = data.coordinates.longitude;
        const areaRadius = data.radius || 500;

        if (doCirclesTouch(userCoordinates.latitude, userCoordinates.longitude, 500, areaLat, areaLng, areaRadius)) {
          return data.id;
        }
        return null;
      })
      .filter((area) => area !== null); // Remove null entries

    // Retrieve online users for each touching area
    let onlineUsers = [];

    for (const areaId of touchingAreas) {
      const onlineUsersSnap = await db.collection(`areas/${areaId}/onlineusers`)
        .where("isonline", "==", true)
        .orderBy("random")
        .limit(20)
        .get();

      // Map results to include user IDs and any additional fields you need
      const usersInArea = onlineUsersSnap.docs
      .map((doc) => doc.data())
      .filter((data) => data.id !== id);

      // Optionally shuffle or limit the results to add randomness
      onlineUsers = onlineUsers.concat(usersInArea);
    }

    // Shuffle the combined results
    const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);
    onlineUsers = shuffleArray(onlineUsers);

    // Remove users with duplicate IDs (keep only the first occurrence)
    const uniqueUsersMap = new Map();
    onlineUsers.forEach((user) => {
      if (!uniqueUsersMap.has(user.id)) {
        uniqueUsersMap.set(user.id, user);
      }
    });

    // Convert map back to array
    const uniqueUsers = Array.from(uniqueUsersMap.values());

    // Limit to 30 users
    const limitedusers = uniqueUsers.slice(0, 30);
    // Return the list of online users
    return limitedusers;
  } catch (error) {
    console.error("Error fetching online users:", error);
    return;
  }
});


exports.onChatAdded = functions.firestore
  .document("users/{userid}/messages/{messageid}/chats/{chatid}")
  .onCreate(async (info, context) => {
    const chatInfo = info.data();
    const senderid = context.params.userid;
    const chatid = context.params.chatid;
    const messageid = context.params.messageid;

    if (senderid === chatInfo.receiverid) {
      console.log("returning");

      // get token
      const receiverSnap = await db.collection("users").doc(chatInfo.receiverid).get();
      const token = receiverSnap.data().token;

      if (!token) return;

      // get sender info
       const messageSnap = await db.collection("users").doc(chatInfo.receiverid).collection("messages").doc(messageid).get();
       const payload = {
        profilephoto:messageSnap.data().photo,
        body:messageSnap.data().message,
        title:messageSnap.data().username
       };

       await sendNotification(token, payload);
 
      return;
    }

    // Reference for the opponent user's chat collection
    const oppUserChatRef = db
      .collection("users")
      .doc(chatInfo.receiverid)
      .collection("messages")
      .doc(senderid)
      .collection("chats");

    // Add the new chat to the opponent user's chat collection
    await oppUserChatRef.doc(chatid).set(chatInfo);

    // Add to messages for the opponent user
    const oppUserMessageRef = db
      .collection("users")
      .doc(chatInfo.receiverid)
      .collection("messages")
      .doc(senderid);

    const oppUserSnap = await oppUserMessageRef.get();
    const currentUserInfoSnap = await db.collection("users").doc(senderid).get();

    const oppUserMessage = {
      id: senderid,
      ...(chatInfo.messageType === "text" ?{message: chatInfo.message} : chatInfo.messageType === "location" ? {message:"location"} : {message:"image"}),
      photo: currentUserInfoSnap.data().profilephoto,
      username: currentUserInfoSnap.data().username,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isread: false,
      isoppread: false,
      stamp: admin.firestore.FieldValue.serverTimestamp(),
      senderid: senderid,
    };

    console.log("wow");

    // Check if opponent user's message document exists
    if (!oppUserSnap.exists) {
      oppUserMessage.isrequestaccepted = true;
      oppUserMessage.isrequest = true;

      console.log("coming here");

      const activestoriesSnap = await db
        .collection("users")
        .doc(senderid)
        .collection("activestories")
        .get();
      oppUserMessage.hasstories = !activestoriesSnap.empty;
    }

    // Set opponent user's message with merge: true
    await oppUserMessageRef.set(oppUserMessage, {merge: true});

    console.log("updated");

    // Add to messages for the current user
    const currentUserMessageRef = db
      .collection("users")
      .doc(senderid)
      .collection("messages")
      .doc(chatInfo.receiverid);

    const currentUserMessageSnap = await currentUserMessageRef.get();
    const oppUserInfoSnap = await db.collection("users").doc(chatInfo.receiverid).get();

    const currentUserMessage = {
      id: chatInfo.receiverid,
      ...(chatInfo.messageType === "text" ?{message: chatInfo.message} : chatInfo.messageType === "location" ? {message:"location"} : {message:"image"}),
      photo: oppUserInfoSnap.data().profilephoto,
      username: oppUserInfoSnap.data().username,
      isread: true,
      isoppread: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      stamp: admin.firestore.FieldValue.serverTimestamp(),
      senderid: senderid,
    };

    
    // Check if current user's message document exists
    if (!currentUserMessageSnap.exists) {
      currentUserMessage.isrequest = false;

      if (oppUserSnap.exists) {
        currentUserMessage.isrequestaccepted = true;
        // accept request of the opp user automatically
        await oppUserMessageRef.set({isrequestaccepted:true}, {merge: true});
      } else {
        currentUserMessage.isrequestaccepted = false;
      }

      
      const oppUserStoriesSnap = await db
        .collection("users")
        .doc(chatInfo.receiverid)
        .collection("activestories")
        .get();
      currentUserMessage.hasstories = !oppUserStoriesSnap.empty;
    }

    // Set current user's message with merge: true
    await currentUserMessageRef.set(currentUserMessage, {merge: true});
  });

exports.onCommentAdded = functions.firestore
  .document("users/{userid}/posts/{postid}/comments/{commentid}")
  .onCreate(async (info, context) => {
    const postid = context.params.postid;
    const postcreatorid = context.params.userid;

    const commentcreatorid = info.data().commentcreatorid;

    if (!commentcreatorid) {
      console.error("Comment creator ID not found!");
      return null; // Exit early if no comment creator ID
    }

    const postref = db.collection("users").doc(postcreatorid).collection("posts").doc(postid);

    try {
      const snap = await postref.get();
      const post = snap.data();

      if (!post) {
        console.error(`Post with ID ${postid} not found!`);
        return null;
      }
      const commentcreatorinteractionref = geofirestore.collection("users").doc(commentcreatorid).collection("interactions").doc(postid);

      const itemToUpdate = {
        coordinates: new admin.firestore.GeoPoint(post.coordinates.latitude, post.coordinates.longitude),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        postid: postid,
        radius: post.radius || null,
        postcreatorid: postcreatorid,
        commented: true
      };

      commentcreatorinteractionref.set(itemToUpdate, {merge:true});
      await postref.update({comments: admin.firestore.FieldValue.increment(1)});

      console.log("Comment added and interactions updated successfully");

      const data = {
        username:info.data().username,
        profilephoto:info.data().profileImage,
      };

      const postphoto = post.contentType === "video" ? post.thumbnail : post.content[0];

      await sendUpdateToUser(postcreatorid, commentcreatorid, postid, data, postphoto, "comment", postcreatorid);
    } catch (error) {
      console.error("Error updating interactions or comments count:", error);
    }
    
    return null;
  });
exports.onPostsCall = functions.firestore.document("users/{userid}")
.onUpdate(async (info, context) => {
  const dataAfter = info.after.data();

  const dataBefore = info.before.data();

  const postcallbefore = dataBefore.postcall;
  const postcallAfter = dataAfter.postcall;

  if (postcallAfter === null || postcallAfter === undefined || postcallbefore) return;

  const userid = context.params.userid;
  const postlength = postcallAfter.postlength;

  try {
    if (!userid) {
      return console.log("id not found");
    }
    const userSnap = await db.collection("users").doc(userid).get();
    const userCoordinates = userSnap.data().coordinates;
    // Fetch posts with "latest" first
    let posts = await getAndFilterPosts(userid, "latest", 0, userCoordinates);
    console.log("length "+posts.length);

    // If we have less than 11 posts, fetch more from "old"
    if (posts.length < 11) {
      console.log("here "+posts.length);
      const additionalPosts = await getAndFilterPosts(userid, "old", 20 - posts.length, userCoordinates);
      posts = posts.concat(additionalPosts); // Append the additional posts
      console.log("additional "+additionalPosts.length + " and total "+ posts.length);
    }

     const seenIds = new Set();

    console.log(posts.length+" leth of the posts");

    posts = posts.map((post) => {
      // Rename 'postid' to 'id' if 'postid' exists
      if (Object.hasOwn(post, "postid")) {
        return {...post, id: post.postid};
      }
      return post;
    })
    .filter((post) => {
      // Keep only the first occurrence of each unique ID
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id);
        return true;
      }
      return false;
    });

    const seenPostsRef = db.collection("users").doc(userid).collection("seenposts");

    // Get the latest document in 'seenposts'
    const snapshot = await seenPostsRef.orderBy("createdAt", "desc").limit(1).get();

    // Process 'seenposts' and update accordingly
    if (!snapshot.empty) {
      const seenPostsData = snapshot.docs[0].data();
      const id = seenPostsData.id;
      let seenPosts = seenPostsData.posts;

      // Concatenate new posts if seenPosts is less than 1000
      if (seenPosts.length < 1000) {
        seenPosts = seenPosts.concat(posts);

        await seenPostsRef.doc(id).update({posts: seenPosts});
      } else {
        // Create a new document if the current one exceeds the limit
        await createNewSeenPostsDoc(seenPostsRef, posts);
      }
    } else {
      // If no seenposts doc exists, create a new one
      await createNewSeenPostsDoc(seenPostsRef, posts);
    }

    console.log("postlemgth "+postlength+ " posts"+posts.length);

    if (!snapshot.empty && postlength === 0 && (posts.length === 0 || posts.length < 12)) {
      const seenPostsData = snapshot.docs[0].data();
      const seenPosts = seenPostsData.posts || [];

      console.log("here");
      seenPosts.reverse();
      let extraposts = await getNearbyAndShuffle(seenPosts, userCoordinates, 40000);

      if (posts.length > 0) {
        // Step 1: Remove duplicates based on ID
        const postIds = new Set(posts.map((post) => post.id));
        extraposts = extraposts.filter((post) => !postIds.has(post.id));
    
        // Step 2: Shorten extraposts to match the remaining space
        const remainingSpace = 30 - posts.length;
        extraposts = extraposts.slice(0, remainingSpace);

        posts = [...posts, ...extraposts];
      } else {
        posts = extraposts;
      }
    }

    // Retrieve the full post data for the posts to return to the user
   
    const fullPosts = [];
    for (const post of posts) {
      console.log(JSON.stringify(post));
      const realPostRef = db.collection("users").doc(post.postcreatorid).collection("posts").doc(post.id || post.postid);
      const realPostSnap = await realPostRef.get();

      const usersnap = await db.collection("users").doc(post.postcreatorid).get();

      if (realPostSnap.exists) {
        const postData = realPostSnap.data();
        postData.username = usersnap.data().username;
        postData.profileImage = usersnap.data().profilephoto;
        postData.verified = usersnap.data().verified || false;
        fullPosts.push(postData);
      }
    }

    console.log("posts size: "+posts.length);
    // Return the full posts
  
    return {posts:fullPosts};
  } catch (error) {
    console.error("Error fetching posts:", error);
    return;
  }
});

exports.getPosts = functions.https.onCall(async (data, context) => {
  try {
    const {userid, postlength} = data;

    if (!userid) {
      return console.log("id not found");
    }
    const userSnap = await db.collection("users").doc(userid).get();
    const userCoordinates = userSnap.data().coordinates;
    
    // Fetch posts with "latest" first
    let posts = await getAndFilterPosts(userid, "latest", 0, userCoordinates);
    console.log("length "+posts.length);

    // If we have less than 11 posts, fetch more from "old"
    if (posts.length < 11) {
      console.log("here "+posts.length);
      const additionalPosts = await getAndFilterPosts(userid, "old", 20 - posts.length, userCoordinates);
      posts = posts.concat(additionalPosts); // Append the additional posts
      console.log("additional "+additionalPosts.length + " and total "+ posts.length);
    }

     const seenIds = new Set();

    console.log(posts.length+" leth of the posts");

    posts = posts.map((post) => {
      // Rename 'postid' to 'id' if 'postid' exists
      if (Object.hasOwn(post, "postid")) {
        return {...post, id: post.postid};
      }
      return post;
    })
    .filter((post) => {
      // Keep only the first occurrence of each unique ID
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id);
        return true;
      }
      return false;
    });

    const seenPostsRef = db.collection("users").doc(userid).collection("seenposts");

    // Get the latest document in 'seenposts'
    const snapshot = await seenPostsRef.orderBy("createdAt", "desc").limit(1).get();

    // Process 'seenposts' and update accordingly
    if (!snapshot.empty) {
      const batch = db.batch();
      const seenPostsData = snapshot.docs[0].data();
      const id = seenPostsData.id;
      const seenPosts = seenPostsData.posts;

      // Concatenate new posts if seenPosts is less than 1000
      if (seenPosts.length < 1000) {
        // Use push for better memory efficiency
        posts.forEach((post) => seenPosts.push(post));
        batch.update(seenPostsRef.doc(id), {posts: seenPosts});
        await batch.commit();
      } else {
        // Create a new document if the current one exceeds the limit
        await createNewSeenPostsDoc(seenPostsRef, posts);
      }
    } else {
      // If no seenposts doc exists, create a new one
      await createNewSeenPostsDoc(seenPostsRef, posts);
    }

    // console.log("postlength "+postlength+ " posts"+posts.length);

    if (!snapshot.empty && postlength === 0 && (posts.length === 0 || posts.length < 12)) {
      const seenPostsData = snapshot.docs[0].data();
      const seenPosts = seenPostsData.posts || [];

      console.log("here");

      seenPosts.reverse();
      let extraposts = await getNearbyAndShuffle(seenPosts, userCoordinates, 40000);

      if (posts.length > 0) {
        // Step 1: Remove duplicates based on ID
        const postIds = new Set(posts.map((post) => post.id));
        extraposts = extraposts.filter((post) => !postIds.has(post.id));
    
        // Step 2: Shorten extraposts to match the remaining space
        const remainingSpace = 30 - posts.length;
        extraposts = extraposts.slice(0, remainingSpace);

        posts = [...posts, ...extraposts];
      } else {
        posts = extraposts;
      }
    }

    // Optimize full post data retrieval with batched reads
    const fullPosts = await Promise.all(
      posts.map(async (post) => {
        const [realPostSnap, usersnap] = await Promise.all([
          db.collection("users")
            .doc(post.postcreatorid)
            .collection("posts")
            .doc(post.id || post.postid)
            .get(),
          db.collection("users")
            .doc(post.postcreatorid)
            .get()
        ]);

      if (realPostSnap.exists) {
        const postData = realPostSnap.data();
          const userData = usersnap.data();

          return {
            ...postData,
            username: userData.username,
            profileImage: userData.profilephoto,
            verified: userData.verified || false
          };
        }
        return null;
      })
    );

    // Filter out null values from failed retrievals
    const validPosts = fullPosts.filter(Boolean);

    // Check if we need to fetch businesses (after the 10th post or if there aren't many posts)
    if (userSnap.data().version === 5) {
      // After checking for events, also check for businesses
      const businessesGeoCollection = geofirestore.collection("businesses");

      const userLat = userCoordinates.latitude;
      const userLng = userCoordinates.longitude;

      const query = businessesGeoCollection.near({
        center: new admin.firestore.GeoPoint(userLat, userLng),
        radius: 3500, // Radius in kilometers (slightly larger than events)
      });

      // Fetch the nearest businesses, limit to 10
      const businessSnap = await query.limit(10).get();

      // Extract business data
      const businesses = businessSnap.docs.map((doc) => {
        const lat = doc.data().coordinates.latitude || doc.data().coordinates._latitude;
        const lng = doc.data().coordinates.longitude || doc.data().coordinates._longitude;

        const from = turf.point([userLng, userLat]);
        const to = turf.point([lng, lat]);
        const distance = turf.distance(from, to, {units: "kilometers"});

        return {id: doc.id, ...doc.data(),
        distance: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`,
        distanceValue: distance};
      });

      // If businesses were found, create an object
      if (businesses.length > 0) {
        // Sort by distance
        businesses.sort((a, b) => a.distanceValue - b.distanceValue);

        const businessesObject = {contentType: "business", businesses, id: "bus123"};

        // Determine insertion position
        if (validPosts.length > 3) {
          validPosts.splice(1, 0, businessesObject); // Insert after the 1st item
        } else {
          validPosts.push(businessesObject); // Add at the end
        }

        if (validPosts.length >= 10) {
          validPosts.splice(10, 0, {...businessesObject, id: getRandomString(10)}); // Insert after the 10th item
        } 

        if (validPosts.length >= 20) {
          validPosts.splice(20, 0, {...businessesObject, id: getRandomString(10)}); // Insert after the 10th item
        } 

        if (validPosts.length >= 30) {
          validPosts.splice(30, 0, {...businessesObject, id: getRandomString(10)}); // Insert after the 10th item
        } 


        console.log("Adding businesses:", JSON.stringify(businessesObject));
      }
    }

    if (userSnap.data().version === 5) {
      // Get events if any
      const eventsgeocollection = geofirestore.collection("events");

      const userLat = userCoordinates.latitude;
      const userLng = userCoordinates.longitude;

      const query = eventsgeocollection.near({
        center: new admin.firestore.GeoPoint(userLat, userLng),
        radius: 3500, // Radius in kilometers
      });

      // Fetch the nearest events, limit to 10
      const eventSnap = await query.limit(10).get();

      // Extract event data
      const events = eventSnap.docs.map((doc) => {
        const lat = doc.data().location.coordinates.latitude || doc.data().coordinates._latitude;
        const lng = doc.data().location.coordinates.longitude || doc.data().coordinates._longitude;

        const from = turf.point([userLng, userLat]);
        const to = turf.point([lng, lat]);
        const distance = turf.distance(from, to, {units: "kilometers"});

        return {id: doc.id, ...doc.data(),
        distance: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`,
        distanceValue: distance};
      });
      // If events were found, create an object
      if (events.length > 0) {
        events.sort((a, b) => a.distanceValue - b.distanceValue);

        const eventsObject = {contentType: "event", events, id:"id123"};

        // Determine insertion position
        if (validPosts.length > 5) {
          validPosts.splice(4, 0, eventsObject); // Insert after the 5th item
        } else {
          validPosts.push(eventsObject); // Add at the end
        }

        if (validPosts.length >= 15) {
          validPosts.splice(15, 0, {...eventsObject, id: getRandomString(10)}); // Insert after the 10th item
        } 

        if (validPosts.length >= 25) {
          validPosts.splice(25, 0, {...eventsObject, id: getRandomString(10)}); // Insert after the 10th item
        } 

        
        console.log(JSON.stringify(eventsObject));
      }
    }

    console.log("posts size: "+posts.length);
    // Return the full posts
    return {posts: validPosts};
  } catch (error) {
    console.error("Error fetching posts:", error);
    return;
  }
});

function getNearbyAndShuffle(list, center, radius = 40000) {
    // Early return for empty lists
    if (list.length === 0) return [];
    
    // Pre-calculate coordinates once
    const centerLat = center.latitude;
    const centerLng = center.longitude;
    
    // Use more efficient filtering and mapping
    const nearbyPosts = list.reduce((acc, item) => {
        if (!item.coordinates) return acc;
        
        const postLat = item.coordinates.latitude || item.coordinates._latitude;
        const postLng = item.coordinates.longitude || item.coordinates._longitude;
        
        // Use faster distance calculation for rough filtering
        const roughDistance = Math.abs(centerLat - postLat) + Math.abs(centerLng - postLng);
        
        // Only do precise calculation if rough estimate is within range
        if (roughDistance * 111000 <= radius * 1.5) {
            const itemPoint = turf.point([postLng, postLat]);
            const centerPoint = turf.point([centerLng, centerLat]);
            const distance = turf.distance(centerPoint, itemPoint, {units: "meters"});
            
            if (distance <= radius) {
                acc.push(item);
            }
        }
        return acc;
    }, []);
    
    // Limit to first 40 and use Fisher-Yates shuffle for better performance
    const limited = nearbyPosts.slice(0, 40);
  for (let i = limited.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [limited[i], limited[j]] = [limited[j], limited[i]];
  }

  return limited;
}
// Function to handle the logic
// async function handleSeenPostsUpdate(userId, posts) {
//   const seenPostsRef = db.collection("users").doc(userId).collection("seenposts");

//   await db.runTransaction(async (transaction) => {
//     // Get the latest document
//     const snapshot = await transaction.get(
//       seenPostsRef.orderBy("createdAt", "desc").limit(1)
//     );

//     if (!snapshot.empty) {
//       const latestDoc = snapshot.docs[0];
//       const latestDocRef = latestDoc.ref;
//       const seenPostsData = latestDoc.data();
//       let seenPosts = seenPostsData.posts;

//       if (seenPosts.length + posts.length <= 1000) {
//         // Update the existing document with new posts
//         seenPosts = seenPosts.concat(posts);
//         transaction.update(latestDocRef, {posts: seenPosts});
//       } else {
//         // Create a new document if the limit is exceeded
//         await createNewSeenPostsDoc(seenPostsRef, posts);
//       }
//     } else {
//       // If no documents exist, create the first one
//       await createNewSeenPostsDoc(seenPostsRef, posts);
//     }
//   });

//   return;
// }
// Function to handle the creation of a new seenposts document
async function createNewSeenPostsDoc(ref, posts) {
  const id = generateRandomString(21);
  const info = {
    id: id,
    posts: posts,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.doc(id).set(info);
}

// Function to filter and retrieve posts based on the given period ("latest" or "old")
async function getAndFilterPosts(userid, period, limit, userCoordinates) {
  // Cache for distance calculations
  const cachedDistances = new Map();
  const userLat = userCoordinates.latitude;
  const userLng = userCoordinates.longitude;
  const simulation = 4000000;

  // Fetch seen post IDs for this user and convert to Set for O(1) lookups
  const seenPostsSnap = await db.collection("users").doc(userid).collection("seenposts").get();
  const seenPostIds = new Set(seenPostsSnap.docs.flatMap((doc) => {
    const seenData = doc.data();
    return seenData.posts.map((post) => post.id || post.postid);
  }));

  // get blacklisted users
  const blackListedSnap = await db.collection("blacklisted").get();
  const blacklist = new Set(blackListedSnap.docs.flatMap((doc) => {
    const seenData = doc.data();
    return seenData.blacklist.map((deviceid) => deviceid);
  }));

  // Query nearby areas within 40km
  const query = geocollection.near({
    center: new admin.firestore.GeoPoint(userLat, userLng),
    radius: 1000, // Radius in kilometers
  });

  const snapshot = await query.get();

  let trendingPosts = [];
  let similarPosts = [];
  let regularPosts = [];
  let nearbysubsPosts = []; // Restored nearbysubsPosts array

  // Fetch user's post interactions (less than 3 days old)
  const now = admin.firestore.Timestamp.now();
  const threeDaysAgo = new admin.firestore.Timestamp(now.seconds - (3 * 24 * 60 * 60), now.nanoseconds);

  const sortedResults = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                const docCoords = data.coordinates; // Firestore GeoPoint
                
                // Create Turf.js points
                const from = turf.point([userLng, userLat]);
                const to = turf.point([docCoords.longitude, docCoords.latitude]);

                // Calculate distance in kilometers
                const distance = turf.distance(from, to, {units: "meters"});

                return {
                    ...data,
                    distance, // Attach computed distance
                };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 4);

  console.log("areas "+JSON.stringify(sortedResults.map((area) => {
    return {latitude:area.coordinates._latitude, longitude:area.coordinates._longitude};
  })));

  // console.log("areas", JSON.stringify(sortedResults));          

  for (const areaData of sortedResults) {
    const areaLat = areaData.coordinates.latitude || areaData.coordinates._latitude;
    const areaLng = areaData.coordinates.longitude || areaData.coordinates._longitude;
    const areaRadius = areaData.radius || 500;

    console.log("area info"+JSON.stringify(areaData));

    // Check if the user's area touches this area
    if (doCirclesTouch(userLat, userLng, simulation, areaLat, areaLng, areaRadius)) {
      const latestRef = db.collection("areas").doc(areaData.id).collection(period);
      
      console.log("area found");
      // Parallel fetch of trending and regular posts
      const [trendingSnap, otherDocsSnap] = await Promise.all([
        latestRef.doc("trending").get(),
        latestRef.where("id", "!=", "trending").get()
      ]);

      // Process regular posts
      if (!otherDocsSnap.empty) {
        for (const otherDoc of otherDocsSnap.docs) {
          const areaPosts = otherDoc.data().posts;

          // Optimize filtering with reduce to minimize iterations
          const filteredPosts = areaPosts.reduce((acc, post) => {
            if (acc.length >= 20) return acc; // Early return if we have enough posts
            
            if (post.postcreatorid === userid || seenPostIds.has(post.id) || blacklist.has(post.deviceid)) {
              return acc;
            }

            const minDistance = cachedDistances.get(post.id) || 
              getClosestDistance({latitude: userLat, longitude: userLng}, post);
            cachedDistances.set(post.id, minDistance);

            if (minDistance < simulation) {
              acc.push(post);
            }
            return acc;
          }, []);

          console.log("filtered posts "+JSON.stringify(filteredPosts));

          if (filteredPosts.length > 0 && regularPosts.length < 50) {
            // Sort by popularity and take up to 20 posts
            filteredPosts.sort((a, b) => b.popularity - a.popularity);
            regularPosts = regularPosts.concat(filteredPosts.slice(0, 20));
          }
        }
      }

      console.log("regular posts "+JSON.stringify(regularPosts));

      // Process trending posts
      if (trendingSnap.exists) {
        const areaTrendingPosts = trendingSnap.data().posts;
        
        // Optimize trending posts filtering
        const filteredTrending = areaTrendingPosts.reduce((acc, post) => {
          if (acc.length >= 5) return acc;
          
          const postId = post.id || post.postid;
          if (post.postcreatorid === userid || seenPostIds.has(postId) || blacklist.has(post.deviceid)) {
            return acc;
          }
          
          const minDistance = cachedDistances.get(postId) || 
            getClosestDistance({latitude: userLat, longitude: userLng}, post);
          cachedDistances.set(postId, minDistance);
          
          if (minDistance < simulation) {
            acc.push(post);
          }
          return acc;
        }, []);

        console.log("filtered trending "+JSON.stringify(filteredTrending));

        if (filteredTrending.length > 0) {
          filteredTrending.sort((a, b) => b.popularity - a.popularity);
          trendingPosts = trendingPosts.concat(filteredTrending.slice(0, 5));
        }
      }

      console.log("trending posts "+JSON.stringify(trendingPosts));
    }
  }

  // Optimize similar posts fetching
  if (limit === 0) {
  const interactionsRef = db.collection("users").doc(userid).collection("interactions");
  const interactionsSnap = await interactionsRef
      .where("createdAt", ">=", threeDaysAgo)
  .orderBy("createdAt", "desc")
      .where("interacted", "==", true)
      .limit(5)
  .get();

    // console.log("size of interactions "+interactionsSnap.docs.length);

    // Parallel fetch of similar posts
    const similarQueries = interactionsSnap.docs.map((interactionDoc) => {
      const data = interactionDoc.data();
      return db.collection("users")
        .doc(data.postcreatorid)
        .collection("posts")
        .doc(data.postid)
        .collection("similar")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    });

    const similarSnapshots = await Promise.all(similarQueries);

    // Process similar posts
    for (const snap of similarSnapshots) {
        if (!snap.empty) {
        const doc = snap.docs[0];
        const similarPostsArray = doc.data().posts;
        similarPostsArray.sort((a, b) => b.createdAt - a.createdAt);

        // Optimize similar posts filtering
        const filteredSimilarPosts = similarPostsArray.reduce((acc, post) => {
          if (acc.length >= 5) return acc;
          
                const postId = post.postid || post.id || "";
          if (seenPostIds.has(postId) || post.postcreatorid === userid || blacklist.has(post.deviceid)) return acc;

          const postDate = post.createdAt && post.createdAt.toDate ? 
            post.createdAt.toDate() : new Date(0);
          
          const minDistance = cachedDistances.get(postId) || 
            getClosestDistance({latitude: userLat, longitude: userLng}, post);
          cachedDistances.set(postId, minDistance);
          
          if (minDistance < simulation) {
            acc.push({
              ...post,
              createdAt: postDate
            });
            acc.sort((a, b) => b.createdAt - a.createdAt);
          }
          return acc;
        }, []);

        console.log("filtered similar "+JSON.stringify(filteredSimilarPosts));

              similarPosts = similarPosts.concat(filteredSimilarPosts);
      }
    }
  }

  // Restore and optimize nearby subscribed posts fetching
  if (limit === 0) {
    console.log("starting posts subscriptions");
    const subsPostsRef = db.collection("users").doc(userid).collection("postsubscriptions");
    const subsPostSnapshot = await subsPostsRef.where("createdAt", ">=", threeDaysAgo).get();

    if (!subsPostSnapshot.empty) {
      // Optimize filtering with reduce
      nearbysubsPosts = subsPostSnapshot.docs.reduce((acc, doc) => {
        const postSubsData = doc.data();
        const postId = postSubsData.postid || postSubsData.id;
        
        // Early return conditions
        if (postSubsData.postcreatorid === userid || seenPostIds.has(postId) || blacklist.has(postSubsData.deviceid)) {
          return acc;
        }

        const minDistance = cachedDistances.get(postId) || 
          getClosestDistance({latitude: userLat, longitude: userLng}, postSubsData);
        cachedDistances.set(postId, minDistance);

        if (minDistance < simulation) {
          acc.push(postSubsData);
        }
        return acc;
      }, []);
    }
    // console.log("nearby posts "+nearbysubsPosts.length);
  }

  // Restore post normalization and combining logic
  const normalizePosts = (posts) => {
    return posts.map((post) => ({
      ...post,
      id: post.id || post.postid, // Normalize the identifier
    }));
  };
  
  const takePosts = (source, maxToTake, existingIds) => {
    const normalizedSource = normalizePosts(source);

    // Remove duplicates within the same source
    const uniqueSource = normalizedSource.filter(
      (post, index, self) =>
        index === self.findIndex((p) => p.id === post.id) // Keep the first occurrence
    );

    const filteredSource = uniqueSource.filter(
      (post) => !existingIds.has(post.id) // Exclude duplicates
    );
    const postsToTake = filteredSource.slice(0, maxToTake);
  
    // Add the new IDs to the existing set
    postsToTake.forEach((post) => existingIds.add(post.id));

    console.log("post to take "+JSON.stringify(postsToTake));

    return postsToTake;
  };
  
  const fillPosts = (currentPosts, sources, maxPosts) => {
    let totalPosts = currentPosts; // Normalize existing posts
    const existingIds = new Set(); // Track unique IDs
  
    let remainingSpace = maxPosts - totalPosts.length;
  
    for (const source of sources) {
      if (remainingSpace <= 0) break; // Stop if we've reached the max limit
      const postsToAdd = takePosts(source, remainingSpace, existingIds);
      totalPosts = totalPosts.concat(postsToAdd);
      remainingSpace -= postsToAdd.length;
    }
  
    return totalPosts;
  };
  
  // Example usage
  const maxPosts = 20;
  const sources = [trendingPosts, similarPosts, nearbysubsPosts, regularPosts];
  const totalPosts = fillPosts([], sources, maxPosts);
  
  if (limit !== 0) {
    // console.log("limit "+totalPosts.length + " and limit is "+ limit);
    return totalPosts.slice(0, limit);
  }

  // console.log(totalPosts.length+"length of total list");
  return totalPosts;
}


/**
 * Calculate the minimum distance between user coordinates and post (main or reposts).
 *
 * @param {Object} userCoordinates - User's latitude and longitude {latitude, longitude}.
 * @param {Object} post - Post object containing coordinates and reposts.
 * @return {number} - The minimum distance in meters.
 */
 function getClosestDistance(userCoordinates, post) {
  const {latitude: userLat, longitude: userLng} = userCoordinates;

  // Extract main post coordinates
  const {latitude: postLat, longitude: postLng} = post.coordinates;

  // Calculate distance to the main post coordinates
  const postDistance = turf.distance(
    [userLng, userLat],
    [postLng, postLat],
    {units: "meters"}
  );

  // Extract reposts (if any)
  const reposts = post.reposts || [];

  // Find the closest repost distance
  const closestRepost = reposts.reduce((closest, repost) => {
    const repostDistance = turf.distance(
      [userLng, userLat],
      [repost.longitude, repost.latitude],
      {units: "meters"}
    );

    return !closest || repostDistance < closest.distance ?
      {distance: repostDistance} :
      closest;
  }, null);

  // Compare distances: main post vs closest repost
  return closestRepost ? Math.min(postDistance, closestRepost.distance) : postDistance;
}


exports.getExtraStories = functions.https.onRequest(async (req, res) => {
  try {
    const {id} = req.body; // Get user ID from the request body

    if (!id) {
      return res.status(400).send("Invalid request, missing user ID.");
    }

    // Fetch user settings to check if they want stories by latest or random
    const userSettingsRef = firestore.collection("users").doc(id);
    const userSettingsSnap = await userSettingsRef.get();

    if (!userSettingsSnap.exists) {
      return res.status(404).send("User settings not found.");
    }

    const userSettings = userSettingsSnap.data();
    const sortBy = userSettings.sortBy || "latest"; // Default to 'latest' if no preference

    // Reference to unseenStories collection
    const unseenStoriesRef = firestore.collection("users").doc(id).collection("unseenstories");

    // Fetch all unseen stories
    const unseenStoriesSnapshot = await unseenStoriesRef.get();
    let unseenStories = unseenStoriesSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

    // Sort by 'latest' or 'random'
    if (sortBy === "latest") {
      unseenStories = unseenStories.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    } else if (sortBy === "random") {
      unseenStories = unseenStories.sort(() => Math.random() - 0.5);
    }

    // Get the first 10 unseen stories based on sorting preference
    const storiesToSend = unseenStories.slice(0, 10);
    
    // If there are no unseen stories, return an empty array
    if (storiesToSend.length === 0) {
      return res.status(200).json([]);
    }

    // Batch to delete the 10 fetched unseen stories
    const batchDelete = firestore.batch();

    storiesToSend.forEach((story) => {
      const storyRef = unseenStoriesRef.doc(story.id);
      batchDelete.delete(storyRef);
    });

    // Commit the delete batch
    await batchDelete.commit();

    // Return the 10 unseen stories to the user
    res.status(200).json(storiesToSend);
  } catch (error) {
    console.error("Error fetching unseen stories:", error);
    res.status(500).send("Error fetching unseen stories");
  }
});


exports.getStoriesNearby = functions.https.onRequest(async (req, res) => {
  try {
    const {id} = req.body; // Parse the coordinates and user ID

    if (!id) {
      return res.status(400).send("Invalid request, missing coordinates or id.");
    }

    // Fetch user settings to check if they want stories by latest or random
    const userSettingsRef = firestore.collection("users").doc(id);
    const userSettingsSnap = await userSettingsRef.get();

    if (!userSettingsSnap.exists) {
      return res.status(404).send("User settings not found.");
    }
    const userSettings = userSettingsSnap.data();
    const sortBy = userSettings.sortstoriesBy || "random"; // Default to 'latest' if no preference

    const latitude = userSettings.coordinates.latitude;
    const longitude = userSettings.coordinates.longitude;

    console.log("longitude "+longitude + "lat "+ latitude);

    // Initialize GeoFirestore and query nearby stories (limit 70)
    const geoFirestore = new GeoFirestore(firestore);
    const geocollection = geoFirestore.collection("storiesnearby");
    const query = geocollection.near({
      center: new admin.firestore.GeoPoint(latitude, longitude),
      radius: 500, // Radius in km
    });

    const storiesNearby = await query.get();

    if (storiesNearby.empty) {
      console.log("empty");
    }

    const storiesArray = storiesNearby.docs
    .map((doc) => ({id: doc.id, ...doc.data()}))
    .filter((data) => data.creatorid !== id);


    let finalStories;

    console.log("stories array +"+storiesArray);

    if (sortBy === "latest") {
      // Sort by latest (by createdAt timestamp)
      finalStories = storiesArray.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    } else if (sortBy === "random") {
      // Shuffle array for random sorting
      finalStories = storiesArray.sort(() => Math.random() - 0.5);
    }

    // Get the first 10 stories based on sorting preference
    const first10Stories = finalStories.slice(0, 30);

    // Remaining stories to store in unseenStories collection
    const remainingStories = finalStories.slice(30);

    const unseenStoriesRef = firestore.collection("users").doc(id).collection("unseenstories");

    // Fetch all documents in unseenStories and delete them
    const unseenStoriesSnapshot = await unseenStoriesRef.get();
    const batchDelete = firestore.batch();

    unseenStoriesSnapshot.forEach((doc) => {
      batchDelete.delete(doc.ref);
    });

    // Commit the delete batch
    await batchDelete.commit();

    // After clearing the unseenStories collection, add the new remaining stories
    const batchSet = firestore.batch();

    remainingStories.forEach((story) => {
      const storyRef = unseenStoriesRef.doc(story.id);
      batchSet.set(storyRef, story);
    });

    // Commit the batch write to add the new stories
    await batchSet.commit();

    console.log("stories "+first10Stories);
    // Return the first 10 stories to the user
    res.status(200).json({stories:first10Stories});
  } catch (error) {
    console.error("Error fetching nearby stories:", error);
    res.status(500).send("Error fetching data");
  }
});


// Schedule the function to run every hour
exports.onStoryAdded = functions.firestore.document("users/{userid}/stories/{storyid}")
.onCreate(async (data, context)=>{
  const storyInfo = data.data();
  const storyid = context.params.storyid;
  const userid = context.params.userid;
  // get user info
  const userInfoSnap = await db.collection("users").doc(userid).get();
  const userData = userInfoSnap.data();

  const coordinates = storyInfo.coordinates;

  const geoFirestore = new GeoFirestore(firestore);

  const storiesnearbyGeoCollection = geoFirestore.collection("storiesnearby");

  const query = storiesnearbyGeoCollection.near(
    {center: new admin.firestore.GeoPoint(coordinates.latitude, coordinates.longitude),
    radius: 1} // changed 0.2
  );

  const storiesnearbySnap = await query.get();

  if (storiesnearbySnap.empty) {
    console.log("stories empty");
  }
  let seriesId;

  console.log("array "+storiesnearbySnap.docs);

 // Filter to only include documents where creatorid matches userid
  const nearbyStories = storiesnearbySnap.docs.filter((doc) => {
    return doc.data().creatorid === userid;
  });

  console.log("nearby "+nearbyStories);

  if (nearbyStories.length > 0) {
    const nearbyStoriesData = nearbyStories[0].data();
    seriesId = nearbyStoriesData.id;
    await db.collection("storiesnearby").doc(seriesId).update({stories: admin.firestore.FieldValue.arrayUnion(storyInfo),});
  } else {
    const storiesSeries = {
      coordinates:new admin.firestore.GeoPoint(coordinates.latitude, coordinates.longitude),
      creatorid:userid,
      stories:[storyInfo],
      createdAt:admin.firestore.FieldValue.serverTimestamp(),
      username:userData.username,
      verified:userData.verified || false,
      userProfileImage:userData.profilephoto
    };
    const Status = await storiesnearbyGeoCollection.add(storiesSeries);

    seriesId = Status.id;
    await storiesnearbyGeoCollection.doc(Status.id).update({id:seriesId});
  }

  await db.collection("users").doc(userid).collection("activestories").doc(storyid).set(storyInfo);

  // update series id to story doc
  await data.ref.update({seriesid:seriesId});

  const taskData = {
    creatorid:userid,
    storyseriesid:seriesId,
    storyid:storyid
  };

  await createTask(taskData, 86000);

  return null;
});

async function createTask(data, delaySeconds) {
  const project = "flaya-9ebb2"; // Replace with your GCP project ID
  const location = "us-central1"; // Replace with your GCP location (e.g., 'us-central1')
  const queue = "scheduleStoryTTL"; // Replace with your Task Queue name

  const payload = {...data}; // Payload sent to the function (document ID)
  
  // Construct the fully qualified queue name

  const taskClient = new CloudTasksClient();
  const parent = taskClient.queuePath(project, location, queue);

  const taskName = `projects/${project}/locations/${location}/queues/${queue}/tasks`;

  // Create the task with the delay
  const task = {
    name:`${taskName}/myTask-${data.storyid}-${delaySeconds}`,
    httpRequest: {
      httpMethod: "POST",
      url: `https://${location}-${project}.cloudfunctions.net/ScheduleStoryDissapear?storyid=${data.storyid}`,
      body: Buffer.from(JSON.stringify(payload)).toString("base64"), // Encode payload as base64
      headers: {"Content-Type": "application/json"},
    },
  
    scheduleTime: {
      seconds: delaySeconds + (Date.now() / 1000), // Schedule the task in the future
    },
  };
  // Create the task
  return taskClient.createTask({parent, task});
}

exports.ScheduleStoryDissapear = functions.https.onRequest(async (req, res) => {
  const {storyid, storyseriesid, creatorid} = req.body;

  console.log(JSON.stringify(req.body));

  try {
    const docRef = db.collection("storiesnearby").doc(storyseriesid);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      res.status(404).send("Document not found");
      return;
    }

    const docData = docSnapshot.data();

    const stories = docData.stories;

    const itemToRemove = stories.find((item) => item.threadId === storyid);

    if (itemToRemove) {
      // Remove the item from the array
      await docRef.update({
        stories: admin.firestore.FieldValue.arrayRemove(itemToRemove),
       // seriesid:storyseriesid
      });

      if (stories.length === 1) {
        await docRef.delete();
      }

      console.log("Item removed from array");
    } 

    await db.collection("users").doc(creatorid).collection("activestories").doc(storyid).delete();

    res.status(200).send(`Story ${storyid} processed successfully`);
  } catch (error) {
    console.error("Error processing document:", error);
    res.status(500).send("Error processing document");
  }
});


exports.cleanupOldPosts = functions.pubsub.schedule("every 2 minutes").onRun(async (context) => {
  try {
    const areasSnapshot = await db.collection("areas").get();
    const now = admin.firestore.Timestamp.now().toMillis();
    const threeDaysAgo = now - THREE_DAYS_MS;

    // Iterate over each document in the 'areas' collection
    await Promise.all(areasSnapshot.docs.map(async (areaDoc) => {
      const latestRef = db.collection("areas").doc(areaDoc.id).collection("latest");
      const latestSnapshot = await latestRef.get();

      await Promise.all(latestSnapshot.docs.map(async (latestDoc) => {
        const latestData = latestDoc.data();
        const posts = latestData.posts || [];

        // Separate posts older than 3 days
        const oldPosts = posts.filter((post) => post.createdAt.toMillis() < threeDaysAgo);
       // const recentPosts = posts.filter((post) => post.createdAt.toMillis() >= threeDaysAgo);

        if (oldPosts.length > 0) {
          // Store removed posts in the 'old' subcollection
          await storeOldPosts(areaDoc.id, oldPosts, latestDoc.id);


          // Update latest document with recent posts using a transaction
          await admin.firestore().runTransaction(async (transaction) => {
            const latestDocRef = latestRef.doc(latestDoc.id);
            const doc = await transaction.get(latestDocRef);

            if (!doc.exists) {
              throw new Error("Document does not exist!");
            }

            const currentPosts = doc.data().posts || [];
            const updatedPosts = currentPosts.filter((post) => post.createdAt.toMillis() >= threeDaysAgo);

            // Update the posts field with the filtered posts
            transaction.update(latestDocRef, {posts: updatedPosts});
          });
        }
      }));
    }));

    console.log("Old posts cleanup completed.");
  } catch (error) {
    console.error("Error cleaning up old posts: ", error);
  }
});


exports.onSubscribed = functions.firestore
  .document("users/{userid}/subscribers/{subscriberid}")
  .onCreate(async (data, context) => {
    const subscriberid = context.params.subscriberid;
    const userid = context.params.userid;

    const userRef = db.collection("users").doc(userid);
    const oppuserref = db.collection("users").doc(subscriberid);
    const subscriberRef = db
      .collection("users")
      .doc(subscriberid)
      .collection("subscribed")
      .doc(userid);

      
    try {
      // Step 1: Get data of the subscribed user
      const subscribedSnap = await userRef.get();
      // Get data of the subscriber
      const subscribersnap = await oppuserref.get();
      if (!subscribedSnap.exists) {
        console.error(`User with ID ${userid} does not exist`);
        return;
      }
      const subscribedData = subscribedSnap.data();

      // Step 2: Increment the subscribed user's radius
      await userRef.update({radius: admin.firestore.FieldValue.increment(20), popularity:admin.firestore.FieldValue.increment(10)});

      const reference = db.collection("users").doc(subscriberid).collection("subscribers").doc(userid);
      const confirmationSnap = await reference.get();

      if (confirmationSnap.exists) {
        const subscriberRef1 = db
          .collection("users")
          .doc(userid)
          .collection("subscribed")
          .doc(subscriberid);
          await subscriberRef1.update({mutual:true});
      }
      // Step 3: Add the subscribed user's info to the subscriber's "subscribed" collection
      const subscribedUserInfo = {
        profilephoto: subscribedData.profilephoto,
        username: subscribedData.username,
        mutual:confirmationSnap.exists,
        name:subscribedData.name,
        id: userid,
        createdAt:admin.firestore.FieldValue.serverTimestamp()
      };

      // send update
      await sendSubscriberUpdateToUser(subscriberid, userid, data.data(), confirmationSnap.exists);

      await data.ref.update({name:subscribersnap.data().name});
      await subscriberRef.set(subscribedUserInfo);
      console.log(`Subscriber ${subscriberid} successfully subscribed to user ${userid}`);
      return null; // Returning null to indicate success
    } catch (error) {
      console.error("Error during subscription:", error);
      return null; // Handle errors by returning null or using a custom error response
    }
  });

  // send update to subscibed user that there is new subscription
  async function sendSubscriberUpdateToUser(subscriberid, subscribedToid, subscriberInfo, mutual) {
      // send updates to the user
      const userUpdatesRef = db.collection("users").doc(subscribedToid).collection("updates");

      const info = {
        id:subscriberid,
        username:subscriberInfo.username,
        mutual: mutual,
        senderid:subscriberid,
        profilephoto: subscriberInfo.profilephoto,
        postType:"subscription",
        message:"subscribed to you",
        timestamp:admin.firestore.FieldValue.serverTimestamp()
      };

     await userUpdatesRef.doc(subscriberid).set(info);
  }

  exports.onUnSubscribed = functions.firestore
  .document("users/{userid}/subscribers/{subscriberid}")
  .onDelete(async (change, context) => {
    const subscriberid = context.params.subscriberid;
    const userid = context.params.userid;

    const userRef = db.collection("users").doc(userid);
    const subscriberRef = db
      .collection("users")
      .doc(subscriberid)
      .collection("subscribed")
      .doc(userid);

    try {
      // Step 1: Decrement the subscribed user's radius
      await userRef.update({
        radius: admin.firestore.FieldValue.increment(-20),
      });

      console.log(`Radius for user ${userid} decremented by 20 due to unsubscription by ${subscriberid}`);

      // Step 2: Remove the user's entry from the subscriber's "subscribed" collection
      await subscriberRef.delete();
      console.log(`User ${userid} removed from subscriber ${subscriberid}'s subscribed list`);


      const reference = db.collection("users").doc(subscriberid).collection("subscribers").doc(userid);
      const confirmationSnap = await reference.get();

      if (confirmationSnap.exists) {
        const subscriberRef1 = db
          .collection("users")
          .doc(userid)
          .collection("subscribed")
          .doc(subscriberid);

          await subscriberRef1.update({mutual:false});
      }

      return null; // Returning null to indicate success
    } catch (error) {
      console.error("Error during unsubscription:", error);
      return null; // Return null or use custom error handling logic
    }
  });


async function storeOldPosts(areaId, removedPosts, id) {
  try {
    const oldRef = db.collection("areas").doc(areaId).collection("old");
    await Promise.all(
      removedPosts.map((post) => {
        const ref = db.collection("users").doc(post.postcreatorid).collection("posts").doc(post.id);
        return ref.update({period: "old"});
      })
    );

    if (id === "trending") {
      await oldRef.doc(id).set({
        posts: admin.firestore.FieldValue.arrayUnion(...removedPosts),
      }, {merge: true});
    } else {
    // Fetch documents in the 'old' subcollection, order by createdAt
    const oldDocsSnapshot = await oldRef.orderBy("createdAt", "desc").get();

    let remainingPosts = [...removedPosts];

    // Try to fill the latest document first
    if (!oldDocsSnapshot.empty) {
      const latestOldDoc = oldDocsSnapshot.docs[0];
      const latestOldDocData = latestOldDoc.data();
      const currentPosts = latestOldDocData.posts || [];

      // Check if the latest document has space for more posts
      if (currentPosts.length < MAX_POSTS_PER_DOC) {
        const spaceLeft = MAX_POSTS_PER_DOC - currentPosts.length;
        const postsToAdd = remainingPosts.slice(0, spaceLeft);
        remainingPosts = remainingPosts.slice(spaceLeft); // Remove added posts from remaining

        // Update the latest document with the new posts
        await oldRef.doc(latestOldDoc.id).update({
          posts: admin.firestore.FieldValue.arrayUnion(...postsToAdd),
        });
      }
    }

    // If there are still remaining posts, create new documents
    while (remainingPosts.length > 0) {
      const postsForNewDoc = remainingPosts.slice(0, MAX_POSTS_PER_DOC);
      remainingPosts = remainingPosts.slice(MAX_POSTS_PER_DOC);

      // Create a new document in the 'old' subcollection with remaining posts

      const id = generateRandomString(21);

      await oldRef.doc(id).set({
        posts: postsForNewDoc,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        id:id
      });
    }

    console.log("Old posts successfully stored.");
    }
  } catch (error) {
    console.error("Error storing old posts: ", error);
  }
}

async function storeLikerInPeopleLiked(postRef, interactingUserInfo) {
  await admin.firestore().runTransaction(async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists) throw new Error("Post not found");
  
    const peopleliked = postDoc.data().peopleliked || [];
  
    // Create a new user object
    const newUser = {
      name: interactingUserInfo.username,
      id: interactingUserInfo.uid,
      profileImage: interactingUserInfo.profilephoto,
      popularity: interactingUserInfo.popularity,
    };
  
    // Check if the user is already in peopleliked
    const existingIndex = peopleliked.findIndex((user) => user.id === newUser.id);
    if (existingIndex !== -1) return; // Already liked, do nothing
  
    if (peopleliked.length < 6) {
      // Less than 6 users, add new user and sort by popularity (desc)
      peopleliked.push(newUser);
    } else {
      // More than or equal to 6, find the least popular user
      peopleliked.sort((a, b) => b.popularity - a.popularity); // Ensure sorted
      const leastPopularUser = peopleliked[peopleliked.length - 1];
  
      // If new user is more popular, replace the least popular one
      if (newUser.popularity > leastPopularUser.popularity) {
        peopleliked[peopleliked.length - 1] = newUser;
      }
    }
  
    // Always sort in descending order based on popularity
    peopleliked.sort((a, b) => b.popularity - a.popularity);
  
    // Update Firestore
    transaction.update(postRef, {peopleliked});
  });
}


exports.OnUserInteracted = functions.firestore
  .document("users/{userid}/interactions/{postid}")
  .onWrite(async (change, context) => {
    const {userid: interactingUserId, postid} = context.params;

    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;

    if (!afterData) {
      return null; // Document was deleted, no need to process
    }

    // Extract interaction fields and post creator info
    const {viewed: viewedBefore = false, liked: likedBefore = false, sharings: sharingsBefore, shared: sharedBefore = false, viewed:viewtimebefore} = beforeData || {};
    const {viewed: viewedAfter, liked: likedAfter, sharings:sharingsAfter, shared: sharedAfter, viewtime, postcreatorid, interacted: interactedAfter, commented: commentedafter} = afterData;

    // Fetch interacting user's details (assuming you want to store their name, etc.)
    const interactingUserRef = admin.firestore().doc(`users/${interactingUserId}`);
    const interactingUserDoc = await interactingUserRef.get();
    const interactingUserInfo = interactingUserDoc.exists ? interactingUserDoc.data() : {};

    // Reference to the post document under the post creator's user document
    const postRef = admin.firestore().doc(`users/${postcreatorid}/posts/${postid}`);
    
    const postUpdateData = {};
    
    // Update views, likes, or shares based on the changes
    if (!viewedBefore && viewedAfter) {
      const viewsRef = admin.firestore().doc(`users/${postcreatorid}/posts/${postid}/views/${interactingUserId}`);
      await viewsRef.set({name: interactingUserInfo.name, viewtime:viewtime||2000}, {merge: true});

      // Increment views count
      postUpdateData.views = admin.firestore.FieldValue.increment(1);
    } else {
      if (viewtimebefore !== viewtime) {
        const viewsRef = admin.firestore().doc(`users/${postcreatorid}/posts/${postid}/views/${interactingUserId}`);
        await viewsRef.set({name: interactingUserInfo.name, viewtime: viewtime || 2000}, {merge: true});
      }
    }

    if (!likedBefore && likedAfter) {
      const likesRef = admin.firestore().doc(`users/${postcreatorid}/posts/${postid}/likes/${interactingUserId}`);
      await likesRef.set({name: interactingUserInfo.name}, {merge: true});

      console.log("likrd");
      // update likes to profile
      const ref = db.collection("users").doc(postcreatorid);
      await ref.update({likes:admin.firestore.FieldValue.increment(1), popularity:admin.firestore.FieldValue.increment(1)});

      // Increment likes count
      postUpdateData.likes = admin.firestore.FieldValue.increment(1);
      
      // postUpdateData.peopleliked = admin.firestore.FieldValue.arrayUnion({name:interactingUserInfo.username, id:interactingUserInfo.uid, profileImage:interactingUserInfo.profilephoto, popularity:interactingUserInfo.popularity});
    }

    if (!sharingsBefore && sharingsAfter) {
      console.log("sharings");
      // update sharings to profile
      const ref = db.collection("users").doc(postcreatorid);
      await ref.update({sharings:admin.firestore.FieldValue.increment(1), popularity:admin.firestore.FieldValue.increment(1)});

      // Increment likes count
      postUpdateData.sharings = admin.firestore.FieldValue.increment(1);
    }


    if (!sharedBefore && sharedAfter) {
      const sharesRef = admin.firestore().doc(`users/${postcreatorid}/posts/${postid}/shares/${interactingUserId}`);
      await sharesRef.set({name: interactingUserInfo.name}, {merge: true});

      // update likes to profile
      const ref = db.collection("users").doc(postcreatorid);
      await ref.update({popularity:admin.firestore.FieldValue.increment(1)});

      // Increment likes count
      postUpdateData.shares = admin.firestore.FieldValue.increment(1);

      const postinfo = {
        createdAt:afterData.createdAt,
        distance:afterData.radius,
        id:afterData.postid,
        postcreatorid:afterData.postcreatorid
      };

      await onPostShared(afterData.postid, interactingUserId, afterData.radius, postinfo);
    }

    // Determine if 'interacted' should be set to true
    const shouldSetInteracted = (likedAfter || sharedAfter || commentedafter || sharingsAfter || viewtime > 5000);

    // Update 'interacted' field if necessary
    if (!interactedAfter && shouldSetInteracted) {
      const interactionRef = admin.firestore().doc(`users/${interactingUserId}/interactions/${postid}`);
      await interactionRef.update({interacted: true});

      postUpdateData.interactions = admin.firestore.FieldValue.increment(1);

      // get deviceid of the post creator
      const postcreatorSnapInfo = await db.collection("users").doc(afterData.postcreatorid).get();


      const dataToUploadToSimilar = {
        coordinates:afterData.coordinates,
        postcreatorid:afterData.postcreatorid,
        postid:postid,
        deviceid:postcreatorSnapInfo.devicecreatorid || "deviceid",
        distance:afterData.radius,
        createdAt:afterData.createdAt
      };

      await updateInteractedPosts(dataToUploadToSimilar, interactingUserId);
    }
   
    console.log("before "+likedBefore +" shared "+interactedAfter);

    console.log("keys "+JSON.stringify(postUpdateData)+ "and "+Object.keys(postUpdateData).length);
    // Update the post document with any necessary increments
    if (Object.keys(postUpdateData).length > 0) {
      console.log("updating with new info");
      await postRef.update(postUpdateData);
    }

    console.log(`Post ${postid} under user ${postcreatorid} successfully updated with interaction by user ${interactingUserId}`);

    return null;


    async function onPostShared(postid, userid, postradius, postinfo) {
      const usersnap = await db.collection("users").doc(userid).get();

      const coordinates = usersnap.data().coordinates;

      postinfo.coordinates = coordinates;
      // Looking for the post in the areas
      const postInAreasSnapShot = await db.collectionGroup("posts").
      where("id", "==", postid).where("isArea", "==", true).get();

      const areaidsAndPeriods = [];

      // Getting the areaids and periods of the areas that have the post
      postInAreasSnapShot.docs.forEach((doc)=>{
        const data = doc.data();

        areaidsAndPeriods.push({areaid:data.areaid, period:data.period});
      });


      for (const areaAndPeriod of areaidsAndPeriods) {
        const areadocsref = admin.firestore()
            .collection("areas")
            .doc(areaAndPeriod.areaid)
            .collection(areaAndPeriod.period);
    
        await admin.firestore().runTransaction(async (transaction) => {
            const snapshot = await transaction.get(areadocsref);
            let foundPost = null;
            let foundDocId = null;
            let updatedDocData = null;
    
            // Replace forEach with a for...of loop to allow breaking
            for (const doc of snapshot.docs) {
                const docData = doc.data();
    
                if (Array.isArray(docData.posts)) {
                    for (let i = 0; i < docData.posts.length; i++) {
                        if (docData.posts[i].id === postid) {
                            foundPost = {...docData.posts[i]};
                            foundDocId = doc.id;
    
                            // Ensure reposts array exists
                            foundPost.reposts = foundPost.reposts || [];
                            foundPost.reposts.push(coordinates);
    
                            docData.posts[i] = foundPost;
                            updatedDocData = docData;
                            break; // Exit inner loop
                        }
                    }
                }
    
                if (foundPost) break; // Exit outer loop if post is found
            }
    
            if (foundPost && foundDocId && updatedDocData) {
                const docRef = areadocsref.doc(foundDocId);
                transaction.update(docRef, {posts: updatedDocData.posts});
    
                console.log(`✅ Post updated with new repost in document ${foundDocId}`);
                return {documentId: foundDocId, updatedPost: foundPost};
            } else {
                console.log("⚠️ Post not found.");
                return null;
            }
        });
      }
    

      // // Looping through the areaids and periods of the areas that have the post
      // for (const areaAndPeriod of areaidsAndPeriods) {
      //   const areadocsref = db.collection("areas").doc(areaAndPeriod.areaid).collection(areaAndPeriod.period);
        
      //   await admin.firestore().runTransaction(async (transaction) => {
      //     const snapshot = await areadocsref.get(); 
      
      //     let foundPost = null;
      //     let foundDocId = null;
      //     let updatedDocData = null;
      //     // Loop through the docs
      //     snapshot.forEach((doc) => {
      //       const docData = doc.data();
      
      //       // Loop through the posts array to find the matching post by id
      //       if (docData.posts && Array.isArray(docData.posts)) {
      //         for (let i = 0; i < docData.posts.length; i++) {
      //           if (docData.posts[i].id === postid) {
      //             foundPost = docData.posts[i];
      //             foundDocId = doc.id;
      
      //             // Step 1: Update or create the reposts array
      //             if (foundPost.reposts && Array.isArray(foundPost.reposts)) {
      //               foundPost.reposts.push(coordinates); // Push the new repost object
      //             } else {
      //               foundPost.reposts = [coordinates]; // Create the reposts array with the new object
      //             }
      
      //             // Step 2: Replace the updated post in the posts array
      //             docData.posts[i] = foundPost; // Update the post object in the array
      
      //             updatedDocData = docData; // Save the updated document data for Firestore update
      //             break; // Stop once we find the post
      //           }
      //         }
      //       }
      //     });
      
      //     if (foundPost && foundDocId && updatedDocData) {
      //       // Step 3: Update the document within the transaction
      //       const docRef = areadocsref.doc(foundDocId);
      //       transaction.update(docRef, {posts: updatedDocData.posts});
      
      //       console.log(`Post updated with new repost in document ${foundDocId}`);
      //       return {documentId: foundDocId, updatedPost: foundPost};
      //     } else {
      //       console.log("Post not found.");
      //       return null;
      //     }
      //   });
      // }
     
     // Search nearby areas
     const query = geocollection.near({
      center: new admin.firestore.GeoPoint(coordinates.latitude, coordinates.longitude),
      radius: 1.5, // Radius in kilometers
    });

    const snapshot = await query.get();

    // Filter and return the results
    const touchingCircles = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const areaLat = data.coordinates.latitude;
          const areaLng = data.coordinates.longitude;
          const areaRadius = data.radius || 500;

          // Check if the circles touch or overlap and if already post is in the area
         if (doCirclesTouch(coordinates.latitude, coordinates.longitude, postradius, areaLat, areaLng, areaRadius) &&
         !areaidsAndPeriods.some((item) => item.areaid === data.id)) {
            return {...data};
          }
          return null;
        })
        .filter((circle) => circle !== null); // Remove null

        // get post data
        const postData = await postRef.get();
        // add the post to the areas that touch it
        if (touchingCircles.length > 0) {
          const batch = firestore.batch(); // Create Firestore batch write instance
        
          for (const area of touchingCircles) {
            const postRef = firestore
              .collection("areas")
              .doc(area.id)
              .collection("posts")
              .doc(postid);
        
            const remainingTime = getSecondsRemaining(postData.data().createdAt, postData.data().period);
        
            batch.set(postRef, {
              ...postData.data(),
              reposted: true,
              remainingtime: remainingTime,
              areaid: area.id,
              postcreatorid: postData.data().postcreatorid,
              period: postData.data().period,
              isArea: true
            }, {merge: true});
          }
        
          await batch.commit(); // Execute all writes at once
        }
    }

    function getSecondsRemaining(createdAt, period) {
      let THREE_DAYS_IN_SECONDS = 3 * 24 * 60 * 60; // Default to 3 days

      if (period === "old") {
        THREE_DAYS_IN_SECONDS = 10 * 24 * 60 * 60;
      }

      if (!createdAt || !createdAt.seconds) {
        return 5; // Handle missing or invalid timestamps
      }

      const createdAtTimestamp = createdAt.seconds;
      const targetTimestamp = createdAtTimestamp + THREE_DAYS_IN_SECONDS;
      const currentTimestamp = Math.floor(Date.now() / 1000);

      return Math.max(targetTimestamp - currentTimestamp, 0); // Ensure it's not negative
    }

    async function updateInteractedPosts(postInteractedWith, interactingUserId) {
      const geoFirestore = new GeoFirestore(firestore);
      const geocollection = geoFirestore.collection("users").doc(interactingUserId).collection("interactions");

      console.log("coordinates "+ JSON.stringify(postInteractedWith.coordinates._latitude));

      const coordinates = postInteractedWith.coordinates;
      const latitude = coordinates._latitude || coordinates.latitude;
      const longitude = coordinates._longitude || coordinates.longitude;
      // see if where query will work
      const query = geocollection.near({
        center: new admin.firestore.GeoPoint(latitude, longitude),
        radius: 1.5, // Radius in kilometers
      });


      const result = await query.get();

      const nearbyandlessthreedays = result.docs
        .filter((doc) => {
          const postData = doc.data();
          if (!postData.createdAt || !postData.coordinates || postData.interacted !== true) return false; // Ensure fields exist & interacted is true
          return postData.postid !== postInteractedWith.postid;
        })
        .map((doc) => {
          const postData = doc.data();

          const distance = turf.distance(
            [postData.coordinates.longitude, postData.coordinates.latitude],
            [longitude, latitude],
            {units: "meters"}
          );

          const createdAtMs = postData.createdAt.toMillis() || 0;
          const now = Date.now();
          const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

          return distance <= 1000 && (now - createdAtMs) <= threeDaysMs ?
            {id: postData.postid, postcreatorid: postData.postcreatorid, createdAt: createdAtMs} :
            null;
        })
        .filter(Boolean) // Remove nulls
        .sort((a, b) => b.createdAt - a.createdAt) // Sort by latest
        .slice(0, 5); // Limit to 5

      console.log(nearbyandlessthreedays);

      // const query = geocollection.near({
      //   center: new admin.firestore.GeoPoint(postInteractedWith.coordinates._latitude || postInteractedWith.coordinates.latitude, postInteractedWith.coordinates._longitude || postInteractedWith.coordinates.longitude),
      //   radius: 1.5, // Radius in kilometers
      // });

      // const result = await query.get();

      // const interactednearbysnapshots = result.docs.filter((doc) => doc.data().postid !== postInteractedWith.postid);

      // const nearbyandlessthreedays = interactednearbysnapshots.map((doc) => {
      //   const postData = doc.data();

      //   const postInteractedWithLocation = {
      //     lat: postInteractedWith.coordinates.latitude,
      //     lon: postInteractedWith.coordinates.longitude
      //   };

      //   const postLocation = {
      //     lat: postData.coordinates.latitude,
      //     lon: postData.coordinates.longitude
      //   };

      //   const distance = turf.distance(
      //     [postInteractedWithLocation.lon, postInteractedWithLocation.lat],
      //     [postLocation.lon, postLocation.lat],
      //     {units: "meters"}
      //   );

      //   const createdAt = postData.createdAt.toMillis();
      //   const now = Date.now();
      //   const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      //   // if the post is less than 1km away and less than 3 days old
      //   if (distance <= 1000 && (now - createdAt) <= threeDaysMs) {
      //     return {id: postData.postid, postcreatorid: postData.postcreatorid};
      //   }

      //   return null;
      // }).filter((post) => post !== null);

      // Start the batch
      const batch = admin.firestore().batch();

      for (const postInfo of nearbyandlessthreedays) {
        try {
          const ref = db.collection("users").doc(postInfo.postcreatorid)
            .collection("posts").doc(postInfo.id)
            .collection("similar");

          const snapshot = await ref.orderBy("createdAt", "desc").limit(1).get();

          if (!snapshot.empty) {
            const topDocData = snapshot.docs[0].data();
            const posts = topDocData.posts;

            if (posts.length > 1000) {
              continue;
            }
            // Add update operation to the batch
            const docRef = ref.doc(topDocData.id);
            batch.update(docRef, {
              posts: admin.firestore.FieldValue.arrayUnion(postInteractedWith)
            });
          } else {
            const topDocid = generateRandomString(21);

            const topDocInfo = {
              id: topDocid,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              posts: [postInteractedWith]
            };

            // Add set operation to the batch
            const docRef = ref.doc(topDocid);
            batch.set(docRef, topDocInfo);
          }
        } catch (error) {
          console.error("Error processing post:", error);
        }
      }

      // Commit the batch
      await batch.commit();
      console.log("Batch operation completed.");
    }
  });


  exports.SchedulePostAreaTransition = functions.https.onRequest(async (req, res) => {
    const {areaid, postid, currentperiod} = req.body;
  
    let nextPeriod;
  
    // Determine the next period based on current period
    if (currentperiod === "latest") {
      nextPeriod = "old";
    } else if (currentperiod === "old") {
      nextPeriod = "older";
    } else {
      return res.status(400).send("Invalid current period.");
    }
  
    console.log(JSON.stringify(req.body));
  
    try {
      const docsRef = db.collection("areas").doc(areaid).collection(currentperiod);
      const docsSnapshot = await docsRef.get();
  
      // Check if documents were found in the current period
      if (docsSnapshot.empty) {
        return res.status(404).send("No documents found for the current period.");
      }
  
      // Loop through the documents and find the specific post
      for (const doc of docsSnapshot.docs) {
        const docData = doc.data();
        const posts = docData.posts;
  
        // Find the post by postid
        const postInfo = posts.find((item) => item.id === postid);
  
        if (postInfo) {
          const docid = docData.id;
          const docRef = doc.ref;

          console.log("Found");
  
          // Update or create the post in the next period collection
          if (docid === "trending") {
            await updateOrCreateTrending(areaid, postInfo, false, nextPeriod);
          } else {
            await createDocInLatestOldAndOlder(nextPeriod, areaid, postInfo);
          }
  
          // Remove the post from the current period collection
          await docRef.update({
            posts: admin.firestore.FieldValue.arrayRemove(postInfo),
          });
  
          // If this was the only post in the document, delete the document
          if (posts.length === 1) {
            await docRef.delete();
          }
  
          // Schedule post transition task if coming from "latest"
          if (currentperiod === "latest") {
            const taskData = {
              areaid: areaid,
              postid: postid,
              currentperiod: "old",
            };
            await createPostTransitionTask(taskData, 604800); // Schedule a task to move from "old" to "older"
          }
  
          // Update the post's period in the user's posts collection and in the area's posts collection
          const originalPostRef = db.collection("users").doc(postInfo.postcreatorid).collection("posts").doc(postid);
          await originalPostRef.update({period: nextPeriod});
  
          const areaPostRef = db.collection("areas").doc(areaid).collection("posts").doc(postid);
          await areaPostRef.update({period: nextPeriod});
  
          break; // Exit the loop once the post is processed
        }
      }
  
      // If the post was processed successfully
      res.status(200).send(`Post ${postid} processed successfully`);
    } catch (error) {
      console.error("Error processing document:", error);
      res.status(500).send("Error processing document");
    }
  });
  

  async function createPostTransitionTask(data, delaySeconds) {
  const project = "flaya-9ebb2"; // Replace with your GCP project ID
  const location = "us-central1"; // Replace with your GCP location (e.g., 'us-central1')
  const queue = "schedulePostTrasitionTTL"; // Replace with your Task Queue name

  const payload = {...data}; // Payload sent to the function (document ID)
  
  // Construct the fully qualified queue name

  const taskClient = new CloudTasksClient();
  const parent = taskClient.queuePath(project, location, queue);

  const taskName = `projects/${project}/locations/${location}/queues/${queue}/tasks`;

  // Create the task with the delay
  const task = {
    name:`${taskName}/myTask-${data.postid+data.areaid}-${delaySeconds}`,
    httpRequest: {
      httpMethod: "POST",
      url: `https://${location}-${project}.cloudfunctions.net/SchedulePostAreaTransition`,
      body: Buffer.from(JSON.stringify(payload)).toString("base64"), // Encode payload as base64
      headers: {"Content-Type": "application/json"},
    },
  
    scheduleTime: {
      seconds: delaySeconds + (Date.now() / 1000), // Schedule the task in the future
    },
  };
  // Create the task
  return taskClient.createTask({parent, task});
}


exports.OnAreaPostCreated = functions.firestore.document("areas/{areaid}/posts/{postid}")
.onCreate(async (data, context)=>{
  const areaid = context.params.areaid;

  const postData = data.data();

  // get popularity of the user
  const ref = await db.collection("users").doc(postData.postcreatorid).get();
  const popularity = ref.data().popularity;
  const deviceid = ref.data().devicecreatorid || "deviceid";

  const postinfo = {
    createdAt:postData.createdAt,
    deviceid,
    coordinates:{
      latitude:postData.coordinates.latitude,
      longitude:postData.coordinates.longitude
    },
    popularity:popularity,
    distance:postData.radius,
    id:postData.id,
    postcreatorid:postData.postcreatorid
  };

  await createDocInLatestOldAndOlder(postData.reposted ? postData.period : "latest", areaid, postinfo);

  const taskData = {
    areaid:areaid,
    postid:postData.id,
    currentperiod:postData.reposted ? postData.period : "latest"
  };


  await createPostTransitionTask(taskData, postData.reposted ? postData.remainingtime : 259200);

  return null;
});

async function createDocInLatestOldAndOlder(period, areaid, postinfo) {
  const ref = firestore
    .collection("areas")
    .doc(areaid)
    .collection(period);

  // Get latest document
  const snapshot = await ref
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const latestDocId = snapshot.docs[0].id;
    const docRef = ref.doc(latestDocId);

    // Run transaction to update or create a new document if needed
    await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const data = doc.data();
      const posts = data.posts || [];

      // Check if the array size is less than 1000
      if (posts.length < 1000) {
        // Add new post to existing document
        transaction.update(docRef, {
          posts: admin.firestore.FieldValue.arrayUnion(postinfo)
        });
      } else {
        // Create a new document in the same transaction
        createNewDocArea(postinfo, ref, transaction);
      }
    });
  } else {
    // No document exists, create a new one
    await createNewDocArea(postinfo, ref);
  }
}

// Helper function to create a new document with the post
async function createNewDocArea(postinfo, ref, transaction = null) {
  const newDocId = generateRandomString(21);

  const newDocInfo = {
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    id: newDocId,
    posts: [postinfo]
  };

  if (transaction) {
    // If inside a transaction, use the transaction object to create the document
    transaction.set(ref.doc(newDocId), newDocInfo);
  } else {
    // If not inside a transaction, perform the regular set operation
    await ref.doc(newDocId).set(newDocInfo);
  }
}


async function updateOrCreateTrending(areaid, postinfo, isBeingRemoved, period) {
    const trendingref = firestore
  .collection("areas")
  .doc(areaid)
  .collection(period).doc("trending");

  // get latest doc
  await firestore.runTransaction(async (transaction)=>{
    const doc = await transaction.get(trendingref);

    if (!doc.exists) {
      console.log("creating new");
       // create another ref doc
       await createTrending(postinfo);
    } else {
      console.log("updating");
      transaction.update(trendingref, {
        posts: !isBeingRemoved ? admin.firestore.FieldValue.arrayUnion(postinfo):
        admin.firestore.FieldValue.arrayRemove(postinfo)
      });
    }
  });

 
  async function createTrending(postinfo) {
    try {
      const info = {
        id:"trending",
        posts:[postinfo]
      };

      await trendingref.set(info);
    } catch (e) {
      console.log(e);
    }
  }
}

function generateRandomString(length) {
  return [...Array(length)].map(() => Math.random().toString(36)[2]).join("");
}


exports.onPostUpdate = functions.firestore
  .document("users/{userid}/posts/{postid}")
  .onUpdate(async (change, context) => {
    const dataBefore = change.before.data();
    const dataAfter = change.after.data();

    // add post to tags if there is tags available
    if (dataAfter.tags.length > 0 ) {
      const promises = dataAfter.tags.map(async (item) => {
        const {uid} = item; // Destructure item to extract uid, id, and object fields
  
        const ref = db.collection("users").doc(uid).collection("tags").doc(dataAfter.id);
  
        await ref.set(dataAfter, {merge:true}); // Update Firestore document
      });
      // Wait for all operations to complete
      await Promise.all(promises);
    }

    const period = dataAfter.period;

    // Extract interactions and views counts from the before and after data
    const interactionsBefore = dataBefore.interactions || 0;
    const viewsBefore = dataBefore.views || 0;

    const interactionsAfter = dataAfter.interactions || 0;
    const viewsAfter = dataAfter.views || 0;

    // Calculate the 70% thresholds
    const thresholdBefore = viewsBefore * 0.7;
    const thresholdAfter = viewsAfter * 0.7;

    // Check if the interaction percentage has changed from below 70% to above 70%
    const wasBelow70Before = interactionsBefore <= thresholdBefore;
    const isAbove70After = interactionsAfter > thresholdAfter;

    // Check if the interaction percentage has changed from above 70% to below 70%
    const wasAbove70Before = interactionsBefore > thresholdBefore;
    const isBelow70After = interactionsAfter <= thresholdAfter;
    

    if (wasBelow70Before && isAbove70After && interactionsAfter > 10) {
      // Perform action if the percentage has gone from below 70% to above 70%
      console.log(`Interactions have now exceeded 70% of views for post ${context.params.postid}.`);
      // Perform your action here (e.g., send notification, update status)

      const areas = await queryAreasPostIsLocated(dataAfter.id);

      for (const areaid of areas) {
        const ref = admin.firestore().collection("areas").doc(areaid)
        .collection(period);

        const docs = await ref.get();

        docs.forEach(async (snapshot)=>{
          const data = snapshot.data();
          const postsArray = data.posts;

          const savedpost = postsArray.find((post) => post.id === dataAfter.id);

          if (savedpost) {
             const latestref = admin.firestore().collection("areas")
             .doc(areaid).collection(period).doc(data.id);

             await latestref.update({posts: admin.firestore.FieldValue.arrayRemove(savedpost)});

             savedpost.latestid = data.id;

             updateOrCreateTrending(areaid, savedpost, false, period);
          }
        });
      }
    } else if (wasAbove70Before && isBelow70After && interactionsAfter > 10) {
      // Perform action if the percentage has gone from above 70% to below 70%
      console.log(`Interactions have now dropped below 70% of views for post ${context.params.postid}.`);
      // Perform your action here (e.g., send notification, update status)


      const areas = await queryAreasPostIsLocated(dataAfter.id);

      for (const areaid of areas) {
        const trendingref = admin.firestore().collection("areas").doc(areaid)
        .collection(period).doc("trending");

        const posts = (await trendingref.get()).data().posts;

        const postinfo = posts.find((post) => post.id === dataAfter.id);

        const promises = [];
       
        if (postinfo) {
          const perioddocref = admin.firestore().collection("areas").doc(areaid).collection(period).doc(postinfo.latestid);
          const trendingUpdatePromise = trendingref.update({
            posts: admin.firestore.FieldValue.arrayRemove(postinfo)
          });

          promises.push(trendingUpdatePromise);

          const periodocsnap = await perioddocref.get();
          if (periodocsnap.exists) {
            const latestUpdatePromise = perioddocref.update({
              posts: admin.firestore.FieldValue.arrayUnion(postinfo)
            });

            promises.push(latestUpdatePromise);
          } else {
            await createDocInLatestOldAndOlder(period, areaid, postinfo);
          }
          // Use Promise.all to run them in parallel
          await Promise.all(promises);
        }
      }
    }
    return null;
  });

  async function queryAreasPostIsLocated(id) {
    const postsRef = admin.firestore().collectionGroup("posts");
    
    // Querying for posts where id == specific value and isArea == true
    const querySnapshot = await postsRef
      .where("id", "==", id)
      .where("isArea", "==", true)
      .get();
  
    const results = [];
    querySnapshot.forEach((doc) => {
      results.push(doc.data().areaid);
    });
  
    return results;
  }


exports.onPostCreated = functions.firestore
    .document("users/{userid}/posts/{postid}")
    .onCreate(async (data, context) => {
      const postid = context.params.postid;
      const userid = context.params.userid;
      const postdata = data.data();

      const latitude = postdata.coordinates.latitude;
      const longitude = postdata.coordinates.longitude;

      
       // get blacklisted users
      const blackListedSnap = await db.collection("blacklisted").get();
      const blacklist = new Set(blackListedSnap.docs.flatMap((doc) => {
        const seenData = doc.data();
        return seenData.blacklist.map((deviceid) => deviceid);
      }));  

      
      const usersnap = await db.collection("users").doc(userid).get();
      const deviceid = usersnap.data().devicecreatorid || "deviceid";

      if (blacklist.has(deviceid)) {
        return;
      }

      // update business info if account is biusiness type
      if (usersnap.data().isbusinessaccount === true) {
        const business = {
          name:usersnap.data().business.name || "name",
          category:usersnap.data().business.category || "category",
        };
        await data.ref.update({business:business});
      }

      await updateReferralBatchIfFirstPost(userid);

      // add post to tags if there is tags available
      if (postdata.tags.length > 0 ) {
        const promises = postdata.tags.map(async (item) => {
          const {uid} = item; // Destructure item to extract uid, id, and object fields
    
          const ref = db.collection("users").doc(uid).collection("tags").doc(postdata.id);
    
          await ref.set(postdata); // Update Firestore document
        });
    
        // Wait for all operations to complete
        await Promise.all(promises);
      }

      
      const radius = usersnap.data().radius;

      await db.collection("users").doc(userid).collection("posts").doc(postid).update({radius:radius});

      const maxQueryRadius = (radius * 2 + 500) / 1000;

      const postInfo = {
        createdAt:postdata.createdAt,
        radius:radius,
        postid:postid,
        deviceid,
        coordinates:postdata.coordinates,
        postcreatorid:userid
      };

      await updateSubscribers(userid, postInfo, postid);

      try {
      // Query all documents with GeoPoints within the maxQueryRadius
        const query = geocollection.near({
          center: new admin.firestore.GeoPoint(postdata.coordinates.latitude, postdata.coordinates.longitude),
          radius: maxQueryRadius, // Radius in kilometers
        });

        const snapshot = await query.get();

        // Filter and return the results
        let touchingCircles = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              const areaLat = data.coordinates.latitude;
              const areaLng = data.coordinates.longitude;
              const areaRadius = data.radius || 500;

              // Check if the circles touch or overlap
             if (doCirclesTouch(latitude, longitude, radius, areaLat, areaLng, areaRadius)) {
                return {...data};
              }
              return null;
            })
            .filter((circle) => circle !== null); // Remove null

        if (touchingCircles.length === 0) {
          console.log("No circles found within 500m. Expanding search to 1500m.");

          // Step 2: Query within a tripled radius (1500m)
          const extendedRadius = radius * 3; // 1500 meters

          touchingCircles = await geocollection
              .near({
                center: new admin.firestore.GeoPoint(latitude, longitude),
                radius: extendedRadius / 1000,
              })
              .get()
              .then((snapshot) => snapshot.docs.map((doc) => doc.data()));

          // Step 3: If circles are found in the 1500m radius, create a new circle next to the nearest one
          if (touchingCircles.length > 0) {
          // Sort circles by distance to find the nearest one
            const nearestCircle = touchingCircles.reduce(
                (nearest, circle) => {
                  const distanceToPost = calculateDistance(
                      latitude,
                      longitude,
                      circle.coordinates.latitude,
                      circle.coordinates.longitude,
                  );
                  return distanceToPost < nearest.distance ?
                {circle, distance: distanceToPost} :
                nearest;
                },
                {circle: null, distance: Infinity},
            ).circle;

            // Step 4: Create a new circle next to the nearest circle
            const newCircleCreationStatus = await createCircleNearNearest(
                latitude,
                longitude,
                nearestCircle,
            );

            return firestore
                .collection("areas")
                .doc(newCircleCreationStatus.id)
                .collection("posts")
                .doc(postid)
                .set({...postdata, areaid:newCircleCreationStatus.id, postcreatorid:userid, period:"latest", isArea:true});
          } else {
          // Step 5: If no circles found even in the extended radius, create a circle at the user's location
            console.log(
                "No circles found within 1500m. Creating a circle at user's location.",
            );

            const Status = await geocollection.add({
              coordinates: new admin.firestore.GeoPoint(latitude, longitude),
              radius: 500,
             
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            await geocollection.doc(Status.id).update({id:Status.id});

            return firestore
                .collection("areas")
                .doc(Status.id)
                .collection("posts")
                .doc(postid)
                .set({...postdata, areaid:Status.id, postcreatorid:userid, period:"latest", isArea:true});
          }
        }

        console.log(touchingCircles+"circles found");

        // Now update the posts in each circle
        const updatePromises = touchingCircles.map(async (circle) => {
          const areaid = circle.id;

          // Update the post in Firestore
          return firestore
              .collection("areas")
              .doc(areaid)
              .collection("posts")
              .doc(postid)
              .set({...postdata, areaid:areaid, postcreatorid:userid, period:"latest", isArea:true});
        });

        await Promise.all(updatePromises);
        console.log("Post updated successfully.");
      } catch (error) {
        console.error("Error fetching touching circles:", error);  
      }
    });
    exports.processSubscriberChunk = functions.pubsub.topic("subscribed-posted").onPublish(async (message) => {
      const {postId, postInfo, chunk} = message.json;
      console.log("id:"+postId+ " info "+ JSON.stringify(postInfo));
    
      const batch = db.batch();
      chunk.forEach((subscriber) => {
        const subscriptionRef = db.collection("users").doc(subscriber.id)
                                 .collection("postsubscriptions").doc(postId);
        batch.set(subscriptionRef, postInfo);
      });
    
      await batch.commit();
      console.log("Batch committed for chunk.");
    });


async function updateSubscribers(userid, post, postid) {
  const subscribersRef = db.collection("users").doc(userid).collection("subscribers");
  const subscribersSnapshot = await subscribersRef.get();

  const chunkSize = 450;

  for (let i = 0; i < subscribersSnapshot.docs.length; i += chunkSize) {
    const chunk = subscribersSnapshot.docs.slice(i, i + chunkSize).map((doc) => doc.data());

    // Publish each chunk to Pub/Sub for processing
    const message = {
      postId: postid,
      postInfo: post,
      chunk: chunk
    };
    await pubsub.topic("subscribed-posted").publishMessage({
      json: message
    });
    }
}


async function createCircleNearNearest(postLat, postLng, nearestCircle) {
  const nearestLat = nearestCircle.coordinates.latitude;
  const nearestLng = nearestCircle.coordinates.longitude;

  // Calculate the bearing from the nearest circle to the user's location
  const bearing = calculateBearing(nearestLat, nearestLng, postLat, postLng);

  console.log(JSON.stringify(nearestCircle.coordinates) + "and "+bearing);

  // Calculate a new point 1000m away from the nearest circle, along the bearing
  const newCircleLocation = calculateDestination(
      nearestLat,
      nearestLng,
      bearing,
      1000,
  ); // 1000 meters

  // Create the new circle at the calculated location
  const newCircleRef = await geocollection.add({
    coordinates: new admin.firestore.GeoPoint(
        newCircleLocation.latitude,
        newCircleLocation.longitude,
    ),
    radius: 500,
    // Example radius, adjust as needed
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await geocollection.doc(newCircleRef.id).update({id:newCircleRef.id});

  // Return success and the new circle's ID
  return {
    success: true,
    message: "New circle created 1000m away from the nearest circle.",
    id: newCircleRef.id,
  };
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360 degrees
}

// Helper function to compute a new location along a given bearing and distance
function calculateDestination(lat, lon, bearing, distance) {
  // Define the starting point
const start = turf.point([lon, lat]);

// Define the distance (in kilometers) and bearing (in degrees)
const distanceKm = distance/1000; // 1000 meters is 1 kilometer


// Calculate the destination point
const destination = turf.destination(start, distanceKm, bearing);
console.log(destination);
  return {
    latitude: destination.geometry.coordinates[1],
    longitude: destination.geometry.coordinates[0],
  };
}

// Helper function to calculate the distance between two points using the Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}
// Helper function to check if two circles touch or overlap
function doCirclesTouch(lat1, lon1, r1, lat2, lon2, r2) {
  const distanceBetweenCenters = calculateDistance(lat1, lon1, lat2, lon2);
  const sumOfRadii = r1 + r2;

  console.log("distanceBtNCenters: "+distanceBetweenCenters+ "sumRadii: "+sumOfRadii);

  // Check if the distance between the centers is less than or equal to the sum of their radii
  return distanceBetweenCenters <= sumOfRadii;
}

exports.onSeenPostsCreated = functions.firestore
  .document("users/{userid}/seenposts/{seenpostid}")
  .onCreate(async (snapshot, context) => {
    const userid = context.params.userid;
    
    try {
      // Get the user document to check if they have a referral code
      const userDoc = await db.collection("users").doc(userid).get();
      
      if (!userDoc.exists) {
        console.log(`User ${userid} not found`);
        return null;
      }
      
      const userData = userDoc.data();
      const referralCode = userData.referal;
      const deviceId = userData.devicecreatorid;
      
      // If no referral code or device ID, exit early
      if (!referralCode || !deviceId) {
        console.log(`User ${userid} has no referral code or device ID`);
        return null;
      }
      
      // Find the user in referral users collection group
      const referralUsersQuery = await db.collectionGroup("referalusers")
        .where("uid", "==", userid)
        .limit(1)
        .get();
      
      if (referralUsersQuery.empty) {
        console.log(`No referral record found for user ${userid}`);
        return null;
      }
      
      const referralUserDoc = referralUsersQuery.docs[0];
      const referralUserData = referralUserDoc.data();
      const batchId = referralUserData.batchid;
      
      // Check if this user has already been marked as having seen content
      if (referralUserData.seen === true) {
        console.log(`User ${userid} already marked as having seen content`);
        return null;
      }
      
      // Get the batch reference
      const batchRef = db.collection("referals").doc(referralCode)
        .collection("groupbatches").doc(batchId);
      
      // Get the batch document to check device tracking
      const batchDoc = await batchRef.get();
      const batchData = batchDoc.data();
      
      // Initialize tracking arrays if they don't exist
      const seenDevices = batchData.seenDevices || [];
      
      // Check if this device has already been counted
      const deviceAlreadyCounted = seenDevices.includes(deviceId);
      
      // Update the user document in referalusers to mark as seen
      await referralUserDoc.ref.update({
        seen: true,
        firstSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        countedTowardsBatch: !deviceAlreadyCounted // Flag if this user counted toward the batch total
      });
      
      // Only increment seencount and add device to tracking if this device hasn't been counted before
      if (!deviceAlreadyCounted) {
        await batchRef.update({
          seencount: admin.firestore.FieldValue.increment(1),
          seenDevices: admin.firestore.FieldValue.arrayUnion(deviceId)
        });
        console.log(`Incremented seencount for device ${deviceId} in batch ${batchId}`);
      } else {
        console.log(`Device ${deviceId} already counted in batch ${batchId}, not incrementing seencount`);
      }
      
      console.log(`Updated seen status for referred user ${userid} in batch ${batchId}`);
      return null;
    } catch (error) {
      console.error("Error updating referral seen status:", error);
      return null;
    }
  });

// Helper function to update referral batch posted users count
async function updateReferralBatchIfFirstPost(userid) {
  try {
    // Get the user document
    const userDoc = await db.collection("users").doc(userid).get();
    
    if (!userDoc.exists) {
      console.log(`User ${userid} not found`);
      return;
    }
    
    const userData = userDoc.data();
    const referralCode = userData.referal;
    
    // If no referral code, exit early
    if (!referralCode) {
      console.log(`User ${userid} has no referral code`);
      return;
    }
    
    // Check if user has already been counted as posted
    const postsCountSnapshot = await db.collection("users").doc(userid).collection("posts").count().get();
    
    // If this is not their first post, exit early
    if (postsCountSnapshot.data().count > 1) {
      return;
    }
    
    // Find the user in referral users collection group
    const referralUsersQuery = await db.collectionGroup("referalusers")
      .where("uid", "==", userid)
      .limit(1)
      .get();
    
    if (referralUsersQuery.empty) {
      console.log(`No referral record found for user ${userid}`);
      return;
    }
    
    const referralUserDoc = referralUsersQuery.docs[0];
    const referralUserData = referralUserDoc.data();
    
    // If user already marked as posted, exit early
    if (referralUserData.posted === true) {
      return;
    }
    
    const batchId = referralUserData.batchid;
    
    // Get the batch reference
    const batchRef = db.collection("referals").doc(referralCode)
      .collection("groupbatches").doc(batchId);
    
    // Update the user document in referalusers to mark as posted
    await referralUserDoc.ref.update({
      posted: true,
      firstPostedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update the batch document to increment posteduserscount
    await batchRef.update({
      posteduserscount: admin.firestore.FieldValue.increment(1)
    });
    
    console.log(`Updated posted status for referred user ${userid} in batch ${batchId}`);
  } catch (error) {
    console.error("Error updating referral posted status:", error);
  }
}

exports.getEventsNearby = functions.https.onCall(async (data, context) => {
  try {
    const userId = data.userId;
    const category = data.category || null;
    const limit = 25; // Always return 10 closest events

    // Get user location
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    const userCoordinates = userData.coordinates;
    
    if (!userCoordinates) {
      throw new functions.https.HttpsError("failed-precondition", "User location not found");
    }

    const userLat = userCoordinates._latitude || userCoordinates.latitude;
    const userLng = userCoordinates._longitude || userCoordinates.longitude;

    const availableEvents = data.events || [];

    // Get already fetched event IDs (map to a Set for quick lookup)
    const alreadyFetchedSet = new Set(availableEvents.map((event) => event.id));

    // Create a GeoFirestore reference to the events collection
    const eventsgeocollection = geofirestore.collection("events");

    // GeoQuery (fetch more than needed)
    const query = eventsgeocollection.near({
      center: new admin.firestore.GeoPoint(userLat, userLng),
      radius: 500, // Radius in kilometers
    });

    // Execute the query
    const snapshot = await query.get();

    if (snapshot.empty) {
      return {event: true, events: []};
    }

    // Process results
    let events = snapshot.docs
      .map((doc) => {
        const eventData = doc.data();

        // Ensure location exists
        if (!eventData.location) return null;

        const eventLat = eventData.location.coordinates.latitude;
        const eventLng = eventData.location.coordinates.longitude;

        // Calculate distance using Turf.js
        const from = turf.point([userLng, userLat]);
        const to = turf.point([eventLng, eventLat]);
        const distance = turf.distance(from, to, {units: "kilometers"});

        return {
          id: doc.id,
          ...eventData,
          distance: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`,
          distanceValue: distance, // Used for sorting
        };
      })
      .filter((event) => event !== null) // Remove null entries
      .filter((event) => !alreadyFetchedSet.has(event.id)); // Exclude already fetched events

    // Sort by distance
    events.sort((a, b) => a.distanceValue - b.distanceValue);

    // Apply category filter manually
    if (category) {
      events = events.filter((event) => event.category === category);
    }

    // Limit to 10 closest events
    events = events.slice(0, limit);

    return { 
      event: true,
      events,
    };
  } catch (error) {
    console.error("Error fetching events:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Approve Business Account and add to businesses collection
async function approveBusiness(userid) {
  try {
    // Get the user data
    const userRef = firestore.collection("users").doc(userid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new Error("User not found");
    }

    const userData = userSnap.data();

    // Update the user's business account status
    await userRef.update({
      "isbusinessaccount":true,
      "business.approved": true,
      "business.approvedAt": admin.firestore.FieldValue.serverTimestamp()
    });

    // If approved, add to businesses geo collection
    
      // Create a GeoFirestore reference to the businesses collection
    const businessesGeoCollection = geofirestore.collection("businesses");

    // Extract business data from user
    const businessData = {
      businessname: userData.business.name,
      category: userData.business.category,
      address: userData.business.address,
      poster: userData.business.poster || userData.profilephoto,
      ownerid: userid,
      ownername: userData.username,
      ownerphoto: userData.profilephoto,
      coordinates: new admin.firestore.GeoPoint(
        userData.business.coordinates._latitude || userData.business.coordinates.latitude,
        userData.business.coordinates._longitude || userData.business.coordinates.longitude
      ),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add to businesses collection with geo data
    const businessRef = await businessesGeoCollection.add(businessData);

    // Update user with businessId reference
    await userRef.update({
      "business.businessid": businessRef.id
    });

    await businessRef.update({id:businessRef.id});

    return {
      success: true,
      message: "Business approved and added to businesses collection",
      businessId: businessRef.id
    };
  } catch (error) {
    console.error("Error approving business:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
}

// Get nearby businesses
exports.getBusinessesNearby = functions.https.onCall(async (data, context) => {
  try {
    const userId = data.userId;
    const category = data.category || null;
    const limit = 25; // Always return 10 closest events

    // Get user location
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    const userCoordinates = userData.coordinates;
    
    if (!userCoordinates) {
      throw new functions.https.HttpsError("failed-precondition", "User location not found");
    }

    const userLat = userCoordinates._latitude || userCoordinates.latitude;
    const userLng = userCoordinates._longitude || userCoordinates.longitude;

    const availableBusinesses = data.businesses || [];

    // Get already fetched event IDs (map to a Set for quick lookup)
    const alreadyFetchedSet = new Set(availableBusinesses.map((business) => business.id));

    // Create a GeoFirestore reference to the events collection
    const businessgeocollection = geofirestore.collection("businesses");

    // GeoQuery (fetch more than needed)
    const query = businessgeocollection.near({
      center: new admin.firestore.GeoPoint(userLat, userLng),
      radius: 500, // Radius in kilometers
    });

    // Execute the query
    const snapshot = await query.get();

    if (snapshot.empty) {
      return {business: true, businesses: []};
    }

    // Process results
    let businesses = snapshot.docs
      .map((doc) => {
        const businessData = doc.data();

        // Ensure location exists
        if (!businessData.coordinates) return null;

        const businessLat = businessData.coordinates.latitude || businessData.coordinates._latitude;
        const businessLng = businessData.coordinates.longitude || businessData.coordinates._longitude;

        // Calculate distance using Turf.js
        const from = turf.point([userLng, userLat]);
        const to = turf.point([businessLng, businessLat]);
        const distance = turf.distance(from, to, {units: "kilometers"});

        return {
          id: doc.id,
          ...businessData,
          distance: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`,
          distanceValue: distance, // Used for sorting
        };
      })
      .filter((business) => business !== null) // Remove null entries
      .filter((business) => !alreadyFetchedSet.has(business.id)); // Exclude already fetched events

    // Sort by distance
    businesses.sort((a, b) => a.distanceValue - b.distanceValue);

    // Apply category filter manually
    if (category) {
      businesses = businesses.filter((business) => business.category === category);
    }

    // Limit to 10 closest events
    businesses = businesses.slice(0, limit);

    return { 
      business: true,
      businesses,
    };
  } catch (error) {
    console.error("Error fetching events:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.onOrderReceived = functions.firestore
  .document("users/{uid}/orders/{orderid}")
  .onCreate(async (snap, context) => {
    const businesscreatorid = context.params.uid;
    const businessSnap = snap.data();

    const creatorSnap = await db.collection("users").doc(businesscreatorid).get();
    const businessInfo = creatorSnap.data().business;

    // Send Notification to business
    const payload = {
      profilephoto: businessSnap.userPhoto,
      body: "New order/booking from " + businessSnap.userName,
      title: "Hey " + businessInfo.name,
    };

    console.log("token "+creatorSnap.data().token);

    await sendNotification(creatorSnap.data().token, payload);
    console.log("business"+JSON.stringify(payload));

    // Send notification and submit order to admin
    const payloadAdmin = {
      profilephoto: businessSnap.userPhoto,
      body: "New order/booking for " + businessInfo.name,
      title: businessSnap.userName,
    };

    const adminSnap = await db
      .collection("users")
      .doc("UVEHaKV5QmUGbZ2PZ9y5Y4YduM03")
      .get();

    await sendNotification(adminSnap.data().token, payloadAdmin);
    console.log("admin"+JSON.stringify(payload));

    const order = {
      ...businessSnap,
      businessphoto:creatorSnap.data().profilephoto,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      business: businessInfo,
    };

    const currentOrdersRef = db.collection("orders").doc();
    await currentOrdersRef.set(order); // <-- FIXED

    return;
  });


  exports.syncPostToAlgolia = functions.firestore
  .document("users/{userid}/posts/{postId}")
  .onWrite(async (change, context) => {
    const postId = context.params.postId;
    const storeid = context.params.userid;

    const index = client.initIndex("Products");

    // Handle create or update
    const data = change.after.data();

    if (!data.business) return;

    // Handle deletes
    if (!change.after.exists) {
      await index.deleteObject(postId);
      console.log(`Post ${postId} removed from Algolia`);
      return;
    }

    // Get store photo
    const storeSnap = await db.collection("users").doc(storeid).get();
    const business = {
      ...data.business,
      photo:storeSnap.data().profilephoto
    };

    const storeLocation = storeSnap.data().business.coordinates;
    
    // Ensure lat/lng is included for geo-search
    const algoliaData = {
      objectID: postId,
      ...data,
      business:business,
      ...(storeLocation && {
        _geoloc: {
          lat: storeLocation.latitude || storeLocation._latitude,
          lng: storeLocation.longitude || storeLocation._longitude,
        }
      }),
      createdAt: data.createdAt || Date.now(),
      // Add any other fields you need indexed
    };

    try {
      await index.saveObject(algoliaData);
      console.log(`Post ${postId} synced to Algolia`);
    } catch (err) {
      console.error("Error indexing to Algolia", err);
    }
  });

  exports.syncStoresToAlgolia = functions.firestore
  .document("users/{userid}")
  .onWrite(async (change, context) => {
    const storeid = context.params.userid;

    const index = client.initIndex("Stores");

    // Handle create or update
    const data = change.after.data();

    if (data.isbusinessaccount != true) return;

    // Handle deletes
    if (!change.after.exists) {
      await index.deleteObject(storeid);
      console.log(`Post ${storeid} removed from Algolia`);
      return;
    }

    const businesscoordinates = data.business.coordinates;
    
    // Ensure lat/lng is included for geo-search
    const algoliaData = {
      objectID: storeid,
      ...data,
      ...(businesscoordinates && {
        _geoloc: {
          lat: businesscoordinates._latitude || businesscoordinates.latitude,
          lng: businesscoordinates._longitude || businesscoordinates.longitude,
        }
      }),
    
    };

    try {
      await index.saveObject(algoliaData);
      console.log(`Post ${storeid} synced to Algolia`);
    } catch (err) {
      console.error("Error indexing to Algolia", err);
    }
  });

  exports.searchAlgolia = functions.https.onCall(async (data, context) => {
    // Validate input parameters
    const {query, userid} = data;

    // Get user location
    const userinfo = await db.collection("users").doc(userid).get();
    const coordinates = userinfo.data().coordinates;

    
    if (!query) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Search query must be a non-empty string"
      );
    }
  
    try {
      const productsIndex = client.initIndex("Products");
      const storesIndex = client.initIndex("Stores");
      
      const results = {};
      
      // Common search parameters
      const searchParams = {
        hitsPerPage: 20,
         aroundLatLng: coordinates.latitude && coordinates.longitude ? `${coordinates.latitude}, ${coordinates.longitude}` : null,
         aroundRadius: 3000 || "all", // in meters, 'all' for no radius constraint
      };
  
      // Search products if type is 'all' or 'products'
      const productResults = await productsIndex.search(query, searchParams);
      
      results.products = [
        ...productResults.hits.map((hit) => ({
          ...hit,
        }))
      ];
    
      // Search stores if type is 'all' or 'stores'
      const storeResults = await storesIndex.search(query, searchParams);
      
      results.stores = [
        ...storeResults.hits.map((hit) => {
          // Calculate distance using Turf.js
          const from = turf.point([coordinates.longitude, coordinates.latitude]);
          const to = turf.point([hit.coordinates._longitude, hit.coordinates._latitude]);
          const distance = turf.distance(from, to, {units: "kilometers"});
            
          return {
          poster:hit.profilephoto,
          category:hit.business.category,
          distance:distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`,
          businessname:hit.business.name,
          id:hit.uid,
        };
})
      ];
      
      return {data:results};
    } catch (error) {
      console.error("Algolia search error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Error performing search",
        error.message
      );
    }
  });

  exports.getSubscriptionStatus = functions.https.onCall(async (data, context) => {
    const {userid, page} = data;

    // removed postpage
  
    const userSnap = await db.collection("users").doc(userid).get();
    const userData = userSnap.data();
  
    const currentSub = userData.subscription;

    // Get monetization info
     const monetizationInfo = await db.collection("information").doc("info").get();
     const monetizationData = monetizationInfo.data();

     if (monetizationData.monetizationinfo.isnormalaccountfree === true && page !== "subscription") {
      return {status: "active", subscriptionType:"grace_period"};
    } 
  
    if (!currentSub || !currentSub.endDate) {
      return {status: "inactive", subscriptionType: null};
    }

    if (currentSub.accountType === "normal" && userData.isbusinessaccount === true) {
      return {status: "inactive", subscriptionType: null};
    }

    // Convert Firebase Timestamp to JavaScript Date
    const endDate = currentSub.endDate.toDate();
    const now = new Date();
  
    // Create the "extra date" — 5 days after endDate
    const extraDate = new Date(endDate);
    extraDate.setDate(endDate.getDate() + 5);
  
    const diffInMs = endDate - now;
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); // Round up partial days
  
    const daysPassed = Math.ceil((now - endDate) / (1000 * 60 * 60 * 24));
  
    const fiveDaysLater = new Date(endDate);
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

    // get formatted fiveDaysLater
    const formattedFiveDaysLater = fiveDaysLater.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // Format readable endDate
    const formattedEndDate = endDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  
    // Determine subscription status
    if (now < endDate) {
      return {
        ...currentSub,
        status: "active",
        days: diffInDays,
        period:"safe_period",
        endDate: formattedEndDate
      };
    } else if (now >= endDate && now <= extraDate) {
      return {
        ...currentSub,
        status: "active",
        period:"grace_period",
        expiryDate: formattedFiveDaysLater,
        days: daysPassed,
        endDate: formattedEndDate
      };
    } else {
      return {
        ...currentSub,
        status: "inactive",
        endDate: formattedEndDate
      };
    }
  });

  // Import subscription handlers
  const mpesaCallbackHandler = require("./subscriptionHandlers/mpesaCallbackHandler");
  const subscriptionExpiryHandler = require("./subscriptionHandlers/subscriptionExpiryHandler");

  // ... existing code remains unchanged

  // Update the mpesaCallback function to use our handler
  exports.mpesaCallback = functions.database.ref("MpesaCallBack/{userid}/{plan}/{uniqueKey}/Body/stkCallback")
    .onCreate(mpesaCallbackHandler.handleMpesaCallback);

  // Cloud Function to check subscription expiry
  exports.checkSubscriptionExpiry = functions.https.onRequest(subscriptionExpiryHandler.checkSubscriptionExpiry);

  // ... existing code ...

  // M-Pesa payment push function for subscriptions
  exports.mpesaPush = functions.https.onCall(async (data, context) => {
    const {userid, phone, plan, isUpgrade} = data;

    if (!userid || !phone) {
      console.error("Missing required parameters for mpesaPush");
      return {error: "Missing required parameters"};
    }

    // Check if user exists
    const usersnap = await db.collection("users").doc(userid).get();
    if (!usersnap.exists) {
      console.error(`User ${userid} not found`);
      return {error: "User not found"};
    }

    const userData = usersnap.data() || {};
    const accountType = userData.isbusinessaccount === true ? "business" : "normal";

    // check if there is already a plan
    const subscription = userData.subscription;
    let currentPlan = null;
    if (subscription && !isUpgrade) {
      currentPlan = subscription.subscriptionType;
    }

    console.log("Plan selected:", currentPlan ? currentPlan : plan);
    console.log("Account type:", accountType);

    const mpesa = new Mpesa(credentials, "production");

    try {
      const response = await mpesa.lipaNaMpesaOnline({
        BusinessShortCode: SHORTCODE,
        passKey: PASSKEY,
        TransactionDesc: `Flaya ${currentPlan ? currentPlan : plan} Subscription`, 
        TransactionType: "CustomerPayBillOnline",
        PartyA: phone,
        PartyB: SHORTCODE,
        Amount: "1", // example amount
        AccountReference: "Account Reference",
        CallBackURL: `https://flaya-9ebb2-default-rtdb.firebaseio.com/MpesaCallBack/${userid}/${currentPlan ? currentPlan : plan}.json`,
        PhoneNumber: phone
      });
      
      console.log("Payment push response:", response);
      return {
        success: true, 
        data: response, 
        message: `Payment request sent to ${phone}. Please check your phone to complete the transaction.`
      };
    } catch (error) {
      console.error("Payment push failed:", error);
      return {
        success: false, 
        error: error.message,
        message: "Failed to initiate payment. Please try again later."
      };
    }
  });

  exports.getPaymentPlans = functions.https.onCall(async (data, context) => {
    const {userid} = data;
    const userSnap = await db.collection("users").doc(userid).get();
    const userData = userSnap.data();

    const accountType = userData.isbusinessaccount === true ? "business" : "normal";

    const plans = await db.collection("information").doc("info").get();
    const plansData = plans.data();

    // Currency mapping based on country codes
    const currencyMap = {
      KE: "KES",
      NG: "NGN",
      GH: "GHS",
      UG: "UGX",
      RW: "RWF",
      ZA: "ZAR",
      US: "USD",
      GB: "GBP",
      FR: "EUR",
      DE: "EUR",
      IN: "INR",
      ZM: "ZMW",
      // Add more as needed
    };

    // Exchange rates from KES (Kenyan Shilling) to other currencies
    // These should ideally be fetched from a real-time API in production
    const exchangeRates = {
      KES: 1, // Base currency
      USD: 0.0077, // 1 KES = 0.0077 USD
      EUR: 0.0070, // 1 KES = 0.0070 EUR
      GBP: 0.0060, // 1 KES = 0.0060 GBP
      NGN: 3.54, // 1 KES = 3.54 NGN
      GHS: 0.092, // 1 KES = 0.092 GHS
      UGX: 28.5, // 1 KES = 28.5 UGX
      RWF: 10.2, // 1 KES = 10.2 RWF
      ZAR: 0.14, // 1 KES = 0.14 ZAR
      INR: 0.65, // 1 KES = 0.65 INR
    };

    const apiKey = functions.config().googlemaps.key;

    let countrycode = null;
    // Get country code from user location
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userData.coordinates.latitude},${userData.coordinates.longitude}&key=${apiKey}`
    );

    const dataLocation = await response.json();
    console.log("data", JSON.stringify(dataLocation));

    if (dataLocation.results.length > 0) {
      const countryComponent = dataLocation.results[0].address_components.find((component) =>
        component.types.includes("country")
      );

      countrycode = countryComponent.short_name || "US"; // e.g. "KE", "NG"
    } else {
      countrycode = "US";
    }

    const targetCurrency = currencyMap[countrycode] || "USD";
    const exchangeRate = exchangeRates[targetCurrency] || exchangeRates.USD;

    // Function to convert price from KES to target currency
    const convertPrice = (kesPrice) => {
      // Extract numeric value from KES price (e.g., "Ksh 500" -> 500)
      const numericPrice = parseInt(kesPrice.replace(/[^\d]/g, ""));
      const convertedPrice = Math.round(numericPrice * exchangeRate);
      
      // Format with appropriate currency symbol
      return `${targetCurrency} ${convertedPrice.toLocaleString()}`;
    };

    // Convert plan prices to target currency
    const convertPlansToTargetCurrency = (originalPlans) => {
      if (!originalPlans) return originalPlans;

      const convertedPlans = {...originalPlans};
      
      // Convert MONTHLY plan if it exists
      if (convertedPlans.MONTHLY) {
        convertedPlans.MONTHLY = {
          ...convertedPlans.MONTHLY,
          price: convertPrice(convertedPlans.MONTHLY.price),
          currency: targetCurrency
        };
      }

      // Convert YEARLY plan if it exists
      if (convertedPlans.YEARLY) {
        convertedPlans.YEARLY = {
          ...convertedPlans.YEARLY,
          price: convertPrice(convertedPlans.YEARLY.price),
          currency: targetCurrency
        };
      }

      return convertedPlans;
    };

    if (accountType === "business") {
      console.log("Business account");
      const convertedPlans = convertPlansToTargetCurrency(plansData.businesspayment);
      
      return {
        plans: {
          ...convertedPlans,
          currency: targetCurrency,
          countryCode: countrycode
        }
      };
    } else {
      console.log("Normal account");
      const convertedPlans = convertPlansToTargetCurrency(plansData.businesspayment);
      
      return {
        plans: {
          ...convertedPlans,
          currency: targetCurrency,
          countryCode: countrycode
        }
      };
    }
  });

  // Add Flutterwave payment verification function
  exports.verifyFlutterwavePayment = functions.https.onCall(async (data, context) => {
    const {transaction_id: transactionId, tx_ref: txRef, userid} = data;

    if (!transactionId || !txRef || !userid) {
      console.error("Missing required parameters for Flutterwave verification");
      return {success: false, error: "Missing required parameters"};
    }

    console.log(`Verifying Flutterwave payment for user: ${userid}, tx_ref: ${txRef}`);

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

    try {
      // Verify payment with Flutterwave API
      const flutterwaveSecretKey = functions.config().flutterwave.secret_key;

      console.log("flutterwaveSecretKey", flutterwaveSecretKey);
      
      const verificationResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${flutterwaveSecretKey}`,
          "Content-Type": "application/json"
        }
      });

      const verificationData = await verificationResponse.json();
      console.log("Flutterwave verification response:", JSON.stringify(verificationData));

      const plan = verificationData.data.meta.plan;

      if (verificationData.status === "success" && verificationData.data.status === "successful") {
        // Payment verified successfully, now update subscription
        const userRef = db.collection("users").doc(userid);
        const userSnap = await userRef.get();
        
        if (!userSnap.exists) {
          console.error(`User ${userid} not found`);
          return {success: false, error: "User not found"};
        }
        
        const userData = userSnap.data();
        let subscription = userData.subscription || {};
        const currentDate = new Date();
        let newEndDate = new Date();
        
        // Determine if this is an upgrade from monthly to yearly
        const isUpgrade = plan === "yearly" && 
                        subscription.subscriptionType === "monthly" && 
                        subscription.status === "active";
                        
        console.log(`Subscription update - isUpgrade: ${isUpgrade}, current type: ${subscription.subscriptionType}, new type: ${plan}`);
        
        const now = new Date();
        const daysPassed = subscription.endDate ? 
          Math.ceil((now - subscription.endDate.toDate()) / (1000 * 60 * 60 * 24)) : 0;
      
        // Calculate subscription end date based on plan type (same logic as M-Pesa)
        if (plan === "monthly") {
          if (subscription.endDate && daysPassed > 6) {
            const currentEndDate = subscription.endDate.toDate();
            newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + 30);
          } else {
            newEndDate.setDate(currentDate.getDate() + 30);
          }
        } else if (plan === "yearly") {
          if (isUpgrade) {
            const currentEndDate = subscription.endDate.toDate();
            newEndDate = new Date(currentEndDate);
            const remainingDays = Math.max(0, Math.floor((currentEndDate - currentDate) / (1000 * 60 * 60 * 24)));
            newEndDate.setDate(newEndDate.getDate() + 365 - 30 + remainingDays);
            
            console.log(`Upgrade calculation: Current end date: ${currentEndDate.toISOString()}, Remaining days: ${remainingDays}, New end date: ${newEndDate.toISOString()}`);
          } else if (subscription.endDate && daysPassed > 6 && subscription.subscriptionType === "yearly") {
            const currentEndDate = subscription.endDate.toDate();
            newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + 365);
          } else {
            newEndDate.setDate(currentDate.getDate() + 365);
          }
        } else {
          console.error(`Invalid plan type: ${plan}`);
          return {success: false, error: "Invalid plan type"};
        }
        
        // Extract payment details from Flutterwave response
        const paymentDetails = {
          transactionId: transactionId,
          amount: verificationData.data.amount,
          currency: verificationData.data.currency,
          paymentType: verificationData.data.payment_type,
          transactionRef: txRef,
          customerEmail: verificationData.data.customer.email,
          customerPhone: verificationData.data.customer.phone_number,
          transactionDate: verificationData.data.created_at,
          flwRef: verificationData.data.flw_ref
        };
        
        // Create or update subscription data (same structure as M-Pesa)
        subscription = {
          plan: plan === "monthly" ? "Monthly Plan" : "Yearly Plan",
          startDate: admin.firestore.Timestamp.fromDate(currentDate),
          endDate: admin.firestore.Timestamp.fromDate(newEndDate),
          status: "active",
          accountType: userData.isbusinessaccount ? "business" : "normal",
          subscriptionType: plan,
          lastPayment: admin.firestore.Timestamp.fromDate(currentDate),
          paymentMethod: "Flutterwave",
          graceNotificationSent: false,
          lastPaymentDetails: paymentDetails
        };
        
        // Update user with subscription data
        await userRef.update({
          subscription: subscription,
          isbusinessaccount: true
        });
        
        console.log(`Subscription updated for user ${userid} with end date ${newEndDate.toISOString()}`);
        
        // Create notification for the user (same as M-Pesa)
        const notificationText = isUpgrade ? 
          "Your subscription has been upgraded to the Yearly Plan successfully." :
          `Your ${plan === "monthly" ? "Monthly" : "Yearly"} subscription has been activated successfully.`;
        
        await createNotificationForUser(userid, {
          title: isUpgrade ? "Subscription Upgraded" : "Subscription Activated",
          body: notificationText,
          type: "subscription",
          data: {
            subscriptionType: plan,
            endDate: newEndDate.toISOString(),
            receiptNumber: verificationData.data.flw_ref || transactionId
          },
          timestamp: admin.firestore.Timestamp.fromDate(currentDate)
        });
        
        return { 
          success: true, 
          message: "Payment verified and subscription updated successfully",
          subscription: subscription
        };
      } else {
        // Payment verification failed
        console.error(`Flutterwave payment verification failed for user ${userid}. Status: ${verificationData.status}`);
        
        // Create notification for failed verification
        await createNotificationForUser(userid, {
          title: "Payment Verification Failed",
          body: "Your payment could not be verified. Please contact support if you were charged.",
          type: "payment_failed",
          data: {
            transactionId: transactionId,
            txRef: txRef,
            status: verificationData.status
          },
          timestamp: admin.firestore.Timestamp.fromDate(new Date())
        });
        
        return { 
          success: false, 
          error: "Payment verification failed",
          details: verificationData
        };
      }
    } catch (error) {
      console.error("Error verifying Flutterwave payment:", error);
      
      // Create notification for verification error
      await createNotificationForUser(userid, {
        title: "Payment Processing Error",
        body: "There was an error processing your payment. Please contact support.",
        type: "payment_error",
        data: {
          transactionId: transactionId,
          txRef: txRef,
          error: error.message
        },
        timestamp: admin.firestore.Timestamp.fromDate(new Date())
      });
      
      return { 
        success: false, 
        error: error.message,
        message: "Failed to verify payment. Please try again later."
      };
    }
  });

  exports.onUserInvited = functions.firestore.document("events/{eventId}/users/{userId}").onUpdate(async (snapshot, context) => {
    const eventId = context.params.eventId;
    const userId = context.params.userId;

    console.log("eventId", eventId);
    console.log("userId", userId);

    // check if invited after is true and invited before is false
    const invitedAfter = snapshot.after.data().invited;
    const invitedBefore = snapshot.before.data().invited;
    if (invitedAfter && !invitedBefore) {
      const eventRef = db.collection("events").doc(eventId);
      // add user to attendee list if the list size is less than 5
      const eventSnap = await eventRef.get();
      const eventData = eventSnap.data();
      const attendeesList = eventData.attendees || [];
      if (attendeesList.length < 5) {
        attendeesList.push({id: userId, profilephoto: eventData.profilephoto || "https://via.placeholder.com/50"});
      }
      await eventRef.update({
        attendees: attendeesList
      });
    }

    return;
  });
