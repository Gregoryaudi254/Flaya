
import * as Location from 'expo-location';
import { GeoPoint, doc ,setDoc, serverTimestamp} from 'firebase/firestore';
import { getData , storeData } from './localstorage';
import { db } from './firebase';
import { useEffect, useState ,useRef} from 'react';
import { AppState } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { getDownloadURL, uploadBytes,ref } from 'firebase/storage';
import { storage } from './firebase';
import * as Linking from 'expo-linking';

import { Alert } from 'react-native';
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export  const defaultProfileImage = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"




export async function registerForPushNotificationsAsync() {
  
}

export const goToGoogleMap = (lat,lon) => {
    const url = `https://www.google.com/maps?q=${lat},${lon}`;
    Linking.openURL(url).catch((err) => 
      console.error("Failed to open Google Maps")
    );
}



export const getRandomString = (length) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  
  return result;
}


export const getImageDownloadUrl = async (uri) => {
  const userinfo = await getData("@profile_info");

  const fileName = uri.split('/').pop(); // Get the file name from the URI
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error("Failed to fetch the image");
  }

  const mediaBlob = await response.blob();

  try {
    const storageRef = ref(storage, `uploads/images/${userinfo.uid}/${fileName}`);
    
    // Upload image to Firebase Storage
    const snapshot = await uploadBytes(storageRef, mediaBlob);

    // Get download URL
    const url = await getDownloadURL(snapshot.ref);

    console.log(url);
    return url;
  } finally {
    mediaBlob.close(); // Release Blob to free up memory
  }
};


export const useOnlineStatus = async () => {

  const appState = useRef(AppState.currentState);

  useEffect(() => {
     const handleAppStateChange = (nextAppState) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
           console.log("App has come to the foreground!");
           // Set online in Firebase
        } else if (nextAppState.match(/inactive|background/)) {
           console.log("App is in the background!");
           // Set offline in Firebase
        }
        appState.current = nextAppState;
     };

     const subscription = AppState.addEventListener('change', handleAppStateChange);

     return () => subscription.remove();
  }, []);
};





export const getDataBackend = async(callback,info,setRefreshing = null) =>{

   
    try {
      console.log("here fet");

      // Prepare the callable function
      const callbackFunction = httpsCallable(functions, callback);

      // Call the function with the user ID
      const response = await callbackFunction(info);

      const data = response.data;
      console.log('Response data:', data); // Log the result

      return data;
      
      // const response = await fetch(`https://us-central1-flaya-9ebb2.cloudfunctions.net/${callback}`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     id: userinfo.uid, // Replace with the actual userid
      //   }),
      // });
  
      // if (!response.ok) {
      //   // Log the status and status text for better debugging
      //   console.error('HTTP Error:', response.status, response.statusText);
      //   throw new Error('Failed to fetch posts');
      // }
  
      // const data = await response.json();
      // console.log('Response data:', data); // Log the 

     
      //return data;
      
    } catch (err) {
     
      console.log(err+"errrr");

      if (setRefreshing !== null) {
        setRefreshing(false);
      }
      
      return null;
    }

  }

  export const getLocation = async () => {

    try{
     
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {

        
        Alert.alert(
          "Location Permission Required",
          "We need your location to provide this feature. Please enable location access in settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
  
        return null
      }

      

      // Get the user's current location
      let currentLocation = await Location.getCurrentPositionAsync({});

      console.log("Location" + currentLocation);

      return currentLocation;

    }catch(e) {
      console.log("errogfr "+e);

      return null;
    }
    
  }


  export const storeUserLocation = async (location, uid) => {
    const userinfo = await getData('@profile_info');

    if (!uid || !location) return;


    if (userinfo) {

      userinfo.coordinates = {
        latitude:location.coords.latitude,
        longitude:location.coords.longitude
      };
      await storeData('@profile_info',userinfo)
    }

    await storeData('@stored_coordinates', {latitude:location.coords.latitude, longitude:location.coords.longitude})

    const userRef = doc(db, 'users', uid);
    // Set the document with user data

    console.log("storage ", JSON.stringify(location) )

    try{
      await setDoc(userRef, {coordinates: new GeoPoint(location.coords.latitude,location.coords.longitude)}, { merge: true });
    }catch(e){console.log("error")}
    
  }


  const updateInteranctions = async (uid,postid)=>{
    const userinfo = await getData('@profile_info');
    
    const ref = doc(db,`users/${uid}/posts/${postid}/sharings/${userinfo.uid}`)

    await setDoc(ref,userinfo,{merge:true});
  }
  
  export const handleSharePostPress =  async (mediaUrl, contentType, uid, postid, setDownloadProgress, setDialogDownLoad) => {
    try {

    
      setDownloadProgress(0)

      
      const getWatermarkedUrl = httpsCallable(functions, "getWatermarkedUrl");
  
      // Call the backend function
      const response = await getWatermarkedUrl({ mediaUrl, uid, type:contentType });
  
      if (!response.data.success) {
        console.log("Error fetching watermarked URL:", response.data.error);
        setDialogDownLoad(false)
        return;
      }
  
      const watermarkedUrl = response.data.watermarkedUrl;
      console.log("Watermarked URL:", watermarkedUrl);
  
      // Download the media file locally
      const localUri = FileSystem.documentDirectory + `shared-media.${contentType === "video" ? "mp4" : "jpg"}`;

      

      const downloadResumable = FileSystem.createDownloadResumable(
        watermarkedUrl,
        localUri,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress * 100);
        }
      );

      const download = await downloadResumable.downloadAsync(watermarkedUrl, localUri);
  
      if (!(await Sharing.isAvailableAsync())) {
        console.log("Sharing is not available on this device");
        setDialogDownLoad(false)
        return;
      }


      if (postid !== null) {
        updateInteranctions(uid,postid);
      }
      

      setDialogDownLoad(false);
  
      // Share the downloaded file
      await Sharing.shareAsync(download.uri);
    } catch (error) {
      console.log("Error sharing media:", error);
      setDialogDownLoad(false);
    }
  }


