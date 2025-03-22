import { useEffect, useRef, useCallback } from "react";
import { AppState } from "react-native";
import { ref, onValue, onDisconnect, set } from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";
import messaging from '@react-native-firebase/messaging';
import { getData } from "./localstorage";
import { db, database } from "./firebase";

const useOnlineStatus = () => {
  const appState = useRef(AppState.currentState);
  const unsubscribeRef = useRef(null);

  // ✅ Memoized function to update online status
  const updateUserOnlineStatus = useCallback(async (status) => {
    try {
      const userInfo = await getData("@profile_info");
      if (!userInfo?.uid) return;

      const myConnectionsRef = ref(database, `users/${userInfo.uid}/connections`);
      await set(myConnectionsRef, status);
    } catch (error) {
      console.error("Error updating online status:", error);
    }
  }, []);

  // ✅ Memoized function to set up onDisconnect
  const setUpOnDisconnect = useCallback(async () => {
    try {
      const userInfo = await getData("@profile_info");
      if (!userInfo?.uid) return;

      const connectedRef = ref(database, ".info/connected");
      const myConnectionsRef = ref(database, `users/${userInfo.uid}/connections`);

      const unsubscribe = onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === true) {
          onDisconnect(myConnectionsRef).set(false);
          updateUserOnlineStatus(true);
          console.log("Connected");
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up onDisconnect:", error);
    }
  }, [updateUserOnlineStatus]);

  // ✅ Memoized function to fetch and store FCM token
  const fetchFCMToken = useCallback(async () => {
    try {
      const authStatus = await messaging().requestPermission();
      if (
        authStatus !== messaging.AuthorizationStatus.AUTHORIZED &&
        authStatus !== messaging.AuthorizationStatus.PROVISIONAL
      ) {
        console.log("FCM permission not granted");
        return;
      }

      const token = await messaging().getToken();
      const userInfo = await getData("@profile_info");
      if (!userInfo?.uid) return;

      const userRef = doc(db, `users/${userInfo.uid}`);
      await updateDoc(userRef, { token });

      console.log("FCM Token:", token);
    } catch (error) {
      console.error("Error getting FCM token:", error);
    }
  }, []);

  // ✅ Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      unsubscribeRef.current = await setUpOnDisconnect();
    };
    initialize();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [setUpOnDisconnect]);

  // ✅ Fetch FCM token only once
  useEffect(() => {
    fetchFCMToken();
  }, [fetchFCMToken]);

  // ✅ Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        console.log("App has come to the foreground!");
        updateUserOnlineStatus(true);
      } else if (nextAppState.match(/inactive|background/)) {
        console.log("App is in the background!");
        updateUserOnlineStatus(false);
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [updateUserOnlineStatus]);
};

export default useOnlineStatus;
