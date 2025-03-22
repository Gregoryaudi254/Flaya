// Import the required Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth,getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from 'firebase/storage';

import {getFunctions} from 'firebase/functions'


import { GeoFirestore } from 'geofirestore';
import { getDatabase } from 'firebase/database';







// Your Firebase configuration object (replace with your actual config from Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyARe5D_HvyEVE19hKBlj4H5Ww9q7ZnIpjg",
  authDomain: "flaya-9ebb2.firebaseapp.com",
  projectId: "flaya-9ebb2",
  storageBucket: "flaya-9ebb2.appspot.com",
  messagingSenderId: "584306140716",
  appId: "1:584306140716:web:04a01d128e466c87121389",
  measurementId: "G-XD5RDXV0N0",
 
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app); 

const functions = getFunctions(app);

// if (!firebase.apps.length) {
//   firebase.initializeApp(firebaseConfig);
// }



// Initialize Firebase services
const auth = initializeAuth(app,{
  persistence:getReactNativePersistence(AsyncStorage)
})
const db = getFirestore(app);// For Firestore database
// Initialize GeoFirestore
const geoFirestore = new GeoFirestore(db);
// Set auth persistence (only necessary for web);
const database = getDatabase(app)





// Export the services so you can use them in other files
export { auth, db , storage , functions, geoFirestore, database, app };
