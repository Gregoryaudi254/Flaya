import { linkWithCredential, signOut } from 'firebase/auth';
import { auth ,db} from '@/constants/firebase';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged,createUserWithEmailAndPassword,GoogleAuthProvider,signInWithCredential,signInAnonymously, signInWithEmailAndPassword,signInWithPhoneNumber,PhoneAuthProvider,EmailAuthProvider ,reauthenticateWithCredential,updatePassword,sendPasswordResetEmail} from 'firebase/auth';
import { doc, setDoc ,getDoc, updateDoc} from 'firebase/firestore';
import * as AuthSession  from 'expo-auth-session'

import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
//import * as Google from 'expo-auth-session/providers/google'
import { Toast, useToast } from 'react-native-toast-notifications';
import { deleteData, getData, storeData } from './localstorage';

import DeviceInfo from 'react-native-device-info';
import { useRouter } from 'expo-router';


//const router = useRouter();



//WebBrowser.maybeCompleteAuthSession();

import {
  GoogleSignin,
  GoogleSigninButton,
} from "@react-native-google-signin/google-signin";



const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setisAuthenticated] = useState(undefined);
  const [isAccountexist, setAccountExists] = useState(null);
  const [userInfo, setuserInfo] = useState(null);
  


  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "584306140716-cqj55jkteggfijs93jdrh1p36l3g2kkm.apps.googleusercontent.com",
    });
  }, []);

  async function reauthenticateUser(email, currentPassword) {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(email, currentPassword);
    
    try {
      await reauthenticateWithCredential(user, credential);
      console.log("Re-authentication successful.");

      return {status:'passed'}
    } catch (error) {
      console.log("Error during re-authentication:", error.message);

      return {status:'failed',error:'reauthentication failed'}
    }
  }


  async function changePassword(newPassword) {
    const user = auth.currentUser;
  
    try {
      await updatePassword(user, newPassword);

      console.log("Password updated successfully.");

      return {status:'passed'}
      
    } catch (error) {
      console.log("Error updating password:", error.message);

      return {status:'failed',error:'failed to update password'}
    }
  }


  async function updateUserPassword(email, currentPassword, newPassword) {
    try {
      console.log("Type of email:", typeof email);
      // Step 1: Re-authenticate the user
      const reauthResult = await reauthenticateUser(email, currentPassword);

      if (reauthResult.status !== "passed") {
        return reauthResult;
      }
      
      // Step 2: Update the password
       const result = await changePassword(newPassword);

       return result;
    } catch (error) {
      console.log("Error updating password:", error.message);

      return {status:"failed", error:"error updating password"}
    }
  }
  

  const handlePasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
     
      return {status:"passed"}
    } catch (error) {
      console.log("Error sending password reset email:", error.message);
      return {status:"failed",error:"Something went wrong"}
    }
  };
  

  const signInGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userDetails = await GoogleSignin.signIn();
  
      const credential = GoogleAuthProvider.credential(userDetails.data.idToken);
      let user;
  
      try {
        // Try to upgrade anonymous user
        await linkWithCredential(auth.currentUser, credential);
        user = auth.currentUser;
      } catch (error) {
        console.log('Linking error:', error);
  
        if (error.code === 'auth/credential-already-in-use') {
         
  
          // Sign in with Google account instead
          const result = await signInWithCredential(auth, credential);
          user = result.user;
        } else {
          throw error;
        }
      }
  
      if (!user) {
        console.error('Sign-in failed, user is undefined');
        return false;
      }
  
      await storeData('@auth_type', 'gmail');
  
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
  
      if (userDoc.exists()) {
        console.log('User already exists in Firestore.');
      } else {
        await setDoc(userRef, {
          version: 5,
          signintype: 'gmail',
          email: user.email,
          infoarray: [user.email],
          name: user.displayName || 'Anonymous',
        });
        console.log('User document created successfully.');
      }
  
      return true;
  
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      return false;
    }
  };
  

  const toast = useToast()

  

  function showToast(message){
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });

  }


  

  

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      if(user){
        setUser(user);

        try{

          if (user.isAnonymous){
            setisAuthenticated(true);
            return;
          }


          // First check if we have cached profile info
          const userinfo = await getData('@profile_info');

          if (userinfo) {
            setisAuthenticated(true);
            return;
          }

          // Get the user doc from Firestore
          const userRef = doc(db, `users/${user.uid}`); 
          const userDoc = await getDoc(userRef);
  
          if (userDoc.exists()) {
            // User exists in Firestore
            const userData = userDoc.data();
            console.log("User exists in Firestore:", userData);
            
            // Check if the user has completed profile setup (has a username)
            if (userData.username) {
              // User has completed profile setup
              const userInfo = {
                username: userData.username,
                profilephoto: userData.profilephoto,
                uid: userData.uid,
              };
              
              await storeData('@profile_info', userInfo);
              
              // Set up notification settings
              let settingsInfo = userData.settings || {};
              const notification = settingsInfo.notification || {};
              
              const settingsNotification = {
                comments: notification.comments || false,
                likes: notification.likes || false,
                subscribers: notification.subscribers || false,
                messages: notification.messages || false
              };
              
              const settings = {
                notification: settingsNotification,
                profileview: settingsInfo.profileview || 'everyone',
                onlinestatusarea: userData.isshowingonlinearea || false,
              };
              
              await storeData('@settings', settings);
              
              setisAuthenticated(true);
              setAccountExists(true);
              console.log("User authenticated with completed profile");
            } else {
              // User exists but hasn't completed profile setup
              console.log("User exists but profile not complete");
              setisAuthenticated(false);
              setAccountExists(false)
            }
          } else {
            // User does not exist in Firestore
            console.log("User does not exist in Firestore");
            setisAuthenticated(false);
          }
        } catch(e) {
          console.log("Error checking authentication:", e);
          setisAuthenticated(false);
        }
      } else {
        // No user signed in
        setUser(null);
        setisAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Function to log the user out
  const logout = async () => {
    
    await deleteData('@shared_posts');
    await deleteData('@liked_posts');
    await deleteData('@profile_info');
    await deleteData('@settings');
    await deleteData('@stored_coordinates')
    await signOut(auth);

    const userRef = doc(db, `users/${user.uid}`);
    await updateDoc(userRef, {isonline:false});
   
    setUser(null); 

    setisAuthenticated(undefined);

    //await GoogleSignin.signOut()
    
    // This will also trigger a global logout
  };

  // Sign in anonymously
  const signanonymously = async () => {

    try {
      const userCredential = await signInAnonymously(auth);
      console.log("user credenial "+userCredential)
      const user = userCredential.user;
      await storeData('@auth_type','anonymous');
  
      const detailsDevice = {
        deviceName: await DeviceInfo.getDeviceName(),
        brand: DeviceInfo.getBrand(),
        model: DeviceInfo.getModel(),
        systemVersion: DeviceInfo.getSystemVersion(),
        manufacturer: await DeviceInfo.getManufacturer(),
        ip: await DeviceInfo.getIpAddress()
      };
  
      const deviceid = await DeviceInfo.getUniqueId();
  
      const userRef = doc(db, 'users', user.uid);
  
      await setDoc(userRef, {
        uid: user.uid,
        version:5,
        name: 'Anonymous',
        signintype:'anonymous',
        createdAt: new Date().toISOString(),
        devicedetails:detailsDevice,
        devicecreatorid:deviceid
      });
  
      return true;

    } catch(e){
      console.log("error signing anonymously"+e)
      return false
    }
   
  };

  

  const signUp = async (email, password, name) => {
    try {


      const userCredential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(auth.currentUser, userCredential);
      const user = auth.currentUser;

      await storeData('@auth_type','email');

    
      try {
        // Create a reference to the user's document in the "users" collection
        const userRef = doc(db, 'users', user.uid);

        const userDetails = {
          signintype:'email',
          email: email,
          infoarray:[email],
          name: name || 'Anonymous', // Set default values if needed
        }
    
        // Set the document with user data
        await setDoc(userRef, userDetails,{merge:true}); // 'merge: true' allows merging with existing data
        console.log('User document successfully written!');

        return {status:"passed"}

        
      } catch (error) {
        console.error('Error writing user document: ', error);
      }
      
    } catch (error) {
      console.log('Error signing up:', error.message);

      return {status:'failed',error:"failed to sign in"}
    }
  };

  const signIn = async (email, password) => {

    try {
      
      await signInWithEmailAndPassword(auth, email, password);

      await storeData('@auth_type','email');

      return {status:"passed"}


    } catch (error) {
      console.log('Error signing in:', error.message);

      return {status:'failed',error:"failed to sign in"}
      
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAccountexist, signanonymously, logout,signUp,signIn,isAuthenticated ,updateUserPassword,handlePasswordReset,signInGoogle}}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
