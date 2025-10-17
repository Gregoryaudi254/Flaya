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
  apiKey: "AIzaSyDCLaGP03dfV-oKaF1_vzMbqYkFRR888c8",
  authDomain: "flaya-40942.firebaseapp.com",
  projectId: "flaya-40942",
  storageBucket: "flaya-40942.firebasestorage.app",
  messagingSenderId: "724255769414",
  appId: "1:724255769414:web:9e880bcd0c13993b245b47",
  measurementId: "G-KWZV8RKPQC"
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
