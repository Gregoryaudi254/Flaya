import { StyleSheet, Text, View,TouchableOpacity,Image, FlatList,TextInput,Dimensions ,Pressable,Modal,Animated,TouchableWithoutFeedback,ActivityIndicator} from 'react-native'
import React,{useLayoutEffect, useState,useEffect,useRef,useMemo,useCallback} from 'react'

import { useNavigation,useLocalSearchParams, router } from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient'
import { Data } from '@/constants/Data';
import ChatItem from '@/components/ChatItem';

import { Colors } from '@/constants/Colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/constants/firebase';


import ScalablePressable from '@/components/ScalablePressable';
import moment from 'moment';
import { useSelector, useDispatch } from 'react-redux';

import { removeMessage } from '@/slices/requestmessageSlice';

import ImageView from "react-native-image-viewing";
import { getData} from '@/constants/localstorage';
import { doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, getDoc, collection ,updateDoc,where, getDocs, limit, startAfter, writeBatch} from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { Linking } from 'react-native';
import { timeAgo } from '@/constants/timeAgo';
import { getLocation } from '@/constants/common';
import { useToast } from 'react-native-toast-notifications';

import { useColorScheme } from '@/hooks/useColorScheme';
import * as Clipboard from 'expo-clipboard';
import { setData } from '@/slices/dataChangeSlice';

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import FloatingButton from '@/components/FloatingButton';
import LocationPickerBottomsheet from '@/components/LocationPickerBottomsheet';

// Memoized typing indicator component
const TypingIndicator = React.memo(({ visible, oppUsername, colorScheme, animations }) => {
  if (!visible) return null;
  
  return (
    <Animated.View style={[styles.typingIndicator, {
      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    }]}>
      <View style={styles.typingDots}>
        <Animated.View style={[styles.typingDot, { 
          backgroundColor: Colors.blue,
          opacity: animations.dot1 
        }]} />
        <Animated.View style={[styles.typingDot, { 
          backgroundColor: Colors.blue,
          opacity: animations.dot2 
        }]} />
        <Animated.View style={[styles.typingDot, { 
          backgroundColor: Colors.blue,
          opacity: animations.dot3 
        }]} />
      </View>
      <Text style={[styles.typingText, {
        color: colorScheme === 'dark' ? '#888' : '#666'
      }]}>
        {oppUsername} is typing...
      </Text>
    </Animated.View>
  );
});
TypingIndicator.displayName = 'TypingIndicator';

