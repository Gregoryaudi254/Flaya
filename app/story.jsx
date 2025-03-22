import {
    StyleSheet,
    View,
    FlatList,
    ImageBackground,
    Image,
    Animated,
    TouchableWithoutFeedback,
    Text,
    Dimensions,
    TouchableOpacity,TextInput, Keyboard, KeyboardEvent, Platform,
    ActivityIndicator
  } from 'react-native';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ResizeMode, Video } from 'expo-av';
import {router, useLocalSearchParams,useRouter} from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;
import { Colors } from '@/constants/Colors';
import StoryReplyItem from '@/components/StoryReplyItem';
import { Data } from '@/constants/Data';

import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { db } from '@/constants/firebase';
import { getDoc, doc, GeoPoint ,setDoc ,serverTimestamp, collection , getDocs, updateDoc, deleteDoc} from 'firebase/firestore';
import { getData } from '@/constants/localstorage';
import { useToast } from 'react-native-toast-notifications';
import * as Location from 'expo-location';
import Storybottomsheet from '@/components/storybottomsheet';
import { getLocation, goToGoogleMap, handleSharePostPress } from '@/constants/common';
import Dialog from '@/components/CustomDialog';

import { setData } from '@/slices/dataChangeSlice';
import { useDispatch } from 'react-redux';
import { useColorScheme } from '@/hooks/useColorScheme';
import { timeAgo } from '@/constants/timeAgo';
import { Menu, MenuOptions, MenuOption, MenuTrigger ,renderers} from 'react-native-popup-menu';
import CustomDialog from '@/components/CustomDialog';
const { ContextMenu, SlideInMenu, Popover } = renderers;

import CircularProgress from "react-native-circular-progress-indicator";
import * as FileSystem from 'expo-file-system';

