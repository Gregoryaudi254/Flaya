import { StyleSheet, Text, View ,FlatList,Pressable,ActivityIndicator,Image,TouchableOpacity,RefreshControl} from 'react-native'
import React ,{useRef,useState,useMemo,useCallback}from 'react'
import * as Haptics from 'expo-haptics';

import MessageItem from '@/components/MessageItem';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/Colors';

import { useRouter } from 'expo-router';

import { useSelector, useDispatch } from 'react-redux'
import { collection, getDocs ,query ,orderBy, where,limit, onSnapshot,startAfter, deleteDoc, updateDoc, doc,writeBatch, serverTimestamp, getDoc} from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';

//import { setMessages } from '@/slices/primaryMessagesSlice';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/useColorScheme';
import { getDefaultReturnUrl } from 'expo-auth-session';
import Dialog from '@/components/CustomDialog';

import { setData } from '@/slices/dataChangeSlice';
import { useToast } from 'react-native-toast-notifications';
import MemoizedDialog from './MemoizedDialog';
import MemoizedBottomSheetMessaging from './MemoizedBottomSheetMessaging';

// Memoized Empty State Component
const EmptyStateComponent = React.memo(({ searchQuery, colorScheme }) => {
  const isDark = colorScheme === 'dark';
  
  return (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateText, {
        color: isDark ? Colors.light_main : Colors.dark_main,
      }]}>
        {searchQuery ? 'No messages found' : 'No Messages Yet'}
      </Text>
      <Text style={[styles.emptyStateSubtext, {
        color: isDark ? '#888' : '#666',
      }]}>
        {searchQuery ? 'Try adjusting your search terms' : 'Start a conversation to see messages here'}
      </Text>
    </View>
  );
});
EmptyStateComponent.displayName = 'EmptyStateComponent';

// Memoized Loading Component
const LoadingComponent = React.memo(({ colorScheme }) => (
  <ActivityIndicator 
    size='large' 
    color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} 
    style={styles.loadingIndicator} 
  />
));
LoadingComponent.displayName = 'LoadingComponent';

// Memoized Footer Component
const FooterComponent = React.memo(({ loadingmore }) => {
  return loadingmore ? (
    <View style={styles.footerContainer}>
      <ActivityIndicator size="large" color="white" />
    </View>
  ) : null;
});
FooterComponent.displayName = 'FooterComponent';