// Memoized reply container component
const ReplyContainer = React.memo(({ isReplying, selectedItem, userInfo, oppUser, colorScheme, onCloseReply }) => {
  if (!isReplying || !selectedItem) return null;

  return (
    <View style={[styles.modernReplyContainer, {
      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
      borderLeftColor: Colors.blue,
    }]}>
      <View style={styles.replyHeader}>
        <Ionicons name="return-up-forward" size={16} color={Colors.blue} />
        <Text style={[styles.replyLabel, { color: Colors.blue }]}>
          Replying to {selectedItem.senderid === userInfo?.uid ? 'yourself' : oppUser.username}
        </Text>
        
        <TouchableOpacity onPress={onCloseReply} style={styles.closeReplyButton}>
          <Ionicons 
            name="close" 
            size={18} 
            color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.replyContent}>
        {selectedItem.messageType === 'text' ? (
          <Text numberOfLines={2} style={[styles.replyText, {
            color: colorScheme === 'dark' ? '#AAA' : '#666'
          }]}>
            {selectedItem.message}
          </Text>
        ) : selectedItem.messageType === 'image' ? (
          <View style={styles.replyImageContainer}>
            <Image style={styles.replyImage} source={{uri: selectedItem.images[0]}} />
            <Text style={[styles.replyText, {
              color: colorScheme === 'dark' ? '#AAA' : '#666'
            }]}>
              Photo
            </Text>
          </View>
        ) : (
          <View style={styles.replyLocationContainer}>
            <Ionicons
              name="location"
              size={16}
              color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}
            />
            <Text numberOfLines={1} style={[styles.replyText, {
              color: colorScheme === 'dark' ? '#AAA' : '#666'
            }]}>
              {selectedItem.location.address}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});
ReplyContainer.displayName = 'ReplyContainer';

// Memoized footer component
const ChatFooterComponent = React.memo(({ loadingmore }) => {
  return loadingmore ? (
    <View style={{marginTop: 10}}>
      <ActivityIndicator size="large" color="white" />
    </View>
  ) : null;
});
ChatFooterComponent.displayName = 'ChatFooterComponent';

const chatglobal = React.memo(() => {

    const dispatch = useDispatch();
    const colorScheme = useColorScheme();
    const toast = useToast();
    const navigation = useNavigation();

    // Memoized toast function
    const showToast = useCallback((message) => {
      toast.show(message, {
        type: "normal",
        placement: "bottom",
        duration: 2000,
        offset: 30,
        animationType: "zoom-in",
      });
    }, [toast]);

    // Parse opponent user data
    const { data } = useLocalSearchParams();
    const oppUser = useMemo(() => JSON.parse(data), [data]);
    const isRequestaccepted = oppUser.requeststatus;

    console.log("isRequestaccepted" + JSON.stringify(isRequestaccepted))

    // Grouped state for better performance
    const [chatState, setChatState] = useState({
      isChatAccepted: null,
      isrequest: null,
      isInteracted: false,
      hasStories: null,
      oppuseronline: null,
      oppuserlastseen: null,
      oppusertyping: null,
      iscurrentUserBlocked: false,
    });

    const [uiState, setUiState] = useState({
      text: '',
      isTyping: false,
      showDialog: false,
      dialogType: 'popup',
      isReplying: false,
      imageViewerVisible: false,
      isBottomReached: true,
      loadingmore: false,
      textdeleteStatus: '',
    });

    const [dataState, setDataState] = useState({
      userInfo: null,
      selectedItem: null,
      selectedImages: null,
      userLocation: {
        latitude: -1.2921,  // Nairobi coordinates as default
        longitude: 36.8219,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      },
      address: null,
      oppuserprofile: null,
      incomingMessage: null,
    });

    // Separate independent state for chats and pagination
    const [chats, setChats] = useState([]);
    const [lastVisibleChat, setLastVisible] = useState(null);

    // Refs
    const flatListRef = useRef(null); 
    const bottomSheetRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const isFirstSnapshot = useRef(true);

    // Memoized constants
    const initialSnapIndex = useMemo(() => -1, []);
    const snapPoinst = useMemo(() => ['45%', '75%'], []);

    // Animated typing dots
    const typingAnimation1 = useRef(new Animated.Value(0.4)).current;
    const typingAnimation2 = useRef(new Animated.Value(0.4)).current;
    const typingAnimation3 = useRef(new Animated.Value(0.4)).current;

    // Optimized typing animation effect
    useEffect(() => {
      if (chatState.oppusertyping) {
        const animateTyping = () => {
          Animated.sequence([
            Animated.timing(typingAnimation1, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(typingAnimation2, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(typingAnimation3, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(typingAnimation1, { toValue: 0.4, duration: 300, useNativeDriver: true }),
            Animated.timing(typingAnimation2, { toValue: 0.4, duration: 300, useNativeDriver: true }),
            Animated.timing(typingAnimation3, { toValue: 0.4, duration: 300, useNativeDriver: true }),
          ]).start(() => {
            if (chatState.oppusertyping) animateTyping();
          });
        };
        animateTyping();
      } else {
        typingAnimation1.setValue(0.4);
        typingAnimation2.setValue(0.4);
        typingAnimation3.setValue(0.4);
      }
    }, [chatState.oppusertyping, typingAnimation1, typingAnimation2, typingAnimation3]);

    // Optimized address fetch effect
    useEffect(() => {
      const fetchAddress = async () => {
        if (dataState.userLocation) {
          const coords = { 
            latitude: dataState.userLocation.latitude, 
            longitude: dataState.userLocation.longitude 
          };

          try {
            const [address] = await Location.reverseGeocodeAsync(coords);
            setDataState(prev => ({ ...prev, address }));
          } catch (error) {
            console.error("Error during reverse geocoding:", error);
          }
        }
      };

      fetchAddress();
    }, [dataState.userLocation]);

    // Optimized region change handler
    const handleRegionChangeComplete = useCallback((region) => {
      setDataState(prev => ({ ...prev, userLocation: region }));
    }, []);

    // Optimized typing animations
    const typingAnimations = useMemo(() => ({
      dot1: typingAnimation1,
      dot2: typingAnimation2,
      dot3: typingAnimation3,
    }), [typingAnimation1, typingAnimation2, typingAnimation3]);

    // Optimized typing handler
    const handleTyping = useCallback(async (inputText) => {
      setUiState(prev => ({ ...prev, text: inputText, isTyping: !!inputText }));

      if (!chatState.isInteracted) return;
  
      const oppMessageRef = doc(db, `users/${oppUser.uid}/messages/${dataState.userInfo.uid}`);
  
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
  
      if (inputText) {
        await updateDoc(oppMessageRef, { typing: true });
        typingTimeoutRef.current = setTimeout(async () => {
          await updateDoc(oppMessageRef, { typing: false });
        }, 3000);
      } else {
        await updateDoc(oppMessageRef, { typing: false });
      }
    }, [chatState.isInteracted, oppUser.uid, dataState.userInfo?.uid]);
    
   

    const getRequestState = async() => {
      const profileInfo = await getData('@profile_info');
      console.log(profileInfo.uid +" and " + JSON.stringify(oppUser.uid))
      const messageRef = doc(db,`users/${profileInfo.uid}/messages/${oppUser.uid}`);

      const snap = await getDoc(messageRef);

      if (snap.exists()) {
        const data = snap.data();
         // Set `isrequestaccepted` only if it exists in the data

         if (data.isrequestaccepted !== undefined) {
          setChatState(prev => ({ ...prev, isChatAccepted: data.isrequestaccepted }));
          } else {
              setChatState(prev => ({ ...prev, isChatAccepted: true }));
          }

          const isrequest = data.isrequest;
          setChatState(prev => ({ ...prev, isrequest: isrequest }));

      
      }else {
        setChatState(prev => ({ ...prev, isChatAccepted: true, isrequest: false }));
      }
    }

    useEffect(()=>{
      if (isRequestaccepted !== null) {
        setChatState(prev => ({ ...prev, isrequest: oppUser.isrequest }));
        setChatState(prev => ({ ...prev, isChatAccepted: isRequestaccepted }));
      }else{
        console.log("running here")
        getRequestState();
      }
    },[])

    // Optimized event handlers with useCallback
    const handleHeaderLeftPress = useCallback(() => {
      router.back();
    }, []);

    const handleProfilePress = useCallback(() => {
      router.push({
        pathname: '/oppuserprofile',
        params: { uid: oppUser.uid }
      });
    }, [oppUser.uid]);

    const [showLocationSheet, setShowLocationSheet] = useState(false);

    const showSheet = useCallback(() =>{
      bottomSheetRef.current?.snapToIndex(0);
      bottomSheetRef.current?.snapToIndex(0);
    },[bottomSheetRef])

    const handleLocationPress = useCallback(() => {
      setShowLocationSheet(true);

      setTimeout(() => {
        showSheet()
      }, 3000); // Let it mount first before snapping
      
    }, []);

    const handleCloseDialog = useCallback(() => {
      setUiState(prev => ({ ...prev, showDialog: false }));
    }, []);

    const handleReply = useCallback(() => {
      setUiState(prev => ({ ...prev, isReplying: !prev.isReplying, showDialog: false }));
    }, []);

    const scrollToChatItem = useCallback((chatId) => {
      const index = chats.findIndex((chat) => chat.id === chatId);
      if (index !== -1) {
        flatListRef.current?.scrollToIndex({ animated: true, index });
      }
    }, [chats]);

    const scrollToBottom = useCallback(() => {
      flatListRef.current?.scrollToIndex({ animated: true, index: 0 });
    }, []);

    const openGoogleMaps = useCallback((latitude, longitude) => {
      const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      Linking.openURL(url).catch(err => console.error("Error opening Google Maps", err));
    }, []);

    // Optimized item press handler
    const handleItemPress = useCallback((item) => {
      if (item.messageType === "image") {
        const objectList = item.images.map(uri => ({ uri }));
        setDataState(prev => ({ ...prev, selectedImages: objectList }));
        setUiState(prev => ({ ...prev, imageViewerVisible: true }));
      } else if (item.messageType === "location") {
        openGoogleMaps(item.location.latitude, item.location.longitude);
      }
    }, [openGoogleMaps]);

    // Optimized long press handler
    const handleLongPress = useCallback(async (item) => {
      if (item.isdeleted) return;

      const userinfo = await getData('@profile_info');
      const deleteStatus = userinfo.uid === item.senderid ? "Delete for everyone" : "Delete for you";

      setUiState(prev => ({ 
        ...prev, 
        isReplying: false, 
        showDialog: true,
        dialogType: 'popup',
        textdeleteStatus: deleteStatus
      }));
      setDataState(prev => ({ ...prev, selectedItem: item }));
    }, []);

    // Optimized swipe reply handler
    const handleSwipeReply = useCallback((message) => {
      setDataState(prev => ({ ...prev, selectedItem: message }));
      setUiState(prev => ({ ...prev, isReplying: true }));
      if (Haptics && Haptics.impactAsync) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }, []);

    // Optimized render item with memoization
    const renderItem = useCallback(({ item, index }) => (
      <ScalablePressable
        item={item}
        onReplySelect={scrollToChatItem}
        currentuserid={dataState.userInfo?.uid}
        onPress={() => handleItemPress(item)}
        prevItem={(index + 1) < chats.length ? chats[index + 1] : null}
        onLongPress={() => handleLongPress(item)}
        onSwipeReply={handleSwipeReply}
      />
    ), [dataState.userInfo?.uid, chats, scrollToChatItem, handleItemPress, handleLongPress, handleSwipeReply]);

    // Optimized load more function
    const loadMoreChats = useCallback(async () => {
      if (uiState.loadingmore || !lastVisibleChat) return;

      setUiState(prev => ({ ...prev, loadingmore: true }));
      
      try {
      const profileInfo = await getData('@profile_info');
      const chatRef = collection(db, `users/${profileInfo.uid}/messages/${oppUser.uid}/chats`);
        const q = query(chatRef, orderBy('timestamp', 'desc'), startAfter(lastVisibleChat), limit(10));

        const moreSnapshot = await getDocs(q);
        const moreChats = moreSnapshot.docs.map(doc => ({
        ...doc.data(),
        status: 'sent',
    }));

        setLastVisible(moreSnapshot.docs[moreSnapshot.docs.length - 1]);
        setChats(prevChats => [...prevChats, ...moreChats]);
      } catch (error) {
        console.error('Error loading more chats:', error);
      } finally {
        setUiState(prev => ({ ...prev, loadingmore: false }));
      }
    }, [uiState.loadingmore, lastVisibleChat, oppUser.uid]);

    // Memoized header component for FlatList
    const headerComponent = useMemo(() => 
      <ChatFooterComponent loadingmore={uiState.loadingmore} />, 
      [uiState.loadingmore]
    );

   
    // Optimized Firebase listeners
    useEffect(() => {
      let unsubscribeProfile = null;
      let unsubscribeMessages = null;

      const setupFirebaseListeners = async () => {
        try {
          const profileInfo = await getData('@profile_info');
          if (!profileInfo) return;

          setDataState(prev => ({ ...prev, userInfo: profileInfo }));

          // Listen to opponent's profile changes
          const oppProfileRef = doc(db, 'users', oppUser.uid);
          unsubscribeProfile = onSnapshot(oppProfileRef, (doc) => {
            if (doc.exists()) {
              const profileData = doc.data();
              setChatState(prev => ({
                ...prev,
                oppuseronline: profileData.isonline,
                oppuserlastseen: profileData.lastactive,
                hasStories: profileData.hasStories || false,
                iscurrentUserBlocked: profileData.blockedUsers?.includes(profileInfo.uid) || false
              }));
              setDataState(prev => ({ ...prev, oppuserprofile: profileData }));
            }
          });

          // Listen to message metadata
          const messageRef = doc(db, `users/${profileInfo.uid}/messages/${oppUser.uid}`);
          unsubscribeMessages = onSnapshot(messageRef, (doc) => {
            if (doc.exists()) {
             
              const messageData = doc.data();
              setChatState(prev => ({
                ...prev,
                isChatAccepted: messageData.isrequestaccepted,
                isrequest: messageData.isrequest,
                isInteracted: true,
                oppusertyping: messageData.typing || false
              }));
            }
          });
            
          } catch (error) {
          console.error('Error setting up Firebase listeners:', error);
        }
      };

      setupFirebaseListeners();

      // Cleanup function
      return () => {
        if (unsubscribeProfile) unsubscribeProfile();
        if (unsubscribeMessages) unsubscribeMessages();
      };
    }, [oppUser.uid]);

    // Listen to new messages with user's specific flow
    const listenNewMessages = useCallback(async (callback) => {
      const profileInfo = await getData('@profile_info');

      const chatRef = collection(db, `users/${profileInfo.uid}/messages/${oppUser.uid}/chats`);

      // Initial load with limit
      const initialLoadQuery = query(chatRef, orderBy('timestamp', 'desc'), limit(15));
      const initialSnapshot = await getDocs(initialLoadQuery);

      const initialChats = initialSnapshot.docs.map(doc => ({
        ...doc.data(),
        status: 'sent',
    }));

    setLastVisible(initialSnapshot.docs[initialSnapshot.docs.length - 1]); // Save the last document
    callback(initialChats, true);

      // Record timestamp after initial load to prevent loading all messages
      const loadTimestamp = new Date();

      // Real-time listener with timestamp filter to detect only new documents
      const realtimeQuery = query(chatRef, where('timestamp', '>', loadTimestamp), orderBy('timestamp', 'desc'));

      return onSnapshot(realtimeQuery, (snapshot) => {
        console.log("something changed");


          snapshot.docChanges().forEach((change) => {
          console.log("changed");
          callback(change.doc.data(), false, change.type);
          });
      });
    }, [oppUser.uid]);

    // Chat listeners using user's specific flow
    useEffect(() => {
      let unsubscribe;

      // Call the async function and set the unsubscribe function
      (async () => {
        unsubscribe = await listenNewMessages((messages, initial, type = null) => {
              setChats((prevChats) => {
                if (initial) {
              return messages;
            } else {
              console.log("here");
                  const chatIndex = prevChats.findIndex(message => message.id === messages.id);

                  if (chatIndex > -1) { // Message is already in the list
                      // Replace the existing message without changing its position
                console.log("replaced " + JSON.stringify(messages));
                      return prevChats.map((oldmessage, index) =>
                  index === chatIndex ? { ...messages, status: 'sent' } : oldmessage
                    );
                  } else {
                      if (type === 'added') {
                  console.log("added");
                        // New message not in the list, add it to the top
                  setDataState(prev => ({ ...prev, incomingMessage: messages }));
                  return [{ ...messages, status: 'sent' }, ...prevChats];
                } else if (type === 'modified') {
                  console.log("modified");
                        return prevChats;
                      }
                  }
                }
              });
          });
      })();

      return () => {
          if (unsubscribe) unsubscribe();
      };
    }, [listenNewMessages]);

    // Optimized header setup
    useLayoutEffect(() => {
        navigation.setOptions({
          headerShown: true,
          
          headerTitle: () => (
            <View style={[styles.modernHeaderContainer, {
              backgroundColor: colorScheme === 'dark' ? 'transparent' : 'transparent',
            }]}>

                <TouchableOpacity  
                  onPress={handleHeaderLeftPress}
                  style={[styles.modernBackButton, {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  }]}
                  activeOpacity={0.7}
                >
                    <Ionicons 
                      name="chevron-back" 
                      size={16} 
                      color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} 
                    />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleProfilePress}
                  style={styles.modernProfileSection}
                  activeOpacity={0.8}
                >

                  <View style={styles.profileRow}>

                    {/* Enhanced Profile Image with Stories */}
                    <View style={styles.profileImageContainer}>
                 <LinearGradient
                         colors={chatState.hasStories ? ['#FF7F50', '#FF6347', '#FF4500'] : ['transparent', 'transparent']} 
                         style={[styles.modernGradient, {
                           padding: chatState.hasStories ? 3 : 0,
                         }]}
                         start={{ x: 0, y: 0 }}
                         end={{ x: 1, y: 1 }}
                >
                    <Image
                    resizeMode="cover"
                          source={dataState.oppuserprofile !== null ? {uri: dataState.oppuserprofile.profilephoto} : require('@/assets/icons/user.png')}
                          style={[styles.modernProfileImage, {
                            borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                            borderWidth: chatState.hasStories ? 0 : 2,
                          }]}
                           />
                </LinearGradient>

                      {/* Online Status Indicator */}
                      {chatState.oppuseronline && (
                        <View style={[styles.onlineStatusIndicator, {
                          backgroundColor: '#22C55E',
                          borderColor: colorScheme === 'dark' ? Colors.dark_background : Colors.light_background,
                        }]} />
                      )}
                     </View>

                  <View style={styles.modernUserInfo}>

                    <View style={styles.usernameRow}> 
                                
                        <Text style={[styles.modernUsername, {
                          color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main
                        }]}>
                          {oppUser.username}
                        </Text>
            
                        {(oppUser.verified) && 
                          <Image
                                          resizeMode="contain"
                                          source={require('@/assets/icons/verified.png')}
                          style={{
                            width: 20,
                            height: 20,    
                            paddingRight: 25,
                          }}
                        />
                        }
                              
                    </View>

                    {/* Enhanced Status Text */}
                    {chatState.oppuserlastseen !== null && (
                      <View style={styles.statusContainer}>
                        {chatState.oppusertyping ? (
                          <View style={styles.typingStatusContainer}>
                            <View style={styles.typingDots}>
                              <Animated.View style={[styles.miniTypingDot, { 
                                backgroundColor: Colors.blue,
                                opacity: typingAnimation1 
                              }]} />
                              <Animated.View style={[styles.miniTypingDot, { 
                                backgroundColor: Colors.blue,
                                opacity: typingAnimation2 
                              }]} />
                              <Animated.View style={[styles.miniTypingDot, { 
                                backgroundColor: Colors.blue,
                                opacity: typingAnimation3 
                              }]} />
                            </View>
                            <Text style={[styles.modernStatusText, { color: Colors.blue }]}>
                              typing...
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.modernStatusText, {
                            color: chatState.oppuseronline ? '#22C55E' : (colorScheme === 'dark' ? '#888' : '#666')
                          }]}>
                            {chatState.oppuseronline ? 'online' : timeAgo(chatState.oppuserlastseen)}
                          </Text>
                        )}
                      </View>
                    )}

                    </View>

                </View>

                  </TouchableOpacity>

                </View>
               
               
              )
         
        });
    }, [
      navigation, 
      colorScheme, 
      oppUser.username, 
      oppUser.verified,
      dataState.oppuserprofile, 
      chatState.oppuseronline,
      chatState.oppuserlastseen,
      chatState.oppusertyping,
      chatState.hasStories,
      typingAnimation1,
      typingAnimation2,
      typingAnimation3,
      handleHeaderLeftPress,
      handleProfilePress
    ]);

    // Optimized scroll tracking
    const scrollY = useRef(new Animated.Value(0)).current;
    const viewabilityConfig = useMemo(() => ({
      itemVisiblePercentThreshold: 50,
    }), []);

    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
      const isBottom = viewableItems.some(item => item.index === 0);
      setUiState(prev => ({ ...prev, isBottomReached: isBottom }));
    }, []);

     // Memoized FlatList props for optimal performance
     const flatListProps = useMemo(() => ({
      bounces: true,
      ref: flatListRef,
      onEndReached: loadMoreChats,
      onEndReachedThreshold: 0.5,
      keyExtractor: (post) => post.id,
      ListFooterComponent: headerComponent,
      onScroll: Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      ),
      viewabilityConfig: viewabilityConfig,
      onViewableItemsChanged: onViewableItemsChanged,
      scrollEventThrottle: 16,
      inverted: true,
      renderItem: renderItem,
      data: chats,
      // Performance optimizations
      removeClippedSubviews: true,
      maxToRenderPerBatch: 17,
      windowSize: 17,
      initialNumToRender: 17,
      getItemLayout: null, // Better for dynamic heights
    }), [
      loadMoreChats,
      headerComponent,
      scrollY,
      viewabilityConfig,
      onViewableItemsChanged,
      renderItem,
      chats
    ]);


    // Optimized cleanup effect
    useEffect(() => {
      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }, []);

    // Crucial: Set read status for incoming messages
    useEffect(() => {
      const setReadMessage = async () => {

        console.log('Setting read status for incoming e');

        if (!chatState.isInteracted || chatState.isInteracted === null)return;

        if (dataState.incomingMessage !== null) {
          const userinfo = await getData('@profile_info');

          if (userinfo.uid !== dataState.incomingMessage.receiverid) {
            console.log("incoming message not for this user");
          return;
        }

        }
       

        console.log('Setting read status for incoming message');

        const batch = writeBatch(db);
        const userinfo = await getData('@profile_info');

        const oppMessageRef = doc(db, `users/${oppUser.uid}/messages/${userinfo.uid}`);
        batch.update(oppMessageRef, { isoppread: true, stamp:serverTimestamp() });

        const messageRef = doc(db, `users/${userinfo.uid}/messages/${oppUser.uid}`);
        batch.update(messageRef, { isread: true, stamp:serverTimestamp() });

        try {
          await batch.commit();
          console.log("Batch operations committed successfully!");
        } catch (error) {
          console.error("Error committing batch operations:", error);
        }
      };

      setReadMessage();
    }, [dataState.incomingMessage,chatState.isInteracted,oppUser.uid]);

      const handleSendMessage = async (messageType = 'text', content = null) =>{

        const userInfo = await getData('@profile_info');

        const id = Math.random().toString(36).substr(2, 9);

        const newMessage = {
          id: id, // Unique ID
          timestamp:serverTimestamp(),
          status: 'sending',
          senderid: userInfo.uid,
          receiverid:oppUser.uid,
          messageType,
           ...(messageType === 'text' ? { message: uiState.text } :
            messageType === 'image' ?{ images: content } : {location:content}), // Simulated sender ID
        };

        if(uiState.isReplying){
          newMessage.mainmessage = {
            sendername:dataState.selectedItem.senderid === userInfo.uid ? userInfo.username:oppUser.username,
            ...(dataState.selectedItem.messageType === 'text' ? { message: dataState.selectedItem.message } :
              dataState.selectedItem.messageType === 'image' ?{ images: dataState.selectedItem.images } : {location:dataState.selectedItem.location}),
            messageType:dataState.selectedItem.messageType,
            id:dataState.selectedItem.id,
            ...(dataState.selectedItem.messageType === 'text' ? { message: dataState.selectedItem.message } :
            dataState.selectedItem.messageType === 'image' ? { image: dataState.selectedItem.images[0] } : {location:dataState.selectedItem.location})
          }
        }

        setChats(prev => [newMessage, ...prev]);

        setUiState(prev => ({ ...prev, isTyping: false }));

        setUiState(prev => ({ ...prev, text: '' }));

        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
        }, 100);

        setUiState(prev => ({ ...prev, isReplying: false }));

        simulateSendMessage(newMessage,userInfo.uid)

      }

      const simulateSendMessage = async (newMessage,userid) => {

        let urls = []

        const userInfo = await getData('@profile_info');

        if (newMessage.messageType === 'image') {

          console.log("newMessageimages",newMessage.images);


          for (const uri of newMessage.images) {

            const fileName = uri.split('/').pop(); // Get the file name from the URI
            const response = await fetch(uri);
  
            const storageRef = ref(storage, `uploads/images/${userInfo.uid}/${fileName}`);
  
            if(!response.ok){
              throw new Error("Failed")
            }
  
           const mediaBlob = await response.blob();
  
            // Create the upload task
            const uploadTask = uploadBytesResumable(storageRef, mediaBlob
                 // This assumes uri is in the correct format for upload
            );
  
            // Monitor the upload progress
            await new Promise((resolve, reject) => {
    
              uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                       
                        
                    },
                    (error) => {
                        console.error('Upload error:', error);
                        reject(error); // Reject the promise on error
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        urls.push(downloadURL); // Add the download URL to the list
                        resolve(); // Resolve the promise
                    }
                );
            });
          }
  

        }

    
        const chatRef = doc(db,`users/${userid}/messages/${oppUser.uid}/chats/${newMessage.id}`);

        await setDoc(chatRef,{...newMessage, ...(newMessage.messageType === 'image'? {images:urls} : {})});

        setChats(prev => prev.map((msg) =>
            msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
        ));

      
      };


      const pickImageAsync = async () => {

        let result = await ImagePicker.launchImageLibraryAsync({
          
          //mediaTypes: ImagePicker.MediaTypeOptions.All,
          quality: 1,
          allowsMultipleSelection:true
        });
    
        if (!result.canceled) {
           const selectedImages = result.assets.map((asset) => asset.uri);
           handleSendMessage('image', selectedImages);
        } 
      };


      const [selectionMode, setSelectionMode] = useState(false);

      const handlePress = (itemId) => {
        if (selectionMode) {
          toggleSelection(itemId);
        } else {
          // Handle normal press behavior when not in selection mode
        }
      };

      const toggleSelection = (itemId) => {
        setChats(prev => prev.map((chat) =>
            chat.id === itemId ? { ...chat, selected: !chat.selected } : chat
        ));
      };

      const CustomDialog = ({ isVisible,onclose,children, ...rest}) => {
        const content = (
          <TouchableWithoutFeedback onPress={onclose}>
            <View style={{alignItems:'center',justifyContent:'center',flex:1,backgroundColor:'rgba(0, 0, 0, 0.5)'}}>
            {children}
            </View>
          </TouchableWithoutFeedback>
        )
      
        return (
          <Modal 
          visible={isVisible} 
          transparent
          statusBarTranslucent
          animationType='fade' 
          {...rest}
           >
            {content}
          </Modal>
        );
      };

      const handleOnSendLocationPress = () =>{
        const location = {
          latitude:dataState.userLocation.latitude,
          longitude:dataState.userLocation.longitude,
          address:dataState.address.formattedAddress
        }
        handleSendMessage('location',location)
        bottomSheetRef.current?.close();
      }

      const deleteChatItem = useCallback(async () => {

        const userInfo = await getData('@profile_info')

        const batch = writeBatch(db); // Initialize the batch

        const deleteChatRef = doc(db, `users/${userInfo.uid}/messages/${oppUser.uid}/chats/${dataState.selectedItem.id}`);
        const deleteOppChatRef = doc(db, `users/${oppUser.uid}/messages/${userInfo.uid}/chats/${dataState.selectedItem.id}`);

        // Add the updates to the batch
        batch.update(deleteChatRef, { isdeleted: true });

        if (dataState.selectedItem.senderid === userInfo.uid) {
          batch.update(deleteOppChatRef, { isdeleted: true });
        }

        

        // Commit the batch
        try {
          await batch.commit();
          console.log('Batch update successful');
        } catch (error) {
          console.error('Error executing batch update:', error);
        }

        // setChats((prevChats) =>
        //   prevChats.map((chat) =>
        //     chat.id === selectedItem.id ? { ...chat, ...updatedChat } : chat
        //   )
        // )
        
        setUiState(prev => ({ ...prev, showDialog: false }));
      },[dataState.selectedItem,oppUser]
     )
      

      const handleAcceptRequest = async () =>{

        setUiState(prev => ({ ...prev, dialogType: 'loading' }));
        setUiState(prev => ({ ...prev, showDialog: true }));

        const userInfo = await getData('@profile_info')

        const batch = writeBatch(db); // Initialize the batch

        const messageRef = doc(db, `users/${userInfo.uid}/messages/${oppUser.uid}`);
        const oppmessageRef = doc(db, `users/${oppUser.uid}/messages/${userInfo.uid}`);

        // Add the updates to the batch
        batch.update(messageRef, { isrequest: false, stamp:serverTimestamp(), isrequestaccepted:true, timestamp:serverTimestamp() });
        batch.update(oppmessageRef, { isrequestaccepted: true, stamp:serverTimestamp() ,isrequest:false });

        // Commit the batch
        try {
          await batch.commit();
          console.log('Batch update successful');

          handleSendRequest();
        } catch (error) {
          console.error('Error executing batch update:', error);
        }

        setUiState(prev => ({ ...prev, showDialog: false }));
        setUiState(prev => ({ ...prev, dialogType: 'popup' }));
        setChatState(prev => ({ ...prev, isrequest: false }));

        
      }


      const handleBlockUser = useCallback(async() => {

          if (oppUser.oppuserprofile === null) return;
      
          const batch = writeBatch(db);

          setUiState(prev => ({ ...prev, dialogType: 'loading' }));
          setUiState(prev => ({ ...prev, showDialog: true }));
      
        
      
          const oppuserinfo = {
            username:oppUser.username,
            uid:oppUser.uid,
            profilephoto:oppUser.oppuserprofile.profilephoto
          }
      
          const currentuserprofile = await getData('@profile_info')
          const currentUserRef = doc(db, `users/${currentuserprofile.uid}/blockedusers/${oppUser.uid}`);
          batch.set(currentUserRef, oppuserinfo);
      
        
          const oppUserRef = doc(db, `users/${oppUser.uid}/blockers/${currentuserprofile.uid}`);
          batch.set(oppUserRef, currentuserprofile);
      
          try {
            await batch.commit();
            showToast("User blocked")
            dispatch(setData({id:oppUser.uid, intent:'blockuser'}));
      
          }catch(e){console.log("error blocking "+e)}

          router.back();
      
        },[oppUser.oppuserprofile,oppUser]);


      const handleDelete = useCallback( async() => {

        setUiState(prev => ({ ...prev, dialogType: 'loading' }));
        setUiState(prev => ({ ...prev, showDialog: true }));

        const userInfo = await getData('@profile_info')

        const batch = writeBatch(db); // Initialize the batch

        const messageRef = doc(db, `users/${userInfo.uid}/messages/${oppUser.uid}`);
        //const oppmessageRef = doc(db, `users/${oppUser.uid}/messages/${userInfo.uid}`);

        // Add the updates to the batch
        batch.delete(messageRef);
        //batch.delete(oppmessageRef);

        handleSendRequest();

        // Commit the batch
        try {
          await batch.commit();
          console.log('Batch update successful');
        } catch (error) {
          console.error('Error executing batch update:', error);
        }

        router.back();

      },[oppUser]);

      // send redux action to requestsmessaging
      const handleSendRequest = async() => {
        dispatch(setData({intent:'actionchatglobal'}));
      }


      const handleCopyText = useCallback(async() => {
        await Clipboard.setStringAsync(dataState.selectedItem.message);

        setUiState(prev => ({ ...prev, showDialog: false }));
      },[dataState.selectedItem])

  

      // Add swipe reply handler
      // const handleSwipeReply = (message) => {
      //   setUiState(prev => ({ ...prev, selectedItem: message, isReplying: true }));
      //   if (Haptics && Haptics.impactAsync) {
      //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      //   }
      // };

      const { userLocation, address } = dataState;

     
    return (

      <GestureHandlerRootView>

        <View style={{flex:1}}>

        <Animated.FlatList {...flatListProps} />

       

          {  uiState.isReplying &&
            <ReplyContainer isReplying={uiState.isReplying} selectedItem={dataState.selectedItem} userInfo={dataState.userInfo} oppUser={oppUser} colorScheme={colorScheme} onCloseReply={handleReply} />
          }


          {!uiState.isBottomReached && (
              <FloatingButton isVisible={!uiState.isBottomReached} onPress={scrollToBottom} />
          )}


         {
          (chatState.isChatAccepted !== null && chatState.isChatAccepted && !chatState.isrequest  && !chatState.iscurrentUserBlocked) ? 
            <View style={[styles.modernInputContainer, {
              backgroundColor: colorScheme === 'dark' ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }]}>

              {/* Typing Indicator */}
              <TypingIndicator visible={chatState.oppusertyping} oppUsername={oppUser.username} colorScheme={colorScheme} animations={typingAnimations} />

              <View style={styles.inputRow}>
                {/* Enhanced Input Container */}
                <View style={[styles.enhancedInputContainer, {
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                }]}>
              <TextInput
              onChangeText={handleTyping} 
                    placeholderTextColor={colorScheme === 'dark' ? '#888' : '#666'} 
              value={uiState.text}
                    placeholder='Type a message...' 
                    multiline
                    maxLength={1000}
                    style={[styles.modernTextInput, {
                      color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main
                    }]}
                  />

                  {/* Attachment Icons */}
                  {!uiState.isTyping && (
                    <View style={styles.modernIconsContainer}>
                      <TouchableOpacity 
                        onPress={pickImageAsync}
                        style={[styles.modernIconButton, {
                          backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        }]}
                      >
                        <Ionicons
                          name="image"
                          size={20}
                          color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}
                    />
              </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={handleLocationPress}
                        style={[styles.modernIconButton, {
                          backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        }]}
                      >
                        <Ionicons
                          name="location"
                          size={20}
                          color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}
                    />
                  </TouchableOpacity>
              </View>
                  )}
            </View>

                {/* Enhanced Send Button */}
                <Animated.View style={[
                  styles.sendButtonContainer,
                  {
                    
                    transform: [{ scale: uiState.isTyping ? 1 : 0.8 }],
                  }
                ]}>
                  <TouchableOpacity 
                    onPress={() => handleSendMessage('text')}
                    style={[styles.modernSendButton, {
                      backgroundColor: Colors.blue,
                    }]}
                    disabled={!uiState.isTyping}
                  >
                    <Ionicons
                      name="send"
                      size={20}
                      color="white"
                    />
                    </TouchableOpacity>
                </Animated.View>
              </View>
            </View> :

            (chatState.isChatAccepted !== null && (chatState.isrequest !== null && !chatState.isrequest) || chatState.iscurrentUserBlocked) ?
            <View style={[styles.modernStatusContainer, {
              backgroundColor: colorScheme === 'dark' ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }]}>
              
              {chatState.iscurrentUserBlocked ? (
                // Account Restricted View
                <View style={[styles.statusCard, {
                  backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }]}>
                  
                  <View style={[styles.statusIconContainer, {
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  }]}>
                    <Ionicons name="ban" size={28} color="#EF4444" />
                  </View>
                  
                  <View style={styles.statusContent}>
                    <Text style={[styles.statusTitle, {
                      color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main
                    }]}>
                      Account Restricted
                    </Text>
                    <Text style={[styles.statusSubtitle, {
                      color: colorScheme === 'dark' ? '#888' : '#666'
                    }]}>
                      This user has restricted their account
                    </Text>
                  </View>
                    
                  </View>
                ) : (
                // Request Sent View
                <View style={[styles.statusCard, {
                  backgroundColor: colorScheme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
                  borderColor: 'rgba(34, 197, 94, 0.3)',
                }]}>
                  
                  <View style={[styles.statusIconContainer, {
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  }]}>
                    <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
                  </View>

                 
                  
                  <View style={styles.statusContent}>
                    <Text style={[styles.statusTitle, {
                      color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main
                    }]}>
                      Request Sent!
                    </Text>
                    <Text style={[styles.statusSubtitle, {
                      color: colorScheme === 'dark' ? '#888' : '#666'
                    }]}>
                      Waiting for {oppUser.username} to accept your message request
                    </Text>
                  </View>
                  
                  {/* Animated Pulse Effect */}
                  <View style={styles.pulseContainer}>
                    <Animated.View style={[styles.pulseRing, {
                      backgroundColor: 'rgba(34, 197, 94, 0.3)',
                    }]} />
                  </View>
                  
                </View>
              )}
              
            </View> :

            (chatState.isrequest !== null && chatState.isrequest) ?  
            <View style={[styles.modernRequestContainer, {
              backgroundColor: colorScheme === 'dark' ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }]}>
              
              {/* Request Card */}
              <View style={[styles.requestCard, {
                backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              }]}>
                
                {/* Header */}
                <View style={styles.requestHeader}>
                  <View style={[styles.requestIcon, {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                  }]}>
                    <Ionicons name="chatbubble-ellipses" size={24} color={Colors.blue} />
                  </View>
                  
                  <View style={styles.requestInfo}>
                    <Text style={[styles.requestTitle, {
                      color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main
                    }]}>
                      Message Request
                    </Text>
                    <Text style={[styles.requestSubtitle, {
                      color: colorScheme === 'dark' ? '#888' : '#666'
                    }]}>
                      {oppUser.username} wants to chat with you
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={[styles.requestDescription, {
                  color: colorScheme === 'dark' ? '#AAA' : '#777'
                }]}>
                  Do you want to receive messages from {oppUser.username}? They will only be able to send more messages if you accept.
                </Text>

                {/* Action Buttons */}
                <View style={styles.modernButtonsContainer}>
                  <TouchableOpacity 
                    onPress={handleBlockUser} 
                    style={[styles.modernActionButton, styles.blockButton]}
                  >
                    <Ionicons name="ban" size={18} color="#EF4444" />
                    <Text style={styles.blockButtonText}>Block</Text>
              </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={handleDelete} 
                    style={[styles.modernActionButton, styles.deleteButton]}
                  >
                    <Ionicons name="trash" size={18} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={handleAcceptRequest} 
                    style={[styles.modernActionButton, styles.acceptButton]}
                  >
                    <Ionicons name="checkmark" size={18} color="white" />
                    <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
                </View>
            </View>
          </View>: null
         }

        


   { showLocationSheet && <LocationPickerBottomsheet
      bottomSheetRef={bottomSheetRef}
      initialSnapIndex={initialSnapIndex}
      snapPoints={snapPoinst}
      userLocation={userLocation}
      address={address}
      colorScheme={colorScheme}
      handleRegionChangeComplete={handleRegionChangeComplete}
      handleOnSendLocationPress={handleOnSendLocationPress}
    />}



        <CustomDialog onclose={handleCloseDialog} isVisible={uiState.showDialog}>
          {
            uiState.dialogType === 'popup' ?
            <View style={[styles.modernDialog, {
              backgroundColor: colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }]}>
              
              {/* Header */}
              <View style={styles.dialogHeader}>
                <Text style={[styles.dialogTitle, {
                  color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,
                }]}>
                  Message Options
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.dialogActions}>
                
                {/* Copy Action (only for text) */}
                {(dataState.selectedItem && dataState.selectedItem.messageType === 'text') && (
                  <TouchableOpacity 
                    onPress={handleCopyText}
                    style={[styles.modernDialogAction, {
                      backgroundColor: colorScheme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
                    }]}
                  >
                    <View style={[styles.dialogActionIcon, {
                      backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    }]}>
                      <Ionicons name="copy" size={20} color="#22C55E" />
              </View>
                    <Text style={[styles.dialogActionText, {
                      color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,
                    }]}>
                      Copy Text
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colorScheme === 'dark' ? '#666' : '#AAA'} />
            </TouchableOpacity>
                )}

                {/* Delete Action */}
                <TouchableOpacity 
                  onPress={deleteChatItem}
                  style={[styles.modernDialogAction, {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                  }]}
                >
                  <View style={[styles.dialogActionIcon, {
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  }]}>
                    <Ionicons name="trash" size={20} color="#EF4444" />
            </View>
                  <Text style={[styles.dialogActionText, {
                    color: '#EF4444',
                  }]}>
                    {uiState.textdeleteStatus}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colorScheme === 'dark' ? '#666' : '#AAA'} />
                </TouchableOpacity>

            </View>
            </View> :

            <View style={[styles.modernLoadingDialog, {
              backgroundColor: colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            }]}>
              <ActivityIndicator size="large" color={Colors.blue} />
              <Text style={[styles.loadingDialogText, {
                color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,
              }]}>
                Processing...
              </Text>
            </View>
          }
        </CustomDialog>

        <ImageView
          images={dataState.selectedImages}
          imageIndex={0}
          visible={uiState.imageViewerVisible}
          onRequestClose={() => setUiState(prev => ({ ...prev, imageViewerVisible: false }))}
        />



        </View>

      </GestureHandlerRootView>
       
    )
})

