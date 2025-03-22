import Posts from "@/components/Posts";
import PostSecondary from "@/components/PostSecondary";
import { defaultProfileImage, getDataBackend, getLocation, storeUserLocation } from "@/constants/common";
import { getData } from "@/constants/localstorage";
import React, { useCallback, useEffect, useMemo, useState , useRef} from "react";
const { width } = Dimensions.get('window');
import {
  Image,
  StyleSheet,
  Platform,
  
  Text,
  View,
  Button,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  AppState,
  FlatList
} from 'react-native';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context"

import { FlashList } from "@shopify/flash-list";
import { useColorScheme } from "@/hooks/useColorScheme";
import FloatingButton from '@/components/FloatingButton';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Comments from '@/components/comments';
import { useFocusEffect } from '@react-navigation/native';

const reports = ['Nudity or sexual activity','Scam or Fraud','Violence or self injury','False information','Child abuse']

import ImageView from "react-native-image-viewing"

import Dialog from '@/components/CustomDialog';

import { setDoc,doc, getDocs, collection, updateDoc, writeBatch,getDoc, serverTimestamp } from 'firebase/firestore';
import { db, database, functions } from '@/constants/firebase';

import { Colors } from "@/constants/Colors";
import { useToast } from 'react-native-toast-notifications';

import { setData } from '@/slices/dataChangeSlice';
  
import { useDispatch, useSelector } from 'react-redux';
import ReportBottomSheet from "@/components/ReportBottomSheet";
import MemoizedDialog from "@/components/MemoizedDialog";
import { useRouter } from "expo-router";
import Stories from "@/components/manu";
import {LinearGradient} from 'expo-linear-gradient'
import { getDistance } from "geolib";
import { setCoordinates } from '@/slices/locationSlice';
import { httpsCallable } from "firebase/functions";
import useOnlineStatus from "@/constants/useOnlineStatus";
import CustomDialog from "@/components/CustomDialog";
import CircularProgress from "react-native-circular-progress-indicator";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import DownLoadMediaItem from "@/components/DownloadMediaItem";