const Primarymessages = React.memo(({ searchQuery = '' }) => {

  console.log("primary message");

  const colorScheme = useColorScheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const toast = useToast();

  // Refs
  const bottomSheetRef = useRef(null);

  // State - using minimal re-renders
  const [selectedMessage,setSelectedMessage] = useState({});
  const [dialog,setDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messages,setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [userInfo,setUserInfo] = useState();
  const [lastVisibleMessage,setLastVisible] = useState(null);
  const [initialLoadTimestamp, setInitialLoadTimestamp] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [shouldLoadMore, setShouldLoadMore] = useState(true);
  const [loadingmore,setLoadingMore] = useState(false);

  // Memoized constants
  const initialSnapIndex = useMemo(() => -1, []);
  const snapPoinst = useMemo(() => ['65%','100%'],[]);

  // Core setup effect with proper cleanup
  useEffect(() => {
    let unsubscribe;

    const setupMessaging = async () => {
      try {
        const userInfo = await getData('@profile_info');
        setUserInfo(userInfo);

        // 1. Initial load - one-time fetch
        const messagesRef = collection(db, `users/${userInfo.uid}/messages`);
        const initialQuery = query(
          messagesRef, 
          where('isrequest', '==', false), 
          orderBy('timestamp', 'desc'), 
          limit(15)
        );
        
        const querySnapshot = await getDocs(initialQuery);
        const messages = querySnapshot.docs.map(doc => ({ ...doc.data() }));
        
        setMessages(messages);
        setShouldLoadMore(messages.length > 11);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setInitialLoad(false);
        
        // Record the timestamp after initial load
        const loadTimestamp = new Date();
        setInitialLoadTimestamp(loadTimestamp);

        // 2. Real-time listener - only for changes after initial load
        const realtimeQuery = query(
          messagesRef,
          where('isrequest', '==', false),
          where('stamp', '>', loadTimestamp),
          orderBy('stamp', 'desc')
        );

        // Set up real-time listener for new messages only
        unsubscribe = onSnapshot(realtimeQuery, (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            const messageData = change.doc.data();
            
            console.log(`Real-time primary ${change.type}:`, messageData.id);

            setMessages(prevMessages => {
              const existingIds = new Set(prevMessages.map(msg => msg.id));
              if (!existingIds.has(messageData.id)) {
                console.log("Adding new real-time message" + JSON.stringify(existingIds));
                return [messageData, ...prevMessages];
              }

              const existingIndex = prevMessages.findIndex(msg => msg.id === messageData.id);
              const existingMsg = prevMessages[existingIndex];

              // 2. If message content is identical, replace in place
              if (existingMsg.message === messageData.message) {
                const updatedMessages = [...prevMessages];
                existingMsg.isread = messageData.isread;
                existingMsg.isoppread = messageData.isoppread
                updatedMessages[existingIndex] = messageData;
                console.log("updated messages " + updatedMessages.length)
                return updatedMessages;
              }
              console.log("new message " + messageData.message)
              // remove the message if it already exists and add new message on top
              return [messageData, ...prevMessages.filter(msg => msg.id !== messageData.id)];
            });
            
            if (change.type === 'removed') {
              // Check message is on firestore
              const messageRef = doc(db, `users/${userInfo.uid}/messages/${messageData.id}`);
              const messageDoc = await getDoc(messageRef);
              if (!messageDoc.exists()) {
                // Message is on firestore, remove it from messages
                setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageData.id));
              }
              console.log("message not on firestore")
            }

            });
        });

      } catch (error) {
        console.error('Error setting up messaging:', error);
        setInitialLoad(false);
      }
    };

    setupMessaging();

    return () => {
        if (unsubscribe) unsubscribe();
    };
}, []);

  // Optimized search filter with memoization
  const searchFilter = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return (message) => 
      message.username.toLowerCase().includes(query) ||
      message.message.toLowerCase().includes(query);
  }, [searchQuery]);

  // Filter messages with optimized logic
  useEffect(() => {
    if (!searchFilter) {
      setFilteredMessages(messages);
    } else {
      setFilteredMessages(messages.filter(searchFilter));
    }
  }, [messages, searchFilter]);

  // Optimized event handlers with useCallback
  const handleLongPress = useCallback((item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessage(item);
    bottomSheetRef.current?.snapToIndex(0); 
  }, []);

  const handleMessagePress = useCallback((item) => {
    console.log("stra " + item.isrequest)

    const oppUserInfo = {
      username:item.username,
      profilephoto:item.photo,
      uid:item.id,
      requeststatus:item.isrequestaccepted,
      isrequest:item.isrequest
    }

    router.push({
      pathname: '/chatglobal',
      params: { data: JSON.stringify(oppUserInfo) }
    });
  }, [router]);

  // Highly optimized renderItem with all dependencies memoized
  const renderItem = useCallback(
    ({ item }) => (
      <MessageItem 
        message={item} 
        currentuserid={userInfo?.uid || null} 
        page={'primary'}
        onPress={() => handleMessagePress(item)}
        onLongPress={() => handleLongPress(item)}
      />
    ),[userInfo?.uid, handleMessagePress, handleLongPress]
  );

  // Optimized load more with better performance
  const loadMoreMessage = useCallback(async () => {
    if (loadingmore || !lastVisibleMessage || !shouldLoadMore) return;
    setLoadingMore(true);
    
    try {
    const profileInfo = await getData('@profile_info');
    const chatRef = collection(db, `users/${profileInfo.uid}/messages`);
      const q = query(chatRef, where('isrequest', '==', false), orderBy('timestamp', 'desc'), startAfter(lastVisibleMessage), limit(20));

    const moreSnapshot = await getDocs(q);
    const moreMessages = moreSnapshot.docs.map(doc => ({
        ...doc.data(),
    }));

      // Fix: Check length properly
      setShouldLoadMore(moreMessages.length >= 15);
    
      // Only update lastVisible if we got new messages
      if (moreSnapshot.docs.length > 0) {
    setLastVisible(moreSnapshot.docs[moreSnapshot.docs.length - 1]);
      }
      
    setMessages((prevMessages) => {
      const existingIds = new Set(prevMessages.map(message => message.id));
      const newMessages = moreMessages.filter(message => !existingIds.has(message.id));
    
      // Avoid creating a new array if there's no change
      if (newMessages.length === 0) {
          console.log("No new messages to add");
        return prevMessages;
      }

        console.log("new messages " + newMessages.length)

        // Add new messages at the END of the list (bottom) since they are older
        return [...prevMessages, ...newMessages];
      });
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
    setLoadingMore(false);
    }
  }, [loadingmore, lastVisibleMessage, shouldLoadMore]);

  // Memoized footer component
  const footerComponent = useMemo(() => 
    <FooterComponent loadingmore={loadingmore} />, 
    [loadingmore]
  );

  // Optimized action handlers
  const handleMarkAsRead = useCallback(async () => {
    const userInfo = await getData('@profile_info');
    const batch = writeBatch(db);

    const messageRef = doc(db, `users/${userInfo.uid}/messages/${selectedMessage.id}`);
    batch.update(messageRef,{isread:true, stamp:serverTimestamp()})

    const oppmessageRef = doc(db, `users/${selectedMessage.id}/messages/${userInfo.uid}`);
    batch.update(oppmessageRef,{isoppread:true, stamp:serverTimestamp()})

    try {
      await batch.commit();
      console.log('Batch update successful');
      showToast("Message marked as read");
    } catch (error) {
      console.error('Error executing batch update:', error);
    }

    bottomSheetRef.current?.close();
  }, [selectedMessage.id]);

  const handleDelete = useCallback(async () => {
    const userInfo = await getData('@profile_info');
    const messageRef = doc(db, `users/${userInfo.uid}/messages/${selectedMessage.id}`);

    await deleteDoc(messageRef);
    showToast("Message deleted");
    onRefresh();
    bottomSheetRef.current?.close();
  }, [selectedMessage.id]);

  const handleBlock = useCallback(async () => {
    bottomSheetRef.current?.close();
    setDialog(true)
  }, []);

  const handleBlockUserConfirmation = useCallback(async() => {
      console.log("going hee")
  
      const batch = writeBatch(db);
      setDialog(false);
  
      const oppuserinfo = {
        username:selectedMessage.username,
        uid:selectedMessage.id,
        profilephoto:selectedMessage.photo
      }
  
      const currentuserprofile = await getData('@profile_info')
      const currentUserRef = doc(db, `users/${currentuserprofile.uid}/blockedusers/${selectedMessage.id}`);
      batch.set(currentUserRef, oppuserinfo);
    
      const oppUserRef = doc(db, `users/${selectedMessage.id}/blockers/${currentuserprofile.uid}`);
      batch.set(oppUserRef, currentuserprofile);
  
      try {
        await batch.commit();
        showToast("User blocked")
        console.log('lOGGED')
        dispatch(setData({id:selectedMessage.id, intent:'blockuser'}));
      }catch(e){console.log("error blocking "+e)}
  }, [selectedMessage, dispatch]);

  // Optimized toast function
  const showToast = useCallback((message) => {
      toast.show(message, {
        type: "normal",
        placement: "bottom",
        duration: 2000,
        offset: 30,
        animationType: "zoom-in",
      });
  }, [toast]);

  // Optimized refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Reset pagination
      setLastVisible(null);
      setShouldLoadMore(true);
      
      // Re-fetch messages
      const userInfo = await getData('@profile_info');
      const messagesRef = collection(db, `users/${userInfo.uid}/messages`);
      const q = query(messagesRef, where('isrequest', '==', false), orderBy('timestamp', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);

      const messages = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data
        };
      });

      setMessages(messages);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setShouldLoadMore(messages.length > 11);
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Memoized RefreshControl
  const refreshControl = useMemo(() => (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
    />
  ), [refreshing, onRefresh]);

  // Memoized FlatList props for maximum performance
  const flatListProps = useMemo(() => ({
    bounces: true,
    keyExtractor: (message) => message.id,
    style: styles.messagesList,
    onEndReached: loadMoreMessage,
    onEndReachedThreshold: 0.1,
    renderItem: renderItem,
    ListFooterComponent: footerComponent,
    refreshControl: refreshControl,
    showsVerticalScrollIndicator: false,
    data: filteredMessages,
    contentContainerStyle: styles.messagesContent,
    removeClippedSubviews: true, // Performance optimization
    maxToRenderPerBatch: 10, // Render fewer items per batch
    windowSize: 10, // Reduce memory footprint
    initialNumToRender: 15, // Render fewer items initially
    getItemLayout: null, // Let FlatList calculate (better for dynamic heights)
  }), [loadMoreMessage, renderItem, footerComponent, refreshControl, filteredMessages]);

  // Memoized empty state check
  const shouldShowEmptyState = useMemo(() => 
    filteredMessages.length < 1 && !initialLoad, 
    [filteredMessages.length, initialLoad]
  );

  return (
    <View style={styles.container}>
      <FlatList {...flatListProps} />

      {initialLoad && <LoadingComponent colorScheme={colorScheme} />}

      {shouldShowEmptyState && (
        <EmptyStateComponent searchQuery={searchQuery} colorScheme={colorScheme} />
      )}

            <MemoizedBottomSheetMessaging 
              selectedMessage={selectedMessage}
              initialSnapIndex={initialSnapIndex}
              snapPoinst={snapPoinst}
              bottomSheetRef={bottomSheetRef}
              handleMarkAsRead={handleMarkAsRead}
              handleDelete={handleDelete}
              handleBlock={handleBlock}
        colorScheme={colorScheme}
            />

            {dialog && <MemoizedDialog 
                dialog={dialog} 
                setDialog={setDialog}
                handleBlockUserConfirmation={handleBlockUserConfirmation} 
                blockinguserinfo={{postcreatorimage:selectedMessage.photo, postcreatorusername:selectedMessage.username}} 
              />}

    </View>
  )
});

Primarymessages.displayName = 'Primarymessages';

export default Primarymessages;

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    messagesList: {
      flex: 1,
    },
    messagesContent: {
      paddingVertical: 8,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingIndicator: {
      alignSelf:'center',
      marginTop:'40%', 
      position:'absolute'
    },
    footerContainer: {
      margin:10
      },
})