const story = () => {

  const colorScheme = useColorScheme();


  const dispatch = useDispatch();

  const toast = useToast();

  const [text,setText] = useState('')

  const { data } = useLocalSearchParams();

  const metadata = JSON.parse(data);

  const [item, setItem] = useState({});

  const isCurrentUser = metadata.currentuser;

 const [dialog, setDialog] = useState(false)

  const [activeThreadIndex, setActiveThreadIndex] = useState(0);
  const activeThread = item.stories?.[activeThreadIndex] || {};
  const videoRef = useRef(null);
  const [durationTime, setDuration] = useState(5000);
  const [isVideoReady, setVideoReady] = useState(false);
  const [isVideoBuffering, setVideoBuffering] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [viewedThreads, setViewedThreads] = useState(new Set());

  const [isPaused, setPaused] = useState(false);
  const [sendingReply, setsendingReply] = useState(false);

 

  const bottomSheetRef = useRef(null);
  const initialSnapIndex = -1;

  const [viewersVisible,setViewersVisible] = useState()

  const handleViewersPress = useCallback(() => {
    handlePausePlay(true)
    setViewersVisible(true)
  }, []);


  const getStory = async ()=> {

    const userinfo = await getData('@profile_info');

    try {

      if (isCurrentUser){
        const querySnapshot = await getDocs(collection(db, `users/${userinfo.uid}/activestories`)); // Replace with your collection name

        if (querySnapshot.empty) {
          router.back();
          return;
        }

        const documents = querySnapshot.docs.map(doc => ({
          ...doc.data()
        }));

        const item = {
          stories:documents,
        }

        setItem(item);
      }else {
        const docRef = doc(db, 'storiesnearby', metadata.seriesid); // Replace with actual collection and document ID
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setItem(docSnap.data());
          console.log('Stories available');
        } else {
          console.log('No such document!');
          router.back();
        }
      }
      
    } catch (error) {
      console.log('Error fetching document:', error);
    }

  }

  const setViewer = async () => {
    const userinfo = await getData('@profile_info');
    if (!isCurrentUser) {

      const currentLocation = await getLocation();

      if(currentLocation === null) return

      const itemR = {
        id:userinfo.uid,
        username:userinfo.username,
        image:userinfo.profilephoto,
        coordinates:new GeoPoint(currentLocation.coords.latitude,currentLocation.coords.longitude),
        createdAt:serverTimestamp()
      }
      const ref = doc(db, `users/${item.creatorid}/stories/${activeThread.threadId}/views/${userinfo.uid}`);
      await setDoc(ref, itemR)
    }
  }

  useEffect(() => {
    if (activeThread.threadId) {
      setViewer();
    }
  },[activeThread])

  useEffect(() => {
    getStory();


  },[])

  const addViewedThread = useCallback((threadId) => {
    setViewedThreads((prevViewedThreads) => new Set(prevViewedThreads).add(threadId));
  }, []);


  useEffect(() => {
    let timer;
    if (activeThread.contentType === 'image' && !isPaused) {
      timer = setTimeout(() => {
        addViewedThread(activeThread.content);
        goToNextThread();
      }, 5000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeThread,  addViewedThread, isPaused]);


  const [currentThread,setCurrentThread] = useState({})

  const goToNextThread = useCallback(() => {
    console.log(activeThreadIndex+ " index " +item.stories?.length)
    setActiveThreadIndex((prevIndex) => (prevIndex + 1) < item.stories?.length ? (prevIndex + 1) : prevIndex);
    
    setCurrentThread()
}, [activeThreadIndex,item]);

  const goToPreviousThread = useCallback(() => {
    if (item.stories.length === 1) {
      handlePausePlay(true);

      setTimeout(() => {
        handlePausePlay(false);
      }, 500);
      

      console.log("limited")
      return;
    }

    
    setActiveThreadIndex((prevIndex) => {
      return (prevIndex - 1) > -1 ? (prevIndex - 1) : prevIndex;
    });
  },[item]);

  const handlePress = useCallback((event) => {
    const { locationX, width, locationY } = event.nativeEvent;
    if (locationY > 200) {
      if (locationX > screenWidth / 2) {
        goToNextThread();

        console.log('right '+item)
      } else {
        goToPreviousThread();

        console.log('lefy')
      }
    }
  }, [activeThreadIndex,item]);


  const handleBackPress = () =>{
    router.back()
  }

  

  const handlePausePlay = (isPlaying) => {

    if (isPlaying) {
      setPaused(true);

        if(videoRef.current){
            videoRef.current.pauseAsync();
        }
    }else {
      setPaused(false);
      if(videoRef.current && activeThread.contentType !== 'image'){
          videoRef.current.setPositionAsync(0);
          videoRef.current.playAsync();
      }

    }
  }

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardDidShow' : 'keyboardDidShow',
      () => {
        handlePausePlay(true);
      }
    );
  
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardDidHide' : 'keyboardDidHide',
      () => {
        handlePausePlay(false);
      }
    );
  
    // Cleanup the event listeners on unmount
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [])


  const handleSendReply = async ()=>{

    if(text.length < 1){
      return
    }

    const profileInfo = await getData('@profile_info')

    setsendingReply(true);

   
    // Get the user's current location
    let currentLocation = await getLocation();

    if (currentLocation === null) {
      showToast("Location is required");
      setsendingReply(false)
      return;
    }


  
    const itemR = {
      id:profileInfo.uid,
      username:profileInfo.username,
      image:profileInfo.profilephoto,
      response:text,
      
      coordinates:new GeoPoint(currentLocation.coords.latitude,currentLocation.coords.longitude),
      createdAt:serverTimestamp()
    }
    console.log("creatorid "+item.creatorid +"and "+activeThread.threadId)
    try {
      // Define the path to the replies collection within the story document
      const replyDocRef = doc(db, `users/${item.creatorid}/stories/${activeThread.threadId}/replies/${profileInfo.uid}`);
  
      // Add the reply item to Firestore.ui
      await setDoc(replyDocRef, itemR, {merge:true});
  
      setsendingReply(false);
      setText(''); // Clear the input field
      showToast("Reply sent!");
  
    } catch (error) {
      console.error("Error sending reply: ", error);
      showToast("Failed to send reply.");
      setsendingReply(false);
    }

  }

  function showToast(message){
    toast.show(message, {
      type: "normal",
      placement: "top",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });

  }


  const handleAddStoryPress = ()=>{
    router.push('/sharestory')
  }

  const handleChatPress = (senderid,username) =>{

    const info = {
      username:username,
      uid:senderid,
    }

    router.push({
      pathname: '/chatglobal',
      params: { data:JSON.stringify({requeststatus:null,...info}) }
    });

    setViewersVisible(false)
  }

  const handleUserPress = (id) => {



    router.push({
        pathname: '/oppuserprofile',
        params: {uid:id}
    
    });

    setViewersVisible(false)
    
  }

  const renderItem = useCallback(
    ({ item }) => <StoryReplyItem handleUserPress={handleUserPress} handleChatPress={handleChatPress} viewer={item} threadCoordinates={activeThread.coordinates || {}}  />,
    [activeThread]
  );

  const onViewersClosed = useCallback(() => {
    setViewersVisible(false)
    handlePausePlay(false)
  })
  const [isDeletingStori, setDeletingStori] = useState(false);

  const handleDeleteStory = useCallback(async () => {

    setDeletingStori(true);
    const userinfo = await getData('@profile_info')
    const ref = doc(db, `users/${userinfo.uid}/stories/${activeThread.threadId}`);

    console.log("thread Delete: "+activeThread.threadId +" and "+ item.stories?.length)

    await deleteDoc(ref);
    if (item.stories?.length === 1) {
      dispatch(setData({intent:'storydepleted',id:"story"}));
    }
    
    setDialog(false);
    router.back();
                                             
  },[activeThread]);

  const handleDialogOpenClose = useCallback((state) => {
    setDialog(state);
    setPaused(state);
  });


 
  const handleProfilePress = () => {
    router.push({
      pathname:'/oppuserprofile',
      params:{uid:item.creatorid}
    });
  }

  const handleGoogleMaps = useCallback(() => {
    const latitude = activeThread.coordinates.latitude || activeThread.coordinates._latitude;

    const longitude = activeThread.coordinates.longitude || activeThread.coordinates._longitude
    goToGoogleMap(latitude,longitude)
  },[activeThread]);

  const [isHolding, setIsHolding] = useState(false);
  const [holdTriggered, setHoldTriggered] = useState(false);

  let holdTimeout;

  const handlePressIn = () => {
    console.log('Press In');
    setIsHolding(true);
    setHoldTriggered(false);

    // Start a timeout for "hold" action
    holdTimeout = setTimeout(() => {
      setHoldTriggered(true);
      console.log('Hold action triggered!');
      handlePausePlay(true);
    }, 600); // Adjust duration for hold (e.g., 600ms)
    
  };

  const handlePressOut = () => {
    console.log('Press Out');
    clearTimeout(holdTimeout);

    if (isHolding && !holdTriggered) {
      console.log('Regular press action triggered!');
      // Perform onPress-specific action here
      handlePausePlay(false);
    }
  };

  const [dialogDownLoad, setDialogDownLoad] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const MediaSharePress = useCallback(async()=> {
    handlePausePlay(true);
    setDialogDownLoad(true);
    await handleSharePostPress(activeThread.content,activeThread.contentType, item.creatorid, null, setDownloadProgress, setDialogDownLoad)

    handlePausePlay(false)
  },[activeThread,item]);

  const handleDownLoadDialogClose = useCallback(()=>{
    setDialogDownLoad(false);
  })

  const [cachedVideos, setCachedVideos] = useState({});

  const cacheVideos = useCallback(async () => {

    if (!item.stories) return;

    const videoItems = item.stories.filter((story) => story.contentType === "video");
  
    console.log(`Caching videos for item ${item.id}...`);
  
    const cachingPromises = videoItems.map(async (story) => {
      const fileUri = `${FileSystem.cacheDirectory}${story.threadId}.mp4`;
  
      // Check if video is already cached in state
      if (cachedVideos[story.threadId]) {
        console.log(`Already cached: ${fileUri}`);
        return cachedVideos[story.threadId];
      }
  
      // Check if file exists in cache
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        console.log(`Found in cache: ${fileUri}`);
        setCachedVideos((prev) => ({ ...prev, [story.threadId]: fileUri }));
        return fileUri;
      }
  
      try {
        console.log(`Downloading video: ${story.content} -> ${fileUri}`);
        const downloadResumable = FileSystem.createDownloadResumable(story.content, fileUri);
        const { uri } = await downloadResumable.downloadAsync();
  
        setCachedVideos((prev) => ({ ...prev, [story.threadId]: uri }));
        return uri;
      } catch (e) {
        console.error(`Error caching video ${story.threadId}:`, e);
        return story.content; // Fallback to remote URL
      }
    });
  
    const cachedUris = await Promise.all(cachingPromises);
    console.log("✅ All videos cached!", cachedUris);
  }, [item, cachedVideos]);
  
  useEffect(() =>{
    cacheVideos()
  },[item])


  
  return (

    <GestureHandlerRootView>
      <SafeAreaView>
        <View style={{ width: '100%',height:'100%'}}>
            <View style={{width:'100%',flex:1}}>

                <TouchableWithoutFeedback  onPress={handlePress}>

                {activeThread.contentType ? <View style={styles.mainView}>
                    {activeThread.contentType === 'image' ? (
                    <View style={{  borderRadius: 10 }}>
                        <ImageBackground
                        resizeMode='contain'
                        source={{ uri: activeThread.content }}
                        style={styles.mainShape}
                        />
                    </View>
                    ) : (
                    <View style={{ borderRadius: 10 }}>
                        <Video
                        source={{ uri: cachedVideos[activeThread.threadId] || activeThread.content }}
                        key={activeThread.threadId}
                        ref={videoRef}
                        style={styles.mainShape}
                        resizeMode={ResizeMode.CONTAIN}
                        useNativeControls={false}
                        usePoster={true}
                        shouldPlay={true}
                        posterStyle={{ overflow: 'hidden', resizeMode: 'contain' }}
                        posterSource={{ uri: activeThread.thumbnail !== null ? activeThread.thumbnail : 'imagee' }}
                        onPlaybackStatusUpdate={(status) => {
                            if (status.didJustFinish) {
                            addViewedThread(activeThread.content);
                            goToNextThread();
                            }
                            if (status.isLoaded && videoRef.current) {
                            setDuration(status.durationMillis);
                            setVideoReady(true);     
                            }
                        }}
                        />
                    </View>
                    )}
                </View> : <View ></View>}
                </TouchableWithoutFeedback>

                <View style={{ flexDirection: 'row', position: 'absolute', marginBottom: 30, marginStart: 30, top: 0 ,marginTop:10,alignItems:'center'}}>

                <TouchableOpacity  onPress={handleBackPress}>
                 <Image source={require('@/assets/icons/arrow.png')} style={{ width: 25, height: 25, tintColor: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,marginEnd: 10 }} />
                </TouchableOpacity>  

                {(isCurrentUser && activeThread.createdAt) && <Text style={{fontSize:15, color:'gray',marginStart:5}}>{timeAgo(activeThread.createdAt)}</Text>}

                

                {!isCurrentUser && <TouchableOpacity onPress={handleProfilePress}>

                  <View style={{flexDirection:'row',alignItems:'center'}}>
                  <Image source={{ uri: item.userProfileImage ? item.userProfileImage : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}} style={{ width: 40, height: 40, borderColor: 'white', borderWidth: 2, borderRadius: 20, marginEnd: 10 }} />

                  <View>
                    <View style={{flexDirection:"row", alignItems:'center'}}>
                      <Text style={{ fontSize: 15, color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main  }}>{item.username}</Text>

                      {item.verified && <Image
                                          resizeMode="contain"
                                          source={require('@/assets/icons/verified.png')}
                                        style={{height:15,width:15,marginStart:3}}
                                      />}

                    </View>

                    {activeThread.createdAt && <Text style={{fontSize:15, color:'gray',marginTop:3}}>{timeAgo(activeThread.createdAt)}</Text>}

                  </View>
                 
                  </View>

                </TouchableOpacity> }

                {<Text style={{flex:1}} />}

                <View style={{ marginEnd:5,end:5, alignItems:'center', flexDirection:'row' }}>


                  {(activeThread.isshowinglocation || isCurrentUser) && <TouchableOpacity onPress={handleGoogleMaps}>
                  
                    <View style={{borderRadius:5, backgroundColor:Colors.blue,alignItems:'center',flexDirection:'row', paddingHorizontal:10, marginRight:10}}>
                      <Image style={{height:25,width:25, tintColor:'white'}} source={require('@/assets/icons/right-arrow.png')}/>

                      <View style={{height:30,width:1,backgroundColor:'white',marginLeft:10,marginRight:10}}/>

                      <Image style={{height:25,width:25}} source={require('@/assets/icons/map.png')}/>

                    </View>


                  </TouchableOpacity>}


                  {!isCurrentUser && <Menu renderer={Popover} >
                    <MenuTrigger >
                    <Image
                          resizeMode="contain"
                          source={require('@/assets/icons/menu.png')}
                          style={[styles.menuIcon, {tintColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}
                        />
                    </MenuTrigger>
                    <MenuOptions >

    
                      <MenuOption onSelect={MediaSharePress}>
                        <View style={{flexDirection:'row'}}>
    
                          <Image
                            resizeMode="contain"
                            source={require('@/assets/icons/sharing_post.png')}
                            style={{tintColor:'gray',height:20,width:20}}
                          />
    
                          <Text style={{color:'black'}}> Share media</Text>
    
                        </View>
                          
                      </MenuOption>
                      
                    </MenuOptions>
                  </Menu>}

                  { isCurrentUser && <TouchableOpacity onPress={handleAddStoryPress}>
                    <Image style={{ width: 40, height: 40 ,tintColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,end:10, marginStart:10}} source={require('@/assets/icons/addpost.png')} />
                  </TouchableOpacity>}

                </View>

                {}
                
                </View>
            </View>

            

            {isCurrentUser && <View style={{position:'absolute',bottom:50,flexDirection:"row",alignItems:'center',alignContent:'space-between',flex:1,width:"100%"}}>

              <View style={{flexDirection:"row",alignItems:'center'}}>
                <TouchableOpacity  onPress={handleViewersPress}>

                  <View style={{flexDirection:'row',marginStart:15,alignItems:'center',padding:5,backgroundColor:Colors.blue,borderRadius:5}}>
                    <View style={{flexDirection:'row',alignItems:'center',padding:5}}>

                    <Image style={{ width: 20, height: 20 ,tintColor:'white'}} source={require('@/assets/icons/eye.png')} />

                    <Text style={{fontSize:15,color:'white',marginStart:3}}>
                        {activeThread.views}
                    </Text>
                    

                    </View> 

                    <View style={{flexDirection:'row',alignItems:'center',padding:5,marginStart:10}}>

                      <Image style={{ width: 20, height: 20 ,tintColor:'white'}} source={require('@/assets/icons/replyStory.png')} />

                      <Text style={{fontSize:15,color:'white'}}>
                        {activeThread.replies}
                      </Text>
                      

                    </View> 

                  </View>

                  </TouchableOpacity>

                  

              </View>
              

              <Text style={{flex:1}}></Text>

              <TouchableOpacity onPress={() => handleDialogOpenClose(true)}>
                <View style={{height:50,width:50, padding:10, alignSelf:'flex-end',backgroundColor:"white",alignItems:'center',borderRadius:5,end:20}}>
                  <Image style={{tintColor:"red",width:20, height:20,marginTop:2}} source={require('@/assets/icons/deletepost.png')}/>
                </View>
              </TouchableOpacity>

            </View>
           
             }


            {!isCurrentUser && <View style={styles.container}>

              { !sendingReply ? (
                <View style={{flexDirection:'row',alignItems:'center'}}>

                  <TextInput
                  onChangeText={setText} 
                  placeholderTextColor='gray' 
                  value={text}
                  placeholder='Reply to story..' style={styles.textInput}/>

                  <TouchableOpacity onPress={handleSendReply}>
                        <Image
                          style={styles.sendIcon}
                          source={require('@/assets/icons/send.png')}
                        />
                  </TouchableOpacity>


                </View>
              ):(

                <Text style={{ fontSize: 15, color: 'white',marginStart:10 }}>Sending reply..</Text>

              )

              }

              

            </View> }


            {activeThread.caption && <Text numberOfLines={4} style={{ fontSize: 17, color: 'white',position:'absolute',bottom:200 ,alignSelf:'center',fontWeight:'bold',maxWidth:'80%'}}>{activeThread.caption}</Text>}


            

            <View style={styles.progressContainer}>
                {item?.stories?.map((thread, index) => (
                <ProgressIndicator
                    key={thread.content}
                    
                    duration={thread.contentType === 'image' ? 5000 : isVideoReady ? durationTime : 0}
                    isActive={activeThreadIndex === index}
                    content={activeThread.content}
                    contentType={activeThread.contentType}
                    isVideoBuffering={isVideoBuffering}
                    isPaused={isPaused}
                
                    focused={isFocused}
                    viewedThreads={viewedThreads}
                    previousPos={activeThreadIndex}
                    id={thread.threadId}
                    position={index}
                />
                ))}
            </View>

        </View>


        <Storybottomsheet renderItem={renderItem} activethread={activeThread}  isVisible={viewersVisible} onClose={onViewersClosed}/>

        <Dialog isVisible={dialog}>

          {!isDeletingStori ? <View style={{padding:10,backgroundColor:Colors.dark_gray,borderRadius:10}}>

            <Text style={{color:'white',margin:5,fontSize:20,marginBottom:15,marginHorizontal:15}}>Delete current story?</Text>


            <View style={{flexDirection:"row",alignContent:"space-between"}}>

              <TouchableOpacity onPress={handleDeleteStory} style={{flex:1}} >

                <View  style={{flexDirection:'row'}}>

                  <Image style={{width:30,height:30,tintColor:'red'}} source={require('@/assets/icons/deletepost.png')}/>

                  <Text style={{color:'red',fontSize:20,marginStart:3}}>Proceed</Text>

                </View>

              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleDialogOpenClose(false)}>

              <Text style={{color:'white',marginStart:5,fontSize:20}}>Cancel</Text>

              </TouchableOpacity>



            </View>


            


          </View> : <ActivityIndicator size="large" color="white"/>}

        </Dialog>


        {dialogDownLoad && <CustomDialog onClose={handleDownLoadDialogClose}  isVisible={dialogDownLoad}>

        {<View  style={{backgroundColor:colorScheme == 'dark' ? Colors.dark_gray : Colors.light_main ,padding:20, borderRadius:10,alignItems:'center'}} >
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

        </View>}


        </CustomDialog>}

       
    </SafeAreaView>

    

    </GestureHandlerRootView>
    

    
  )
}


