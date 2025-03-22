import {
    Image,
    StyleSheet,
    Platform,
    FlatList,
    Text,
    View,
    Button,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
    ActivityIndicator,
    AppState
  } from 'react-native';
  import ImageView from "react-native-image-viewing";
  
  import { SafeAreaView } from 'react-native-safe-area-context';
  import Stories from '@/components/manu';
  
  import Post from '@/components/Posts';
  import { useRouter } from 'expo-router';
  import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
  import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
  import Modal from 'react-native-modal';
  import Comments from '@/components/comments';
  
  
  const { width } = Dimensions.get('window');
  const image = require('@/assets/images/favicon.png');
  
  import { useSelector } from 'react-redux';
  
  import { useFocusEffect } from '@react-navigation/native';
  import { GestureHandlerRootView } from 'react-native-gesture-handler';
  import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
  import { httpsCallable } from 'firebase/functions';
  import { functions } from '@/constants/firebase';
  import { firebase } from '@/constants/firebase';
  
  import { useAuth } from '@/constants/AuthContext';
  import { getData, storeData } from '@/constants/localstorage';
  
  
  import { db, database } from '@/constants/firebase';
  import { setDoc,doc, getDocs, collection, updateDoc, writeBatch,getDoc } from 'firebase/firestore';
  import * as Location from 'expo-location';
  import { GeoPoint, serverTimestamp } from 'firebase/firestore';
  
  import Dialog from '@/components/CustomDialog';
  import { Colors } from '@/constants/Colors';
  
  import {LinearGradient} from 'expo-linear-gradient'
  import { defaultProfileImage, getDataBackend, getLocation, registerForPushNotificationsAsync, storeUserLocation, useOnlineStatus } from '@/constants/common';
  import { ref, onValue, OnDisconnect, onDisconnect , set} from 'firebase/database';
  import messaging from '@react-native-firebase/messaging';
  import { setData } from '@/slices/dataChangeSlice';
  
  import { useDispatch } from 'react-redux';
  import { useToast } from 'react-native-toast-notifications';
  import { useColorScheme } from '@/hooks/useColorScheme';
  
  import FloatingButton from '@/components/FloatingButton';
  import { setCoordinates } from '@/slices/locationSlice';
  import { getDistance } from 'geolib';
  
  
  
  
  
  
  const CustomDialog = React.memo(({ isVisible, onClose, buttonPosition }) => {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0);
  
  
    const {user} = useAuth()
  
    useEffect(() => {
      if (isVisible) {
        opacity.value = withTiming(1, { duration: 300, easing: Easing.ease });
        scale.value = withTiming(1, { duration: 300, easing: Easing.bounce });
      } else {
        opacity.value = withTiming(0, { duration: 300, easing: Easing.ease });
        scale.value = withTiming(0, { duration: 300, easing: Easing.ease });
      }
    }, [isVisible]);
  
    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
      };
    });
  
    const { width, height } = Dimensions.get('window');
    let modalLeftPosition = buttonPosition.left - width / 2 + 10;
    if (modalLeftPosition < 0) {
      modalLeftPosition = 10;
    }
  
    const modalStyle = {
      position: 'absolute',
      left: modalLeftPosition,
      top: buttonPosition.top + 10,
    };
  
    if (buttonPosition.top + 200 > height) {
      modalStyle.top = buttonPosition.top - 210;
    }
  
    return (
      <Modal isVisible={isVisible} onBackdropPress={onClose} style={styles.modal}>
        <Animated.View style={[styles.dialog, animatedStyle, modalStyle]}>
          <Text style={{ fontSize: 20 }}>Repost?</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, width: '90%' }}>
            <TouchableOpacity onPress={onClose} style={styles.circularButton}>
              <Image style={{ width: 20, height: 20 }} source={require('@/assets/icons/cancel.png')} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.circularButton}>
              <Image style={{ width: 20, height: 20 }} source={require('@/assets/icons/tick.png')} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    );
  });
  
  
  const reports = ['Nudity or sexual activity','Scam or Fraud','Violence or self injury','False information','Child abuse']
  
  
  
  
  const HomePage = () => {
  
    const dispatch = useDispatch();
    const colorScheme = useColorScheme();
  
  
  
    const appState = useRef(AppState.currentState);
  
  
    const updateUserOnlineStatus = async (status) => {
      const userInfo = await getData('@profile_info');
      const myConnectionsRef = ref(database, `users/${userInfo.uid}/connections`);
      await set(myConnectionsRef,status);
    }
  
    const setUpOnDisconnect = async () => {
  
      try {
  
        const userInfo = await getData('@profile_info')
    
        const connectedRef = ref(database, ".info/connected");
        const myConnectionsRef = ref(database, `users/${userInfo.uid}/connections`);
    
    
        const unsubscribe = onValue(connectedRef, (snapshot) => {
          if (snapshot.val() === true) {
    
            onDisconnect(myConnectionsRef).set(false);
    
            updateUserOnlineStatus(true)
    
            console.log("connected")
          }
        });
    
        return unsubscribe;
    
  
      }catch(e){}
     
    }
  
    const unsubscribeRef = useRef(null);
  
    useEffect(() => {
      const initialize = async () => {
        unsubscribeRef.current = await setUpOnDisconnect();
      };
      initialize();
  
      // Cleanup function to remove the listener when the component unmounts
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current(); // Call the unsubscribe function
        }
      };
    },[]);
  
    // Get FCM token
    async function requestUserPermission() {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
      if (enabled) {
        console.log('Authorization status:', authStatus);
      }
    }
  
    useEffect(() => {
      if (requestUserPermission()) {
        messaging().getToken()
        .then(async(token) => {
          const userinfo = await getData('@profile_info');
  
          const ref = doc(db, `users/${userinfo.uid}`);
  
          await updateDoc(ref, {token:token});
  
          console.log("token "+ token)
        });
      }else {
        console.log("permission not granted")
      }
    },[]);
  
    useEffect(() => {
       const handleAppStateChange = (nextAppState) => {
          if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
             console.log("App has come to the foreground!");
             // Set online in Firebase
             updateUserOnlineStatus(true)
          } else if (nextAppState.match(/inactive|background/)) {
             console.log("App is in the background!");
             // Set offline in Firebase
             updateUserOnlineStatus(false);
          }
          appState.current = nextAppState;
       };
  
       const subscription = AppState.addEventListener('change', handleAppStateChange);
  
       return () => subscription.remove();
    }, []);
  
    
  
    const { uploadProgress, isUploading, uploadingItem } = useSelector(state => state.upload);
  
    const router = useRouter();
  
  
    const [activePost, setActivePost] = useState(null);
    const [storiesVisible, setStoriesVisible] = useState(true);
   
    const [currentSelectedPost, setCurrentSelectedPost] = useState(null);
    const [isDialogVisible, setIsDialogVisible] = useState(false);
    const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
    const [isFullWidthModalVisible, setIsFullWidthModalVisible] = useState(false);
    const [fullWidthModalOrigin, setFullWidthModalOrigin] = useState({ x: 0, y: 0 });
  
    const [leftActivePost, setLeftActivePost] = useState('waka');
  
    const viwableId = useRef('waka');
  
    const [selectedImage, setselectedImage] = useState(null);
    const [imageViewerVisible, setimageViewerVisible] = useState(false);
  
    const [posts, setPosts] = useState([]);
  
    const [isRefreshing, setRefreshing] = useState(false);
  
    const [userinfo, setUserInfo] = useState(null);
  
    const [reportInfo, setReportInfo] = useState(null);
    const [isReportLoading, setReportLoading] = useState(false);
  
    const [dialog,setDialog] = useState(false);
  
    const [stories, setStories] = useState([])
  
    useEffect(() => {
      const uploadView = async () => {
        if (activePost !== "flaya" && activePost !== null) {
          const userInfo = await getData('@profile_info');
          const post = posts.find(post => post.id === activePost);
  
          const ref = doc(db, `users/${post.user}/posts/${activePost}/views/${userInfo.uid}`);
          await setDoc(ref, userInfo, {merge:true})
        }
      }
      uploadView();
  
    },[activePost])
  
    const fetchUserInfo = async () => {
      const storedInfo = await getData('@profile_info');  // Fetch user info from storage
      // likedposts = await getData('@liked_posts');
      // sharedposts = await getData('@shared_posts')
      if (storedInfo) {
        setUserInfo(storedInfo);  // Set userinfo in state
      }
    };
    
  
    useFocusEffect(
  
      React.useCallback(() => {
        checkStoriesVisibility();
  
        return () => {
         setStoriesVisible(false)
         setActivePost('flaya')
        };
      }, [posts])
    );
  
    
  
    
    const [isLoading, setIsLoading] = useState(false);
    const [islocationaccepted,setlocationaccepted] = useState(null);
    const [shouldLoadMore, setShouldLoadMore] = useState(true);
    const [isFetchingPostsWithNewLocationLoading, setFetchingPostsWithNewLocationLoading] = useState(false)
  
    const { coordinates } = useSelector(state => state.location)
  
  
    const shouldLoadWithNewDistance = (currentLocation, previousLocation) => {
  
      console.log("loc "+JSON.stringify(currentLocation) +"and "+JSON.stringify(previousLocation))
  
      if (previousLocation === null) return true
  
      const usergeopoint = { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude };
      const postgeopoint = { latitude: previousLocation.latitude, longitude: previousLocation.longitude };
      const distance = getDistance(usergeopoint,postgeopoint);
  
      console.log("distance "+ distance)
  
      return distance > 100
  
    }
  
    const fetchPostWithNewLocation = async (isRefreshing, initial, postsLength) => {
  
      setFetchingPostsWithNewLocationLoading(true);
  
      setlocationaccepted(false);
  
      console.log("location GOINH")
  
      const currentLocation = await getLocation();
  
      console.log("location GH")
      
      if (currentLocation === null) {
        setFetchingPostsWithNewLocationLoading(false);
        console.log("not fetching loc")
        return;
      }
  
      const userinfo = await getData('@profile_info');
  
      const savedlocation = userinfo.coordinates;
  
      let previousLocation = null;
  
      if (coordinates.latitude){
        previousLocation = coordinates;
      }else if (savedlocation){
        previousLocation = savedlocation;
      }
  
      setlocationaccepted(true);
  
      if (!shouldLoadWithNewDistance(currentLocation, previousLocation)) return;
  
      fetchInitialStories();
  
      
  
      dispatch(setCoordinates(currentLocation))
  
      console.log("location stored")
  
    
      setFetchingPostsWithNewLocationLoading(false);
  
      await storeUserLocation(currentLocation);
  
      
      const data = await getDataBackend("getPosts", {userid:userinfo.uid,postlength:posts.length});
  
      if(data !== null){
        
        if(data.posts.length > 0){
          console.log("greater")
  
          if (isRefreshing) {
            if (posts.length > 0) {
  
              if (initial) {
                setPosts(data.posts)
              }else {
  
                const itemsLengthToRemove = posts.length - postsLength;
  
                setPosts((prevPosts) => {
                  // Create a copy of the previous posts array
                  let updatedPosts = [...prevPosts];
  
                  // Remove the first 'x' items from the copied array
                  if (itemsLengthToRemove > 0) {
                    updatedPosts.splice(0, itemsLengthToRemove);
                  }
  
                  // Extract the existing post IDs from the current posts
                  const existingIds = new Set(updatedPosts.map((post) => post.id));
  
                  // Filter new posts to exclude duplicates based on the post ID
                  const filteredNewPosts = data.posts.filter((post) => !existingIds.has(post.id));
  
                  // Return the new list with new posts added at the front
                  return [...filteredNewPosts, ...updatedPosts];
                });
      
  
              }
  
            }else {
              setPosts(data.posts)  // Replace data when refreshing
            }
  
          } else {
            const itemsLengthToRemove = posts.length - postsLength;
  
            setPosts((prevPosts) => {
              // Create a copy of the previous posts array
              const updatedPosts = prevPosts.slice(0, prevPosts.length - itemsLengthToRemove);
  
              // Extract the existing post IDs from the current posts
              const existingIds = new Set(updatedPosts.map((post) => post.id));
  
              // Filter new posts to exclude duplicates based on the post ID
              const filteredNewPosts = data.posts.filter((post) => !existingIds.has(post.id));
  
              // Return the new list with new posts added at the front
              return [...updatedPosts, ...filteredNewPosts];
            });
            
          }
  
          setShouldLoadMore(data.posts.length > 10);
      }else {setShouldLoadMore(false)}
  
     }
   }
    const fetchPosts = async (isRefreshing = false, initial = false, fromLocationPress = false) =>{
  
  
      console.log('wow haha');
      
      if (isRefreshing) {
        setRefreshing(true);
      }else{
        console.log("isLoading")
        //setIsLoading(true)
      }
  
      const userinfo = await getData('@profile_info');
      setUserInfo(userinfo)
      
      console.log("location first "+userinfo.coordinates)
  
      if (islocationaccepted === false || !userinfo.coordinates) {
        setlocationaccepted(false);
        const currentLocation = await getLocation();
  
        if (currentLocation === null) {
  
          if (isRefreshing) {
            setRefreshing(false);
            console.log("location was rejected")
          }else {
            setIsLoading(false);
          }
  
          return;
  
        }
  
        dispatch(setCoordinates(currentLocation))
  
        console.log("location stored via extra")
  
        setlocationaccepted(true);
  
      
        await storeUserLocation(currentLocation);
        
      }
  
      
  
  
      const data = await getDataBackend("getPosts", {userid:userinfo.uid,postlength:posts.length});
  
      
  
      if(data !== null){
      
        if(data.posts.length > 0){
          console.log("greater")
  
          if (isRefreshing) {
            if (posts.length > 0) {
  
              setPosts(prevPosts => {
                const existingIds = new Set(prevPosts.map(post => post.id));
                const newPosts = data.posts.filter(post => !existingIds.has(post.id));
                return [...newPosts, ...prevPosts];
              });
              
            }else {
              setPosts(data.posts)  // Replace data when refreshing
            }
  
          } else {
            setPosts(prevPosts => {
              const existingIds = new Set(prevPosts.map(post => post.id));
              const newPosts = data.posts.filter(post => !existingIds.has(post.id));
              return [ ...prevPosts, ...newPosts,];
            });
            
          }
  
          setShouldLoadMore(data.posts.length > 10);
      }else {setShouldLoadMore(false)}
  
      if (isRefreshing) {
        setRefreshing(false)
      }else{
        setIsLoading(false)
      }
  
    
      }
  
      if (!fromLocationPress) {
  
        // fetch with new location if there is changes more that 50 meters
        fetchPostWithNewLocation(isRefreshing, initial, posts.length)
      }
      
    }
  
    const [storiesavailable,setStoriesAvailability] = useState(null)
  
  
    const checkStories = async () =>{
  
      if (userinfo) {
        const storiesRef = collection(db,`users/${userinfo.uid}/activestories`);
        const storiesSnap = await getDocs(storiesRef);
  
        if (storiesSnap.empty) {
          setStoriesAvailability(false)
        }else{
          setStoriesAvailability(true)
        }
      }
    }
  
  
  
    useEffect(()=>{
      checkStories();
    },[userinfo]);
  
  
  
    useEffect(() =>{
      fetchUserInfo().then(() => {
        console.log('moving here')
        fetchPosts(true, true, false);
        fetchInitialStories();
      });
      
    },[]);
  
    async function getPosts(){
      const userinfo = await getData('@profile_info');
  
      console.log(JSON.stringify(userinfo)+'INFP')
  
      try {
        console.log("here fet");
        
        const response = await fetch('https://us-central1-flaya-9ebb2.cloudfunctions.net/getPosts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userid: userinfo.uid, // Replace with the actual userid
          }),
        });
    
        if (!response.ok) {
          // Log the status and status text for better debugging
          console.error('HTTP Error:', response.status, response.statusText);
          throw new Error('Failed to fetch posts');
        }
    
        const data = await response.json();
        console.log('Response data:', data); // Log the 
  
       
        return data;
        
      } catch (err) {
       
        console.log(err+"errrr");
        setRefreshing(false);
        return null;
      }
  
    }
  
  
    async function fetchInitialStories () {
      const data = await getStories('getStoriesNearby');
      if (data !== null && data.stories.length > 0){
        setStories(data.stories)   
        console.log("wow story"+data.stories)
      }
    }
  
    async function getStories (callbackfunction) {
  
      const userinfo = await getData('@profile_info');
  
      try {
        console.log("getting initial stories");
        
        const response = await fetch(`https://us-central1-flaya-9ebb2.cloudfunctions.net/${callbackfunction}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: userinfo.uid, // Replace with the actual userid
          }),
        });
    
        if (!response.ok) {
          const currentLocation = await getLocation();
          await storeUserLocation(currentLocation);
          fetchInitialStories();
          // Log the status and status text for better debugging
          console.log('HTTP Error:', response.status, response.statusText);
          throw new Error('Failed to fetch posts');
        }
    
        const data = await response.json();
        console.log('Response initial stories:', data); // Log the 
  
       
        return data;
        
      } catch (err) {
       
        console.log(err+"errrr");
        setRefreshing(false);
        return null;
      }
  
  
    }
   
    const [topReached,setTopReached] = useState(true)
  
    const onViewableItemsChanged = ({ viewableItems }) => {
      
      if (viewableItems.length > 0) {
  
        const newActivePost = viewableItems[0].key;
  
        // Only update state if the active post has changed
        if (newActivePost !== activePost) {
          setLeftActivePost(newActivePost);
          setActivePost(newActivePost);
  
          const pos = posts.findIndex(item => item.id === newActivePost);
          setStoriesVisible(pos <= 0);
          
          viwableId.current = newActivePost;
          console.log('active' + leftActivePost);
        }
  
        // check if user is at the top
        const lastItemVisible = viewableItems[0].index === 0; // First item in data (visually bottom item)
        setTopReached(lastItemVisible);
    
      }
    };
  
    const checkStoriesVisibility = ()=>{
  
      const pos = posts?.findIndex(item => item.id === viwableId.current.trim());
      setStoriesVisible(pos <= 0);
  
      console.log(pos)
  
    }
  
    const handleCommentPress = (event) => {
      const { pageY, pageX } = event.nativeEvent;
      setButtonPosition({ top: pageY, left: pageX });
      setIsDialogVisible(true);
    };
  
    const handleCommentIconPress = (x, y, post) => {
      setCurrentSelectedPost(post);
      setFullWidthModalOrigin({ x, y });
      setIsFullWidthModalVisible(true);
    };
  
    const handlePlayPress = (id) =>{
      setActivePost(id)
    }
  
    const onImagePress = (image)=>{
      const imageLi = [{uri:image}]
      setselectedImage(imageLi)
      setimageViewerVisible(true)
    }
  
    const bottomSheetRef = useRef(null);
    const initialSnapIndex = -1;
  
    const onReportPress = useCallback((postinfo) => {
      setReportInfo(postinfo)
      bottomSheetRef.current?.snapToIndex(0);
    }, []);
  
    const handleRemovePost = useCallback((postid) => {
      setPosts((prevPosts) => prevPosts.filter(post => post.id !== postid));
    });
  
    const [blockinguserinfo,setBlockingUserInfo] = useState({})
    const handleBlockUser = useCallback((blockinguserinfo) => {
      setBlockingUserInfo(blockinguserinfo);
      setDialog(true)
    });
  
    const handleBlockUserConfirmation = useCallback(async() => {
  
      const batch = writeBatch(db);
  
      setDialog(false);
  
      const oppuserinfo = {
        username:blockinguserinfo.postcreatorusername,
        uid:blockinguserinfo.postcreatorid,
        profilephoto:blockinguserinfo.postcreatorimage
      }
  
      const currentuserprofile = await getData('@profile_info')
      const currentUserRef = doc(db, `users/${currentuserprofile.uid}/blockedusers/${blockinguserinfo.postcreatorid}`);
      batch.set(currentUserRef, oppuserinfo);
  
    
      const oppUserRef = doc(db, `users/${blockinguserinfo.postcreatorid}/blockers/${currentuserprofile.uid}`);
      batch.set(oppUserRef, currentuserprofile);
  
      try {
        await batch.commit();
        showToast("User blocked")
        dispatch(setData({id:blockinguserinfo.postcreatorid, intent:'blockuser'}));
  
      
      }catch(e){console.log("error blocking "+e)}
  
    });
  
    const toast = useToast();
  
    function showToast(message){
      toast.show(message, {
        type: "normal",
        placement: "bottom",
        duration: 2000,
        offset: 30,
        animationType: "zoom-in",
      });
    };
  
    const renderItem = useCallback(
      ({ item }) => <Post handleRemovePost={handleRemovePost} handleBlockUser={handleBlockUser} userinfo={userinfo} onReportPress={onReportPress} onImagePress={onImagePress} activePost={activePost} post={item} handlePlayPress={handlePlayPress}  onCommentPress={handleCommentIconPress} onButtonPress={handleCommentPress} />,
      [activePost,userinfo]
    );
  
    const handlePostPress = (id) =>{
      router.push({
        pathname: '/sharepost'
      });
     
    }
  
    const snapPoinst = useMemo(() => ['40%'],[]);
  
    const handleaddnewstory = () => {
     
      const data = {
        currentuser:true
      }
  
      if (storiesavailable) {
        router.push({
          pathname: '/story',
          params: { data: JSON.stringify(data) }
        });
  
      }else {
        router.push('/sharestory')
      }
  
      
    }
    const { value } = useSelector(state => state.data);
  
    useEffect(() => {
      if (value !== null && value.intent === "storydepleted" && value.id === 'story') {
         setStoriesAvailability(false);
      }
    },[value]);
  
  
    const fetchChangedPosts = async () => {
    
  
      try {
        const info = {
          posts:posts
        }
        const data = await getDataBackend('getChangedPosts ',info);
  
  
        if (data.posts && data.posts.length > 0) {
          setPosts((prevPosts) => {
            const updatedPosts = [...prevPosts];
  
            // Update the changed posts in the list
            data.posts.forEach((changedPost) => {
              const index = updatedPosts.findIndex((p) => p.id === changedPost.id);
              if (index !== -1) {
                updatedPosts[index] = { ...updatedPosts[index], ...changedPost };
              }
            });
  
            return updatedPosts;
          });
        }
      } catch (error) {
        console.error("Error fetching changed posts:", error);
      } 
    };
  
  
   
    const refreshPosts = (location = false) => {
      fetchPosts(true, false , location);  // Reset to page 1 for refresh
      fetchInitialStories();
      checkStories();
  
      fetchChangedPosts();
     
    };
  
    const onLocationPressed = async () => {
  
      setlocationaccepted(false);
  
      setRefreshing(true)
  
      const currentLocation = await getLocation();
      
      if (currentLocation === null) {
  
        setRefreshing(false);
        
        return;
      }
  
      setlocationaccepted(true);
  
  
      await storeUserLocation(currentLocation);
  
      refreshPosts(true);
  
    }
  
    const listHeaderComponent = useMemo(
      () => (
        <View style={{ flexDirection: 'column', marginBottom: 10 }}>
  
          <View style={styles.header}>
            <Text style={{ color: 'orange', fontSize: 30, fontWeight: 'bold' }}>Flaya</Text>
  
            <View style={{flexDirection:'row',marginEnd:15}} >
  
            {(storiesavailable !== null && storiesavailable) ?<TouchableOpacity onPress={handleaddnewstory}>
              <LinearGradient
                colors={['#FF7F50', '#FF6347', '#FF4500']} // Define your gradient colors here
                style={styles.gradient}
                start={{ x: 0, y: 0 }} // Gradient start point (top-left)
                end={{ x: 1, y: 1 }} // Gradient end point (bottom-right)
              >
  
                <Image
                resizeMode="cover"
                source={{uri:userinfo !== null ? userinfo.profilephoto : defaultProfileImage}}
                style={{
                  width: 36,
                  height: 36,
                  alignSelf:'center',
                  borderWidth:3,
                  overflow:'hidden',
                  borderColor:colorScheme === 'dark' ? Colors.dark_main: Colors.light_main,
                  borderRadius: 18,
                 
                } }
                />
  
              </LinearGradient>
  
              
            </TouchableOpacity> : storiesavailable !== null && <TouchableOpacity onPress={handleaddnewstory}>
               <Image style={{ width: 40, height: 40 ,tintColor:colorScheme === 'dark' ? 'white' : "black"}} source={require('@/assets/icons/stories.png')} />
            </TouchableOpacity> } 
           
            <TouchableOpacity onPress={handlePostPress} >
              <Image style={{ width: 40, height: 40 ,tintColor:colorScheme === 'dark' ? 'white' : "black",marginLeft:10}} source={require('@/assets/icons/addpost.png')} />
            </TouchableOpacity>
  
            </View>
  
            
          </View>
          {(stories.length > 0 && (islocationaccepted || isFetchingPostsWithNewLocationLoading)) && <Stories isStoriesVisible={storiesVisible} stories={stories}  /> }
  
  
          {!isRefreshing && posts.length === 0 ? islocationaccepted || isFetchingPostsWithNewLocationLoading ? <View style={{alignItems:'center',marginTop:30}}>
  
            <TouchableOpacity onPress={handlePostPress}>
              <Image style={{height:70,width:70, tintColor:colorScheme === 'dark' ? 'white' : "black"}} source={require('@/assets/icons/galleryadd.png')}/>
            </TouchableOpacity>
  
            <Text style={{color:colorScheme === 'dark' ? 'white' : "black",fontSize:20, marginTop:10}}>Upload post!</Text>
  
          </View> : islocationaccepted !== null && <View style={{alignItems:'center',marginTop:30}}>
  
            <Text style={{color:colorScheme === 'dark' ? 'white' : "black", fontSize:20}}>Location is required</Text>
  
            <TouchableOpacity onPress={onLocationPressed}>
              <View style={{flexDirection:'row', padding:10, borderRadius:10, backgroundColor:Colors.blue, alignItems:"center", marginTop:10}} >
  
                <Image style={{width:15, height:15, tintColor:colorScheme === 'dark' ? 'white' : "black"}} source={require('@/assets/icons/locationpermission.png')}/>
                <Text style={{color:colorScheme === 'dark' ? 'white' : "black", fontSize:15, marginStart:5}}>Give permission</Text>
  
              </View>
            </TouchableOpacity>
  
  
            </View> : <View></View>}
  
  
          {isUploading && <View style={{width:'100%',marginVertical:10,marginHorizontal:10}}>
  
            <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}}>Uploading {uploadingItem.contentType}</Text>
  
            <View style={{flexDirection:'row',marginTop:5}}>
  
              <Image style={{ width: 50, height: 50 ,borderRadius:5}} 
              source={{uri:uploadingItem.contentType === 'image' ? uploadingItem.content[0] : uploadingItem.thumbnail}} />
              <View style={{ height: 4, backgroundColor: 'tomato', width: `${uploadProgress}%`,borderRadius:2 ,marginStart:5,maxWidth:'80%'}} />
              
            </View>
  
            
            
          </View>}
  
        </View>
  
      ),
      [storiesVisible,uploadProgress,userinfo,stories,storiesavailable,isRefreshing,posts,islocationaccepted]
      
    );
  
  
  
    const renderFooter = useCallback(() => {
      return isLoading ? (
        <View>
          <ActivityIndicator size="large" color={colorScheme === 'dark' ? 'white' : "black"} />
        </View>
      ) : null;
    }, [isLoading]);
  
    // Load more data when user scrolls to the bottom
    const loadMorePosts = () => {
      console.log(posts.length+ "length");
     
      if (!isLoading && posts.length > 2 && shouldLoadMore) {
        setIsLoading(true);
        fetchPosts();
      }
    };
  
    
  
  
    const handleModalClose = () =>{
      setIsFullWidthModalVisible(false)
      setCurrentSelectedPost(null)
    }
  
  
    const onReportPressed = useCallback(async(report) => {
  
      const profileinfo = await getData('@profile_info');
  
      setReportLoading(true);
  
      await setDoc(doc(db, `users/${reportInfo.postcreatorid}/posts/${reportInfo.postid}/reports`, profileinfo.uid), {
        report:report,
        reporterid:profileinfo.uid,
        createdAt: serverTimestamp() // Add a timestamp or any other required fields
      });
  
      setReportLoading(false);
  
      bottomSheetRef.current?.close();
    });
  
    const flatListRef = useRef(null); 
  
    const scrollToTop = () => {
      const index = 0;
      flatListRef.current?.scrollToIndex({ animated: true, index});
    };
   
  
    
   
    return (
  
      <GestureHandlerRootView>
  
      <SafeAreaView>
  
  
        <View >
  
          <Animated.FlatList
          keyExtractor={(post) => post.id}
          data={posts}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
           />
  
  
          {/* <Animated.FlatList
            bounces
            ref={flatListRef}
            keyExtractor={(post) => post.id}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 80 }}
            onViewableItemsChanged={onViewableItemsChanged}
            data={posts}
            style={{height:'100%'}}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refreshPosts}
              />
            }
            renderItem={renderItem}
            extraData={isLoading}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{gap:5}}
            ListHeaderComponent={listHeaderComponent}
            onEndReached={loadMorePosts}  // Triggered when the user scrolls to the bottom
            onEndReachedThreshold={2.7}  // How close to the end of the list before triggering onEndReached (50%)
            ListFooterComponent={renderFooter}
            scrollEventThrottle={16}
            maxToRenderPerBatch={10}
            
            windowSize={21}
            removeClippedSubviews
          /> */}
  
         
  
        </View>
  
  
          {!topReached && (
            <FloatingButton isVisible={!topReached} onPress={scrollToTop} isHomePage={true} />
          )}
  
      
  
  
       
  
        
        <CustomDialog isVisible={isDialogVisible} onClose={() => setIsDialogVisible(false)} buttonPosition={buttonPosition} />
  
  
  
  
        {
          currentSelectedPost && <Comments
          isVisible={isFullWidthModalVisible}
          onClose={handleModalClose}
          post={currentSelectedPost}
          origin={fullWidthModalOrigin}
        />
        }
  
        
  
         <ImageView
            images={selectedImage}
            imageIndex={0}
            visible={imageViewerVisible}
            onRequestClose={() => setimageViewerVisible(false)}
          />
  
  
             <BottomSheet  
              enablePanDownToClose={true} 
              ref={bottomSheetRef}
             
              index={initialSnapIndex}
              backgroundStyle={{backgroundColor:'#141414'}}
              handleIndicatorStyle={{backgroundColor:'#fff'}}
              snapPoints={snapPoinst}>
  
                <BottomSheetView style={{flexDirection:'column'}}>
  
                  <Text style={{fontSize:15,fontWeight:'bold',alignSelf:'center',color:'white'}}>Why are you reporting?</Text>
                  {
  
                    isReportLoading ? <ActivityIndicator style={{alignSelf:'center',marginTop:20}} size="small" color="white"/>
  
                    :
  
                    reports.map((str, index) => (
  
                      <TouchableOpacity onPress={() => onReportPressed(str)}>
  
                        <Text key={index} style={{fontSize:14,color:'white',marginTop:15,marginStart:10}}>
                          {str}
                        </Text>
  
                      </TouchableOpacity>
                    ))
                  }
  
                </BottomSheetView>
  
              
              </BottomSheet>
  
              <Dialog onclose={() => setDialog(false)}  isVisible={dialog}>
  
                <View style={{padding:10,backgroundColor:Colors.dark_gray,borderRadius:10}}>
  
                  <View style={{flexDirection:'row',alignItems:'center'}}>
  
                    <Image
                      source={{ uri: blockinguserinfo.postcreatorimage || 'image' }}
                      style={styles.profileImage}
                    />
  
                    <Text style={{color:'white',fontSize:20,marginStart:3}}>{blockinguserinfo.postcreatorusername  || 'user'}</Text>
  
  
                  </View>
  
  
                  <Text style={{color:'white',margin:5,fontSize:20,marginBottom:15}}>Proceed to block user?</Text>
  
  
                  <View style={{flexDirection:"row",alignContent:"space-between"}}>
  
                    <TouchableOpacity onPress={handleBlockUserConfirmation} style={{flex:1}} >
  
                      <View  style={{flexDirection:'row'}}>
  
                        <Image style={{width:30,height:30,tintColor:'red'}} source={require('@/assets/icons/block.png')}/>
  
                        <Text style={{color:'red',fontSize:20}}>Proceed</Text>
  
                      </View>
  
                    </TouchableOpacity>
  
                    <TouchableOpacity onPress={() => setDialog(false)}>
  
                     <Text style={{color:'white',marginStart:5,fontSize:20}}>Cancel</Text>
  
                    </TouchableOpacity>
  
  
  
                  </View>
  
  
                  
  
  
                </View>
  
              </Dialog>
  
  
      </SafeAreaView>
  
      </GestureHandlerRootView>
     
    );
  };
  
  const styles = StyleSheet.create({
    profileImage: {
      width: 50,
      height: 50,
      borderColor: 'white',
      borderWidth: 3,
      borderRadius: 25,
      marginEnd: 10,
    },
    container: {
      flex: 1,
      backgroundColor: '#111',
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    stepContainer: {
      gap: 8,
      marginBottom: 8,
    },
    reactLogo: {
      height: 178,
      width: 290,
      bottom: 0,
      left: 0,
      position: 'absolute',
    },
    header: {
      padding: 4,
      margin: 3,
      marginBottom:20,
      flexDirection: 'row',
      
      justifyContent:"space-between",
      alignItems: 'center',
    },
    modal: {
      justifyContent: 'flex-start',
      margin: 0,
    },
    dialog: {
      position: 'absolute',
      width: 150,
      alignItems: 'center',
      flexDirection: 'column',
      padding: 10,
      backgroundColor: 'gray',
      borderRadius: 10,
    },
    fullWidthModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    fullWidthModalContent: {
      width,
      height: 700,
      backgroundColor: '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
    },gradient: {
          width: 40,
          height: 40,
          
          flexDirection:'column',
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
        }
  });
  
  export default HomePage;
  