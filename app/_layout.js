import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/useColorScheme';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { NavigationContainer } from '@react-navigation/native';
// Prevent the splash screen from auto-hiding before asset loading is complete.

import { MenuProvider } from 'react-native-popup-menu';
SplashScreen.preventAutoHideAsync();
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '@/constants/firebase';

import { onAuthStateChanged } from 'firebase/auth';

import LoadingScreen from '@/components/LoadingScreen';

import { useRouter } from 'expo-router'
import { AuthProvider } from '@/constants/AuthContext';
import { useAuth } from '@/constants/AuthContext';
import { ToastProvider } from 'react-native-toast-notifications'
import messaging from '@react-native-firebase/messaging';

import { Notifications } from 'react-native-notifications';
import PushNotification from "react-native-push-notification";
import { PermissionsAndroid } from 'react-native';


import { vexo } from 'vexo-analytics';

// Initialize Vexo with your API key
vexo('18acf8c8-1580-47e8-b90f-82f3d9253af6');






export default function RootLayout() {
  const colorScheme = useColorScheme();
 
  const [username,setusername] = useState(null)
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  
    if (enabled) {
      console.log('Authorization status:', authStatus);
    }
  }

  async function requestNotificationPermission() {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
  
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log("Notification permission granted");
    } else {
      console.log("Notification permission denied");
    }
  }

  const createChannel = () => {
    PushNotification.createChannel(
      {
        channelId: "default-channel-id", // Unique ID for your channel
        channelName: "Default Channel", // Visible name for users
        channelDescription: "A default channel for notifications", // Optional description
        importance: 4, // Importance level for notifications
        vibrate: true, // Enable vibration
      },
      (created) => console.log(`Channel created: ${created}`) // Callback indicating if the channel was created or already exists
    );
  }
  
  
  

  useEffect(() => {

    createChannel();

    requestUserPermission();

    requestNotificationPermission();
  
    messaging()
    .getInitialNotification()
    .then( async (remoteMessage) => {
        if (remoteMessage) {
          console.log("Notification caused"+ remoteMessage.notification)
        }
    });


    messaging()
    .onNotificationOpenedApp((remoteMessage) => {
      if (remoteMessage) {
        console.log("Notification caused background"+ remoteMessage.notification)
      }
    });

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log("Background"+ JSON.stringify(remoteMessage));

      const { title, body, profilephoto, postphoto } = remoteMessage.data;

      const notificationPayload = {
        channelId: "default-channel-id", // Use the channel ID you created
        title: title || "Default Title", // Notification title
        message: body || "Default Body", // Notification message // Show the image in the notification (Android)
        smallIcon: require('@/assets/icons/sendM.png'), // Ensure you have an icon in your drawable resources
        largeIconUrl: profilephoto, // (Optional) For larger icon displa
        priority: "high", // Ensure high priority for visibility
      }

      if (postphoto) {
        notificationPayload.bigPictureUrl = postphoto;
      }

      PushNotification.localNotification(notificationPayload);
    });

    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log("New"+ remoteMessage.notification)
    });


    return unsubscribe;
  },[])


  if (!loaded) {
    // Show loading screen while fonts or auth status is being checked
    return null;
  }




  return (
       <Provider store={store}>

        <ToastProvider>
        <AuthProvider>
        <MenuProvider>

        <ThemeProvider  value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>

         
        <GestureHandlerRootView>
        <Stack>
          
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation:'slide_from_right' }} />
          <Stack.Screen name="(profile)" options={{ headerShown: false }} />
          <Stack.Screen name="sharepost" options={{ headerShown: true ,title:"New post", animation:'slide_from_left'}} />
          <Stack.Screen name="sharestory" options={{ headerShown: true,title:"New story" ,animation:'slide_from_left'}} />
          <Stack.Screen name="story" options={{ headerShown: false , animation:'slide_from_right'}} />

          <Stack.Screen name="postpage" options={{ headerShown: false , animation:'slide_from_right'}} />
          <Stack.Screen name="oppuserprofile" options={{ headerShown: false , animation:'slide_from_right'}} />
          <Stack.Screen name="chatglobal" options={{ headerShown: true,title:'', animation:'slide_from_right',headerBackVisible:false }} />
          <Stack.Screen name="tagscomponent" options={{ headerShown: false }} />

          <Stack.Screen name="eventdetails" options={{ headerShown: true,title:'', animation:'slide_from_right' }} />
          <Stack.Screen name="businessContact" options={{ headerShown: true,title:'', animation:'slide_from_right' }} />

          <Stack.Screen name="events" options={{ headerShown: true,title:'', animation:'slide_from_right' }} />
          <Stack.Screen name="businesses" options={{ headerShown: true,title:'', animation:'slide_from_right' }} />
          <Stack.Screen name="search" options={{ headerShown: false,title:'', animation:'slide_from_right' }} />

          <Stack.Screen name="subscriptionPage" options={{ headerShown: false,title:'', animation:'slide_from_right' }} />

          <Stack.Screen name="textToImage" options={{ headerShown: false,title:'', animation:'slide_from_right' }} />
        </Stack>
          
        </GestureHandlerRootView>
          
        </ThemeProvider>

        </MenuProvider>

        </AuthProvider>

        </ToastProvider>
       
        
       
     </Provider>
    
   
  );
}