const ProgressIndicator = React.memo(({isPaused,  id, viewedThreads, duration, isActive, position, previousPos, content, contentType, isVideoBuffering, threadSize, threadPosition, isStoryActive }) => {
    const [progress, setProgress] = useState(new Animated.Value(0));

    useEffect(() => {

      if (isActive && !isPaused && duration > 0) {
        if (!viewedThreads.has(id)) {
          progress.setValue(0);
          Animated.timing(progress, {
            toValue: 1,
            duration: duration,
            useNativeDriver: false,
          }).start();
        } else {
          progress.setValue(0);
          Animated.timing(progress, {
            toValue: 1,
            duration: duration,
            useNativeDriver: false,
          }).start();
        }
      } else {

        if(isPaused){
            progress.stopAnimation()
        }else{
          if (!viewedThreads.has(id)) {
              if (previousPos > position) {
                progress.setValue(1);
              } else {
                progress.setValue(0);
              }
            } else {
                if (position > previousPos) {
                    progress.setValue(0);
                  } else {
                    progress.setValue(1);
                  }
            }

        }


       
      }
    }, [isActive, duration, isVideoBuffering,isPaused]);
  
    return (
      <View style={styles.progressBackground}>
        <Animated.View style={[styles.progressForeground, { flex: progress }]} />
      </View>
    );
  });

export default story

const styles = StyleSheet.create({ 
    sendIcon: {
        width: 20,
        marginEnd:15,
        height: 20,
      },
      menuIcon: {
        width: 30,
        height: 30,
        paddingRight: 25,
      },

    textInput: {
        color: 'white',
        padding: 10,
        marginRight: 10,
        flex: 1,
        borderRadius: 10,
        borderColor: 'white',
        shadowColor: 'gray',
      },

    container: {
        height: 50,
        flexDirection: 'row',
        
        backgroundColor: Colors.dark_gray, // Replace with Colors.dark_gray if it's defined
        alignItems: 'center',
      },
    mainShape: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderTopRightRadius:10,
    borderTopLeftRadius:10,
    shadowColor: 'white',
   
    shadowRadius: 10,
    shadowOpacity: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 10,
    left: 10,
    marginTop: 50,
    marginEnd: 15,
    marginStart: 15,
    marginBottom: 2,
    right: 10,
    height: 2,
    zIndex: 1,
  },
  progressBackground: {
    flex: 1,
    flexDirection: 'row',
    height: 5,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
    margin: 2,
  },
  progressForeground: {
    backgroundColor: '#FFA500',
  },})