export default chatglobal

  const styles = StyleSheet.create({
    floatingButton: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      backgroundColor: 'blue',
      borderRadius: 25,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonContainer:{backgroundColor:'gray',
    padding:5,borderRadius:5,
    justifyContent:'center',paddingHorizontal:20},
    modalSelection:{

      flexDirection:'row',
      width:"80%",
      alignItems:'center',
      justifyContent:'space-between'
      ,marginTop:10

    },
    dialog:{
      shadowColor: 'gray', // Shadow color
      shadowOffset: { width: 0, height: 10 }, // Shadow offset
      shadowOpacity: 0.15, // Shadow opacity
      shadowRadius: 5, // Shadow radius
      elevation: 5, 
      width:'60%',height:180,
          backgroundColor:Colors.dark_gray,alignSelf:'center',
          justifyContent:'center',borderRadius:30,alignItems:'center'

    },
    markerFixed: {
      position: 'absolute',
      alignSelf:'center',
      top:'50%',
      marginTop:-40,
     
  
       // Half of the marker's height
    },
    iconsView: {
      padding: 10,
      flexDirection:'row',
    
      borderRadius: 5,
    },
    textInput: {
    
      padding: 10,
      marginRight: 10,
      flex: 1,
      borderRadius: 10,
      borderColor: 'white',
      shadowColor: 'gray',
    },
    selectedItem: {
      backgroundColor: 'rgba(0, 150, 250, 0.3)', // Light blue background for selected items
    },
    sendIcon: {
      width: 20,
      marginEnd:15,
      height: 20,
    },
    inputIcons:{
      width: 20,
      height: 20,
      marginHorizontal:8

    },
    requestContainer: {
      backgroundColor: Colors.dark_gray, // Replace with Colors.dark_gray if it's defined
      alignItems: 'center',
    },
    buttonsContainer:{
      flexDirection:'row',width:'100%',
      justifyContent:'space-evenly',
      alignItems:'center',
      marginTop:10,
      marginBottom:10

    },
    container: {
      height: 50,
      flexDirection: 'row',
      alignSelf: 'flex-end',
  
      alignItems: 'center',
    },
    profileImage: {
        width: 30,
        height: 30,
        alignSelf:'center',
        borderWidth:2,
        overflow:'hidden',
       
        borderRadius: 15,
       
      }, 


      gradient: {
        width: 37,
        height: 37,
        
        flexDirection:'column',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
      },
      item:{
        margin:10
      },
      modernInputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        minHeight: 70,
      },
      typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
      },
      typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
      },
      typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 1,
        opacity: 0.7,
      },
      typingText: {
        fontSize: 13,
        fontStyle: 'italic',
      },
      inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
      },
      enhancedInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        minHeight: 48,
        maxHeight: 120,
      },
      modernTextInput: {
        flex: 1,
        fontSize: 16,
        lineHeight: 20,
        maxHeight: 80,
        paddingVertical: 0,
      },
      modernIconsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        gap: 8,
      },
      modernIconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
      },
      sendButtonContainer: {
        marginBottom: 2,
      },
      modernSendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      modernFloatingButton: {
        position: 'absolute',
        bottom: 50,
        right: 20,
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
      },
      floatingButtonContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      },
      newMessageBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'red',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
      },
      newMessageDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'white',
      },
      modernRequestContainer: {
        padding: 16,
        borderTopWidth: 1,
        minHeight: 100,
      },
      requestCard: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        padding: 16,
      },
      requestHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
      },
      requestIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      },
      requestInfo: {
        flex: 1,
      },
      requestTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
      },
      requestSubtitle: {
        fontSize: 16,
      },
      requestDescription: {
        fontSize: 14,
        marginBottom: 16,
      },
      modernButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
      },
      modernActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        minHeight: 44,
      },
      blockButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
      },
      blockButtonText: {
        marginLeft: 6,
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
      },
      deleteButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
      },
      deleteButtonText: {
        marginLeft: 6,
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
      },
      acceptButton: {
        backgroundColor: Colors.blue,
        borderWidth: 1,
        borderColor: Colors.blue,
      },
      acceptButtonText: {
        marginLeft: 6,
        fontSize: 15,
        fontWeight: '600',
        color: 'white',
      },
      modernReplyContainer: {
        padding: 16,
        borderLeftWidth: 2,
        minHeight: 100,
      },
      replyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
      },
      replyLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 12,
      },
      closeReplyButton: {
        marginLeft: 'auto',
      },
      replyContent: {
        marginBottom: 16,
      },
      replyImageContainer: {
        marginBottom: 8,
      },
      replyImage: {
        width: 100,
        height: 100,
        borderRadius: 5,
      },
      replyText: {
        fontSize: 14,
      },
      replyLocationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      modernBottomSheetContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
      },
      bottomSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
      },
      bottomSheetIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
      },
      bottomSheetHeaderText: {
        flex: 1,
      },
      bottomSheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
      },
      bottomSheetSubtitle: {
        fontSize: 14,
        lineHeight: 18,
      },
      modernMapContainer: {
        height: 200,
        marginBottom: 20,
      },
      mapWrapper: {
        flex: 1,
        borderWidth: 2,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      modernMapView: {
        flex: 1,
        borderRadius: 14,
      },
      modernMarkerFixed: {
        position: 'absolute',
        alignSelf: 'center',
        top: '50%',
        marginTop: -16,
        zIndex: 1000,
      },
      markerShadow: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5,
      },
      markerPulse: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
        position: 'absolute',
        top: 6,
        left: 6,
      },
      modernAddressSection: {
        padding: 16,
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 20,
      },
      addressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
      },
      addressLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
      },
      addressText: {
        fontSize: 14,
        lineHeight: 20,
      },
      modernSendLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      sendLocationText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        marginLeft: 8,
      },
      modernDialog: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: 'transparent',
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
      },
      dialogHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      },
      dialogTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
      },
      dialogActions: {
        paddingVertical: 8,
      },
      modernDialogAction: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginHorizontal: 8,
        marginVertical: 4,
        borderRadius: 12,
      },
      dialogActionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      },
      dialogActionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
      },
      modernLoadingDialog: {
        width: 160,
        height: 160,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
      },
      loadingDialogText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 16,
        textAlign: 'center',
      },
      modernStatusContainer: {
        padding: 16,
        borderTopWidth: 1,
        minHeight: 100,
      },
      statusCard: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        padding: 16,
      },
      statusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
      },
      
      statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
      },
      statusSubtitle: {
        fontSize: 16,
      },
      pulseContainer: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
      },
      pulseRing: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
      },
      modernHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
      },
      modernBackButton: {
        padding: 10,
        borderRadius: 20,
      },
      modernProfileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
      },
      profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      profileImageContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
      },
      modernGradient: {
        flex: 1,
        borderRadius: 20,
      },
      modernProfileImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
      },
      modernUserInfo: {
        flex: 1,
      },
      usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      modernUsername: {
        fontSize: 16,
        fontWeight: 'bold',
      },
      verifiedBadge: {
        backgroundColor: Colors.blue,
        borderRadius: 10,
        padding: 2,
        marginLeft: 5,
      },
      statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      typingStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      miniTypingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 2,
        opacity: 0.7,
      },
      modernStatusText: {
        fontSize: 14,
      },
      onlineStatusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
      },
})