const home = () => {
  // Optionally set user properties or log events
 

  const colorScheme = useColorScheme();
  const dispatch = useDispatch();
  const router = useRouter();

  useOnlineStatus();
   

  const [posts, setPosts] = useState([]);
  const [userinfo, setUserInfo] = useState({})
  const [activePost, setActivePost] = useState(null);
  const [shouldLoadMore, setShouldLoadMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [storiesVisible, setStoriesVisible] = useState(true);
  const [isFullWidthModalVisible, setIsFullWidthModalVisible] = useState(false);
 
  const [currentSelectedPost, setCurrentSelectedPost] = useState(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
   const [islocationaccepted,setlocationaccepted] = useState(null);
   const [isFetchingPostsWithNewLocationLoading, setFetchingPostsWithNewLocationLoading] = useState(false);
   const { uploadProgress, isUploading, uploadingItem } = useSelector(state => state.upload);
   const [stories, setStories] = useState([])
  const viwableId = useRef('waka');
 
  const fetchUserInfo = useCallback(async () => {
    const storedInfo = await getData('@profile_info');  // Fetch user info from storage
    // likedposts = await getData('@liked_posts');
    // sharedposts = await getData('@shared_posts')
    if (storedInfo) {
      setUserInfo(storedInfo);  // Set userinfo in state
    }
  });

  useEffect(() => {

    const startFetching = async () => {
      const userInfo = await getData('@profile_info');
      setUserInfo(userInfo);
      fetchPosts(true, true, false);
    }

    startFetching();

  }, []);

  useEffect(() => {
    console.log("Posts updated, causing re-render");
  }, [posts]);

  useEffect(() => {
    console.log("userinfo updated:", userinfo);
  }, [userinfo]);

    const { coordinates } = useSelector(state => state.location)

    const shouldLoadWithNewDistance = useCallback((currentLocation, previousLocation) => {
    
      console.log("loc "+JSON.stringify(currentLocation) +"and "+JSON.stringify(previousLocation))

      if (previousLocation === null) return true

      const usergeopoint = { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude };
      const postgeopoint = { latitude: previousLocation.latitude, longitude: previousLocation.longitude };
      const distance = getDistance(usergeopoint,postgeopoint);

      console.log("distance "+ distance)

      return distance > 100

    }); 



    const fetchPostWithNewLocation = useCallback(async (isRefreshing, initial, postsLength) => {
    
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

      if (coordinates.coords){
        console.log("redux direction")
        previousLocation = {latitude:coordinates.coords.latitude, longitude:coordinates.coords.longitude};
      }else if (savedlocation){
        previousLocation = savedlocation;
      }
  
      setlocationaccepted(true);

      dispatch(setCoordinates(currentLocation))
  
      if (!shouldLoadWithNewDistance(currentLocation, previousLocation)) return;
  
      fetchInitialStories();
  
      

  
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
   },[coordinates,posts]); 


   const getPoarts = useCallback(async (callback,info) => {
    console.log("calling this")
    // Prepare the callable function
    const callbackFunction = httpsCallable(functions, callback);

    // Call the function with the user ID
    const response = await callbackFunction(info);

    const data = response.data;
    console.log('Hureeeee', data); // Log the result

    return data;
   }); 

  const fetchPosts = useCallback(
    
    async (isRefreshing = false, initial = false, fromLocationPress = false) => {
    

    if (isRefreshing) {
      setRefreshing(true);
    }else{
      console.log("isLoading")
      //setIsLoading(true)
    }

    let isFirstLocationQuery = false;
    const userinfo = await getData('@profile_info');
    if (islocationaccepted === false || !userinfo.coordinates) {
      console.log("location was rejected")
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

      isFirstLocationQuery = true;

      dispatch(setCoordinates(currentLocation))

      console.log("location stored via extra")

      setlocationaccepted(true);

      await storeUserLocation(currentLocation);
    }


    const data = await getPoarts("getPosts", {
      userid: userinfo.uid,
      postlength: posts.length,  // Send current length to get only new posts
    });
  
    console.log("we made it")
    if (data?.posts?.length > 0) {
    
      setPosts(prevPosts => {
        const existingIds = new Set(prevPosts.map(post => post.id));
        const newPosts = data.posts.filter(post => !existingIds.has(post.id));
      
        // Avoid creating a new array if there's no change
        if (newPosts.length === 0) {
          console.log("going here")
          return prevPosts;
        }
  
        // Efficiently append new posts without redundant checks
        return isRefreshing ? [...newPosts, ...prevPosts] : [...prevPosts, ...newPosts];
      });

      setShouldLoadMore(data.posts.length > 10);
    }else {setShouldLoadMore(false)}


    if (isRefreshing) {
      setRefreshing(false)
    }else{
      setIsLoading(false)
    }

    if (!fromLocationPress && !isFirstLocationQuery) {
      // fetch with new location if there is changes more that 50 meters
      fetchPostWithNewLocation(isRefreshing, initial, posts.length)
    }
  },[posts,islocationaccepted])
  
  ;
  const memoizedUserinfo = useMemo(() => userinfo, [userinfo]);

  const handleRemovePost = useCallback((postid) => {
        setPosts((prevPosts) => prevPosts.filter(post => post.id !== postid));
      });

  const [blockinguserinfo,setBlockingUserInfo] = useState({});
  const [dialog,setDialog] = useState(false);
  const handleBlockUser = useCallback((blockinguserinfo) => {
        setBlockingUserInfo(blockinguserinfo);
        setDialog(true)
      });

  const bottomSheetRef = useRef(null);
  const initialSnapIndex = -1;
  const [reportInfo, setReportInfo] = useState(null);
  useEffect(() => {
    console.log("is opened "+isBottomSheetOpen)
    if (isBottomSheetOpen) {
     
      setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
      }, 500); // delay it by 100ms or adjust as needed
      bottomSheetRef.current?.snapToIndex(0);
     
    }
  }, [isBottomSheetOpen]);


  const handleReportPress = useCallback((postinfo) => {
      console.log("reported")
      setReportInfo(postinfo)
      setIsBottomSheetOpen(true);
    }, []);
  
    const [selectedImage, setselectedImage] = useState(null);
    const [imageViewerVisible, setimageViewerVisible] = useState(false);
    const onImagePress = (image)=>{
      const imageLi = [{uri:image}]
      setselectedImage(imageLi)
      setimageViewerVisible(true)
    }

    const [isReportLoading, setReportLoading] = useState(false);
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



    const handlePlayPress = (id) =>{
      setActivePost(id)
    }

    const checkStoriesVisibility = ()=>{
      const pos = posts?.findIndex(item => item.id === viwableId.current.trim());
      setStoriesVisible(pos <= 0);
    }


    useFocusEffect(
      
          React.useCallback(() => {
            checkStoriesVisibility();
      
            return () => {
             setStoriesVisible(false)
             setActivePost('flaya')
            };
          }, [posts])
        );
   

   

    const handleCommentIconPress = useCallback((post) => {
      setCurrentSelectedPost(post);
      setIsFullWidthModalVisible(true);
    });
  

    const [likesMap, setLikesMap] = useState({}); 

    const [sharesMap, setSharesMap] = useState({}); 

    const [dialogDownLoad, setDialogDownLoad] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const [sharingUrls, setsharingUrls] = useState([]);

    const updateInteranctions = useCallback(async (uid,postid)=>{
        const userinfo = await getData('@profile_info');
        
        const ref = doc(db,`users/${uid}/posts/${postid}/sharings/${userinfo.uid}`)
    
        await setDoc(ref,userinfo,{merge:true});
      })

    const clearCache = useCallback(async () => {
      try {
        const cacheDir = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
        for (const file of cacheDir) {
          await FileSystem.deleteAsync(FileSystem.cacheDirectory + file);
        }
        console.log('Old cached videos deleted!');
      } catch (e) {
        console.error('Error clearing cache:', e);
      }
    });

    useEffect(() => {
      clearCache();
    }, []);
    

    const handleSharePostPress = useCallback(async (mediaUrl, contentType, uid, postid) => {
        try {
          setDownloadProgress(0);
    
          
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

          updateInteranctions(uid,postid);

          setDialogDownLoad(false);
      
          // Share the downloaded file
          await Sharing.shareAsync(download.uri);
        } catch (error) {
          console.log("Error sharing media:", error);
          setDialogDownLoad(false);
        }
      });
      
      const [selectedMediasInfo, setSelectedMediasInfo] = useState({})
      const postSharePress = useCallback((mediaUrls, type, uid, postid)=> {

        console.log("we here")

        if (mediaUrls.length > 1) {
          setsharingUrls(mediaUrls);
          setDialogDownLoad(true);

          setSelectedMediasInfo({type,uid, postid});
          return;
        }
        setDialogDownLoad(true);
        handleSharePostPress(mediaUrls[0],type, uid, postid)
      });
    
  const renderItem = useCallback(
    ({ item }) => (
      <Posts
        post={item}
        activePost={activePost}
        userinfo={memoizedUserinfo}
        onCommentPress={handleCommentIconPress}
        handlePlayPress={handlePlayPress}
        onImagePress={onImagePress}
        onReportPress={handleReportPress}
        handleRemovePost={handleRemovePost}
        handleBlockUser={handleBlockUser}
        setLikesMap={setLikesMap}
        likesMap={likesMap}
        sharesMap={sharesMap}
        setSharesMap={setSharesMap}
        handleSharePostPress={postSharePress}
      />
    ),
    [memoizedUserinfo, isBottomSheetOpen, setIsBottomSheetOpen, handleCommentIconPress, handlePlayPress, onImagePress, handleReportPress, handleRemovePost, handleBlockUser,likesMap,setLikesMap,sharesMap,setSharesMap, activePost, postSharePress]
  );

  const snapPoinst = useMemo(() => ['40%'],[]);

  const renderFooter = useCallback(() => {
        return isLoading ? (
          <View>
            <ActivityIndicator size="large" color={colorScheme === 'dark' ? 'white' : "black"} />
          </View>
        ) : null;
      }, [isLoading]);
    
      // Load more data when user scrolls to the bottom
      const loadMorePosts = async () => {
        console.log(posts.length+ "length");
       
        if (!isLoading && posts.length > 2 && shouldLoadMore) {
          setIsLoading(true);

          
          fetchPosts();
        }
      };


      const fetchChangedPosts = useCallback(async () => {
          
        
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
    }, [posts]);

      const fetchInitialStories = useCallback(async() => {
        const data = await getStories('getStoriesNearby');
        if (data !== null && data.stories.length > 0){
          setStories(data.stories)   
          console.log("Stories"+data.stories)
        }
      });

      const refreshPosts = useCallback(async (location = false) => {
       
        fetchPosts(true, false , location);  // Reset to page 1 for refresh
        fetchChangedPosts();
        fetchInitialStories();
        checkStories(); 
      });

      const postsRef = useRef(posts);
      useEffect(() => {
        postsRef.current = posts;
      }, [posts]);
      const activepostRef = useRef(posts);
      useEffect(() => {
        activepostRef.current = activePost;
      }, [activePost]);

      const [topReached,setTopReached] = useState(true)
      const onViewableItems = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0) {
          const newActivePost = viewableItems[0].key;

          console.log("active p"+activepostRef.current)
      
          // Only update state if the active post has changed
          if (newActivePost !== activepostRef.current) {
            setActivePost(newActivePost);

           // console.log("changed ",newActivePost);
      
            const pos = postsRef.current.findIndex(item => item.id === newActivePost);
            setStoriesVisible(pos <= 0);

            console.log("stories visiblity ", activepostRef.current+" and "+ postsRef.current.length);
            
            viwableId.current = newActivePost;
          }
      
          // Check if user is at the top
          const lastItemVisible = viewableItems[0].index === 0; // First item in data (visually bottom item)
          setTopReached(lastItemVisible);
        }
      },[]);
    

      const flatListRef = useRef(null); 

      const scrollToTop = () => {
        const index = 0;
        flatListRef.current?.scrollToIndex({ animated: true, index});
      };

      const handleModalClose = () =>{
        setIsFullWidthModalVisible(false)
        setCurrentSelectedPost(null)
      }


      const toast = useToast();

      const showToast = useCallback((message) => {
        toast.show(message, {
          type: "normal",
          placement: "bottom",
          duration: 2000,
          offset: 30,
          animationType: "zoom-in",
        });

      });

      const [viewedPosts, setViewedPosts] = useState([]);

      const uploadView = useCallback( async () => {
        if (activePost !== "flaya" && activePost !== null) {
          const userInfo = await getData('@profile_info');
          const post = posts.find(post => post.id === activePost);
  
          const ref = doc(db, `users/${post.user}/posts/${activePost}/views/${userInfo.uid}`);
          await setDoc(ref, userInfo, {merge:true});

          setViewedPosts((prev) => [...prev, activePost]);
        }
      },[activePost]);

      
      useEffect(() => {
        if (!viewedPosts.includes(activePost)) {
          uploadView();
        }
        },[activePost])
      

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
      
     
     const handleBottomChanges = useCallback((index) => {
      setIsBottomSheetOpen(index !== -1);
     }) 


    const [storiesavailable,setStoriesAvailability] = useState(null)

    const { value } = useSelector(state => state.data);
  
    useEffect(() => {
      if (value !== null && value.intent === "storydepleted" && value.id === 'story') {
         setStoriesAvailability(false);
      }
    },[value]);
       

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

    const handlePostPress = (id) =>{
      router.push({
        pathname: '/sharepost'
      });
     
    }

    const onLocationPressed = useCallback(async () => {
      
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
    )

     const checkStories = useCallback(async () =>{
      const userinfo = await getData('@profile_info')
      if (userinfo) {
        const storiesRef = collection(db,`users/${userinfo.uid}/activestories`);
        const storiesSnap = await getDocs(storiesRef);
  
        if (storiesSnap.empty) {
          setStoriesAvailability(false);
        }else{
          setStoriesAvailability(true);
        }
      }
      }); 


      const getStories = useCallback(async (callbackfunction) => {

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

      })

     
      useEffect(() => {
        fetchUserInfo().then(() => {
          fetchInitialStories();
          checkStories();
        });

      },[]);
    
      
     
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

    
    // Handle share of the media selected if there was multiple images to shared
    const handleSharePressSingleImage = useCallback((item) => {
      setsharingUrls([]);
      handleSharePostPress(item,selectedMediasInfo.type, selectedMediasInfo.uid,selectedMediasInfo.postid);
      setSelectedMediasInfo({});

    },[selectedMediasInfo])


    const onDialogClose = useCallback(() => {
      setsharingUrls([]);
      setDialogDownLoad(false);

      console.log("haha")
    })
    

    const {ismute} = useSelector(state => state.volume);
    

  return (
    <GestureHandlerRootView>
       <SafeAreaView style={{flex: 1}}>

       <FlashList
          data={posts}
          initialNumToRender={5} // Adjust for your app's needs
          maxToRenderPerBatch={10} // Control how many items are rendered per batch
          ListHeaderComponent={listHeaderComponent}
          ref={flatListRef}
          extraData={ismute}
  
          removeClippedSubviews={true}
          onEndReached={loadMorePosts}  // Triggered when the user scrolls to the bottom
          onEndReachedThreshold={2.7}  // How close to the end of the list before triggering onEndReached (50%)
          ListFooterComponent={renderFooter}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 100 }}
          onViewableItemsChanged={onViewableItems}
          
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshPosts}
            />
          }
          keyExtractor={(item) => item.id.toString()}
          estimatedItemSize={200} // Provide an estimate for better performance
          renderItem={renderItem}
        />

            
             {
              currentSelectedPost && <Comments
              isVisible={isFullWidthModalVisible}
              setIsFullWidthModalVisible={setIsFullWidthModalVisible}
              onClose={handleModalClose}
              post={currentSelectedPost}
             
            />
            } 

            {!topReached && (
              <FloatingButton isVisible={!topReached} onPress={scrollToTop} isHomePage={true} />
            )}



            <ImageView
              images={selectedImage}
              imageIndex={0}
              visible={imageViewerVisible}
              onRequestClose={() => setimageViewerVisible(false)}
            /> 
              
  

              {isBottomSheetOpen && <ReportBottomSheet bottomSheetRef={bottomSheetRef}
              initialSnapIndex={initialSnapIndex} 
              snapPoints={snapPoinst}
              reports={reports}
              handleSheetChanges={handleBottomChanges}
              isReportLoading={isReportLoading} 
              onReportPressed={onReportPressed}  />}

              {dialog && <MemoizedDialog 
                dialog={dialog} 
                setDialog={setDialog}
                handleBlockUserConfirmation={handleBlockUserConfirmation} 
                blockinguserinfo={blockinguserinfo} 
              />}


              {<CustomDialog onclose={onDialogClose}  isVisible={dialogDownLoad}>

                {sharingUrls.length === 0 ? <View  style={{backgroundColor:colorScheme == 'dark' ? Colors.dark_gray : Colors.light_main ,padding:20, borderRadius:10,alignItems:'center'}} >
                  <CircularProgress
                    value={downloadProgress}
                    radius={40}
                    activeStrokeWidth={5}
                    inActiveStrokeWidth={5}
                    valueSuffix={'%'}
                    activeStrokeColor="orange"
                    inActiveStrokeColor="lightgray"
                    progressValueColor={colorScheme == 'dark' ? Colors.light_main : Colors.dark_main}
                  />

                </View> : <View style={{width:"70%", height:"50%",backgroundColor:colorScheme == 'dark' ? Colors.dark_gray : Colors.light_main, padding:10,borderRadius:10}}>
                    <FlatList
                        bounces={true}
                        keyExtractor={(item) => item}
                        numColumns={2}
                        renderItem={({item}) =>(
                          <DownLoadMediaItem item={item} handleSharePress={handleSharePressSingleImage}/>
                        )}
                        data={sharingUrls}/>

                  </View>
                }
                
                
              </CustomDialog>}
                            

  
             
  


        </SafeAreaView>
      
    </GestureHandlerRootView>
   
  )
}

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


export default home;