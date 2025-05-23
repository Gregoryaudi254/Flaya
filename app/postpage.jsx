import { StyleSheet, Text, View, Image, ImageBackground, Dimensions, TouchableOpacity, ActivityIndicator, TouchableWithoutFeedback, FlatList, TextInput } from 'react-native';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ResizeMode, Video } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import CommentsPost from '@/components/commentsPost';
import CustomDialogRepost from '@/components/CustomDialogRepost';
import { getData, storeData } from '@/constants/localstorage';
import { db } from '@/constants/firebase';

import { setDoc, serverTimestamp, doc, getDoc, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Comments from '@/components/comments';

import { getDistance } from 'geolib';
import { Menu, MenuOptions, MenuOption, MenuTrigger, renderers } from 'react-native-popup-menu';
const { ContextMenu, SlideInMenu, Popover } = renderers;
import Dialog from '@/components/CustomDialog';

import { Colors } from '@/constants/Colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ImageSlider } from "react-native-image-slider-banner";
import ImageView from "react-native-image-viewing";
import { defaultProfileImage, goToGoogleMap, handleSharePostPress } from '@/constants/common';
import { useDispatch, useSelector } from 'react-redux';
import { setData } from '@/slices/dataChangeSlice';
const { width: screenWidth, height } = Dimensions.get('window');
import { useColorScheme } from '@/hooks/useColorScheme';

import PullToRefresh from 'react-native-pull-to-refresh';
import { timeAgo } from '@/constants/timeAgo';
import MemoizedDialog from '@/components/MemoizedDialog';
import ReportBottomSheet from '@/components/ReportBottomSheet';
import DownLoadMediaItem from '@/components/DownloadMediaItem';
import CustomDialog from '@/components/CustomDialog';
import CircularProgress from "react-native-circular-progress-indicator";
import { timeAgoPost } from '@/constants/timeAgoPost';
import InteractingUsers from '@/components/Likers';

import { useToast } from 'react-native-toast-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';

const reports = ['Nudity or sexual activity','Scam or Fraud','Violence or self injury','False information', 'Child abuse'];

// Add this memoized component definition before the postpage component
const CaptionEditBottomSheet = React.memo(({ 
  bottomSheetRef, 
  colorScheme, 
  newDescription, 
  setNewDescription, 
  loading, 
  handleSaveCaption,
  onSheetChange
}) => {
  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['50%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: colorScheme === 'dark' ? '#666666' : '#CCCCCC' }}
      onChange={onSheetChange}
    >
      <View style={{
        flex: 1,
        padding: 16
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          marginBottom: 16,
          color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main
        }}>
          Edit Caption
        </Text>
        
        <TextInput
          style={{
            height: 120,
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? '#444444' : '#DDDDDD',
            borderRadius: 10,
            padding: 15,
            marginBottom: 20,
            textAlignVertical: 'top',
            color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,
            backgroundColor: colorScheme === 'dark' ? '#333333' : '#F5F5F5',
          }}
          placeholder="Enter a caption for your post..."
          placeholderTextColor={colorScheme === 'dark' ? '#777777' : '#999999'}
          multiline
          value={newDescription}
          onChangeText={setNewDescription}
        />
        
        <TouchableOpacity
          style={{
            height: 50,
            borderRadius: 25,
            backgroundColor: loading ? '#888888' : Colors.blue,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 10,
          }}
          onPress={handleSaveCaption}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
            }}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
});

const postpage = () => {

  const colorScheme = useColorScheme()

  const toast = useToast();
  


  const dispatch = useDispatch()
    
    const { data } = useLocalSearchParams();

  
    const [post, setPost] = useState(JSON.parse(data))
    const iscurrentuserpost = post.origin === 'currentuserprofile';


  
    const videoRef = useRef(null);

    const [isLiked, setLiked] = useState(false);
    const [isVideoPlaying, setVideoPlaying] = useState(true);

    const [isFullWidthModalVisible, setIsFullWidthModalVisible] = useState(false);
    


    const [isReportLoading,setReportLoading] = useState(false);
    const [selectedImage, setselectedImage] = useState(null);
    const [imageViewerVisible, setimageViewerVisible] = useState(false);
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
    const [descriptionEdit, setDescriptionEdit] = useState(false);
    const [newDescription, setNewDescription] = useState("");

    const [isloading,setLoading] = useState(false)


    const getFormatedString = (number) => {

      return (number || 0) < 1000 
      ? `${number || 0}` 
      : `${(number / 1000).toFixed(1)}k`
  
    }
  
    
  
    const [likes,setLikes] = useState(post.likes)
  
    const [shares, setShares] = useState(post.shares)

    useEffect(() => {
        setLikes(post.likes);
        setShares(post.shares)
    
      },[post.likes, post.shares])


    const bottomSheetRef = useRef(null);
    const captionEditSheetRef = useRef(null);
    const initialSnapIndex = -1;

    const onReportPress = useCallback((postinfo) => {
      setReportInfo(postinfo)
      bottomSheetRef.current?.snapToIndex(0);
    }, []);
  
    
    
  
    const updateInteranctions = useCallback(async (path)=>{

      const userinfo = await getData('@profile_info');
          
      const ref = doc(db,`users/${post.user}/posts/${post.id}/${path}/${userinfo.uid}`)
  
      await setDoc(ref,userinfo,{merge:true});
  
  
    })
  
    const handleOnLiked = useCallback(async() => {
  
  
      let likedposts = await getData('@liked_posts')
  
      if (!likedposts) {
        likedposts = []
      }
  
      if (!likedposts.includes(post.id)) {
  
       // Update the interaction in Firestore
      await updateInteranctions('likes');
  
      // Optimistically update the like state in the UI
      setLiked(true);
      setLikes((prevLikes) => (post.likes || 0) + 1);
  
      // Update the liked posts array immutably
      const updatedLikedPosts = [...likedposts, post.id];
  
      // Store the new liked posts array
      await storeData('@liked_posts', updatedLikedPosts);
  
      // Optionally, if you have a setter for likedposts, update the state in the app
      // setLikedPosts(updatedLikedPosts);
  
      }
      
    }, [post]);

   
      
  
  
    const handleCommentPress = useCallback(() => {
      setIsFullWidthModalVisible(true);
    }, []);
  
    const handleOnPlay = useCallback(async () => {
      try {
        if (videoRef.current) {
            videoRef.current.setPositionAsync(0);
           
            setVideoPlaying(true);
            await videoRef.current.playAsync();
        }
      } catch (e) {
        console.error("Error playing video:", e);
      }
    }, []);
  
    
  
    useEffect(() => {
      return () => {
        if (videoRef.current) {
          videoRef.current.stopAsync();
        }
      };
    }, []);
  
    const handlePlaybackStatusUpdate = useCallback((status) => {
  
      if(status.didJustFinish){
        if (videoRef.current) {
          setVideoPlaying(false)
        }
  
      }
     
    }, []);


    const router = useRouter();


    const handleClose = () => {
      router.back(); // Navigate back to the previous screen
      // Or navigate to a specific screen:
      // router.push('/desired-screen');
    };


    const userlocation = post.userinfo.coordinates;

    const { coordinates } = useSelector(state => state.location);

    const [distanceString , setDistanceString] = useState(null);
    

    const setLocation = useCallback((coordinates) => {
    
        try{

          
    
          const usergeopoint = { latitude: coordinates.latitude, longitude: coordinates.longitude };
          const postgeopoint = { latitude: post.coordinates._latitude || post.coordinates.latitude, longitude: post.coordinates._longitude || post.coordinates.longitude};
          const distance = getDistance(usergeopoint,postgeopoint);
          
          const distanceString = distance < 1000 
          ? `${distance} m` 
          : `${(distance / 1000).toFixed(1)} km`;
      
          setDistanceString(distanceString)
    
        }catch(e){console.log(e+"wpw")}
        });
    

    useEffect(() => {
        try{
          if (coordinates.coords) {
            console.log("redux")
            setLocation({latitude:coordinates.coords.latitude, longitude:coordinates.coords.longitude})
          }else if (userlocation){ 
            console.log("notredux")
            setLocation(userlocation)
          }
    
        }catch(e){
          console.log("crashed ",e)
        }
    
        
      }, [coordinates])
  
   
  
  
    const [isShared,setShared] = useState(false);
  
    const onRepostSelect = useCallback(async()=>{
  
      let sharedposts = await getData('@shared_posts')
  
      if (!sharedposts) {
        sharedposts = []
      }
   
      if (!sharedposts.includes(post.id)) {
  
        // Update the interaction in Firestore
        await updateInteranctions('shares');
  
        // Optimistically update the share state in the UI
        setShared(true);
        setShares((prevShares) => (post.shares || 0) + 1);
  
        // Update the share posts array immutably
        const updatedSharedPosts = [...sharedposts, post.id];
  
        // Store the new share posts array
        await storeData('@shared_posts', updatedSharedPosts);
  
        // Optionally, if you have a setter for sharedposts, update the state in the app
        // setsharePosts(updatedsharePosts);
  
      }
      
    },[post]);

    const snapPoinst = useMemo(() => ['40%'],[]);

    const onReportPressed = useCallback(async(report) => {

      const profileinfo = await getData('@profile_info');
  
      setReportLoading(true);
  
      await setDoc(doc(db, `users/${post.user}/posts/${post.id}/reports`, profileinfo.uid), {
        report:report,
        reporterid:profileinfo.uid,
        createdAt: serverTimestamp() // Add a timestamp or any other required fields
      });
  
      setReportLoading(false);
  
      bottomSheetRef.current?.close();
    });

    const [dialog,setDialog] = useState(false)

    const handleBlockUser = useCallback(() => {
      setDialog(true)
    });

    const handleProfilePress = ()=> {
      router.push({
        pathname:'/oppuserprofile',
        params:{uid:post.user}
      })
    }


    const handleCommentModalClose = () => {
      setIsFullWidthModalVisible(false)
    }


     useEffect(() => {
      console.log("is opened "+isBottomSheetOpen)
      if (isBottomSheetOpen) {
        setTimeout(() => {
          bottomSheetRef.current?.snapToIndex(0)
        }, 600); // delay it by 100ms or adjust as needed
        bottomSheetRef.current?.snapToIndex(0)
        
      }
    }, [isBottomSheetOpen]);

    const onReportDialogOpen = useCallback((postinfo) => {
      setIsBottomSheetOpen(true)
    }, []);

    const onDeletePost = useCallback((postinfo) => {
     setDialog(true);
    }, []);


    const isAlreadyLiked = async () => {

      let likedcomments = await getData('@liked_posts')

      if (!likedcomments) {
        likedcomments = []
      }
      setLiked(likedcomments.includes(post.id))
      }

    useEffect(() => {
      isAlreadyLiked();
      isAlreadyShared();
    },[])


    const onImagePress = (image)=>{
      const imageLi = [{uri:image}]
      setselectedImage(imageLi)
      setimageViewerVisible(true)
    }


    const isAlreadyShared = async () => {

      let sharedPosts = await getData('@shared_posts')
  
      if (!sharedPosts) {
        sharedPosts = []
      }
      setShared(sharedPosts.includes(post.id))
      }

      const [oppuserinfo,setoppuserinfo] = useState(null)


      const getoppUserInfo = async () => {
        const ref = doc(db,`users/${post.user}`);
        const snap = await getDoc(ref);
        setoppuserinfo({profileImage:snap.data().profilephoto,username:snap.data().username})
      }

      useEffect(() => {
        getoppUserInfo()
      },[]);



      const handleOnDialogPress = useCallback(async () => {

        console.log("handling delete " + iscurrentuserpost)

        if (iscurrentuserpost) {
          const postRef = doc(db, `users/${post.user}/posts/${post.id}`);
          await deleteDoc(postRef);

          dispatch(setData({id:post.id, intent:'postdelete'}));

          router.back();
        } else {

          setDialog(false);

          setLoading(true);

          const batch = writeBatch(db);

          const oppuserinfo = {
            username:post.userinfo.username,
            uid:post.user,
            profilephoto:post.userinfo.profilephoto
          }

          const currentuserprofile = await getData('@profile_info')
          const currentUserRef = doc(db, `users/${currentuserprofile.uid}/blockedusers/${post.user}`);
          batch.set(currentUserRef, oppuserinfo);

        
          const oppUserRef = doc(db, `users/${post.user}/blockers/${currentuserprofile.uid}`);
          batch.set(oppUserRef, currentuserprofile);

          try {
            batch.commit();
            setLoading(false);

            dispatch(setData({id:post.user, intent:'blockuser'}));
            router.back();

          }catch(e){}
        }
        
      },[iscurrentuserpost]);



      const handleGoogleMaps = useCallback(() => {
        goToGoogleMap(post.coordinates._latitude || post.coordinates.latitude, post.coordinates._longitude ||  post.coordinates.longitude)
      });

      const [isrefreshing,setrefreshing] = useState(false)

      const handleRefresh = async () => {

        if (isrefreshing) return;
        setrefreshing(true);

        console.log("isrefreshing")

        return new Promise(async(resolve) => {
          const postRef = doc(db,`users/${post.user}/posts/${post.id}`);
          const info = await getDoc(postRef);

          

          const item = {...post, ...info.data()}
          console.log("ITEM +"+JSON.stringify(item));
          
          setPost(item)
          setrefreshing(false)
          resolve();
        });
  
      }

      const [timestamp,setTimestamp] = useState(null);

      useEffect(() => {

        const getStamp = async () => {
          const postRef = doc(db,`users/${post.user}/posts/${post.id}`);
          const info = await getDoc(postRef);
          setTimestamp(info.data().createdAt)
        }

        getStamp();

      },[])


      useEffect(() => {

        const setViewed = async () => {
          const userInfo = await getData('@profile_info');
          const ref = doc(db, `users/${post.user}/posts/${post.id}/views/${userInfo.uid}`);
          await setDoc(ref, userInfo, {merge:true})
        }
        setViewed();
      },[]);

      const handleBottomChanges = useCallback((index) => {
        console.log("changed bottomsheet");
        setIsBottomSheetOpen(index !== -1);
      });
      

      
      const [dialogDownLoad, setDialogDownLoad] = useState(false);
      const [downloadProgress, setDownloadProgress] = useState(0);
      const [sharingUrls, setsharingUrls] = useState([]);
      
      const postSharePress = useCallback(()=> {

        console.log("sharing")

        let url;
        if (post.contentType === "image") {
          url = post.content[0]
        }else {
          url = post.content;
        }

        if (post.contentType === "image" && post.content.length > 1) {
          setsharingUrls(post.content);
          setDialogDownLoad(true);
          return;
        }
        setDialogDownLoad(true);
        handleSharePostPress(url,post.contentType, post.user, post.id, setDownloadProgress, setDialogDownLoad);

      },[post]);



      // Handle share of the media selected if there was multiple images to shared
      const handleSharePressSingleImage = useCallback((item) => {
        setsharingUrls([]);
        handleSharePostPress(item,post.contentType, post.user,post.id,setDownloadProgress, setDialogDownLoad);
      },[post]);

      const handleDialogClose = useCallback(()=>{
         setsharingUrls([])
         setDialogDownLoad(false);
      });


      const [isLikersModalVisible, setLikersModalVisible] = useState(false);
      const handleLikesPress = useCallback(() => {
        setLikersModalVisible(true);
      });

      const handleLikersModalClose = () =>{
        setLikersModalVisible(false)
      }

      const showToast = (message) => {

        toast.show(message, {
          type: "normal",
          placement: 'bottom',
          duration: 2000,
          offset: 30,
          animationType: "zoom-in",
        });
    
      };


      const onCaptionEdit = useCallback(() => {
        setNewDescription(post.description || "");
        if (captionEditSheetRef.current) {
          captionEditSheetRef.current.snapToIndex(0);
        }
      }, [post.description]);

      const [captionLoading, setCaptionLoading] = useState(false);

      const handleSaveCaption = useCallback(async () => {
        try {


          if (newDescription !== null && newDescription !== undefined) {
            if (newDescription.length > 170) {
              showToast("Too many words")
              return
            }
          }
          setCaptionLoading(true);
          
          // Update the post in Firestore
          const postRef = doc(db, `users/${post.user}/posts/${post.id}`);
          await updateDoc(postRef, {
            description: newDescription
          });
          
          // Update local state
          setPost(prev => ({
            ...prev,
            description: newDescription
          }));
          
          // Close the bottom sheet
          if (captionEditSheetRef.current) {
            captionEditSheetRef.current.close();
          }
          
          // Dispatch update to Redux if needed
          dispatch(setData({info: {description:newDescription, id:post.id}, intent: 'postupdate'}));
          
          showToast("Caption updated successfully");
        } catch (error) {
          console.error("Error updating caption:", error);
          showToast("Error updating caption");
        } finally {
          setCaptionLoading(false);
        }
      }, [newDescription, post]);
      
     
    return (

      <GestureHandlerRootView>

        <SafeAreaView style={{flex:1}}>



          <View style={{flex:1}} >

          

         
          <PullToRefresh
           style={{ flex:1,height:300,width:"100%"}}
           onRefresh={handleRefresh}
            >

            <View style={styles.mainView}>


                      

            <View style={styles.headerView}>

            <TouchableOpacity onPress={handleClose} >
            <Image style={{width:30,height:30, tintColor:colorScheme === 'dark' ? 'white' : 'black'}} source={require('@/assets/icons/arrow.png')}></Image>
            </TouchableOpacity>

              <View style={{flexDirection:'row',justifyContent:'space-between',flex:1,alignItems:'center',marginStart:20}}>

                <View>

                  {!iscurrentuserpost ? <TouchableOpacity onPress={handleProfilePress}>

                    <View style={styles.profileView}>

                      <Image
                          source={{ uri:oppuserinfo !== null ? oppuserinfo.profileImage : defaultProfileImage}}
                          style={styles.profileImage}
                      />


                      <View>

                        <View style={{flexDirection:'row',alignItems:'center'}}>

                        <Text style={[styles.username, {color:colorScheme === 'dark' ? 'white' : 'black'}]}>{oppuserinfo !== null ? oppuserinfo.username : ""}</Text>


                        {post.verified && <Image
                                          resizeMode="contain"
                                          source={require('@/assets/icons/verified.png')}
                                          style={{
                                            width: 20,
                                            height: 20,    
                                            paddingRight: 25,
                                          }}
                                        />}

                        </View>

                        {timestamp !== null && <Text style={{fontSize:15, color:'gray',marginTop:1}}>{timeAgoPost(timestamp)}</Text>}

                      </View>

                      

                     

                    </View>

                    </TouchableOpacity> : <View></View>
                    }

                    {(timestamp !== null && iscurrentuserpost) && <Text style={{fontSize:15, color:'gray'}}>{timeAgoPost(timestamp)}</Text>}

                </View>

               
              
                <View style={{flexDirection:'row',alignItems:'center'}}>

                  {(post.isshowinglocation || iscurrentuserpost) && <TouchableOpacity onPress={handleGoogleMaps}>

                    <View style={{borderRadius:5, backgroundColor:Colors.blue,alignItems:'center',flexDirection:'row', paddingHorizontal:10, marginRight:10}}>
                      <Image style={{height:25,width:25, tintColor:'white'}} source={require('@/assets/icons/right-arrow.png')}/>

                      <View style={{height:30,width:1,backgroundColor:'white',marginLeft:10,marginRight:10}}/>

                      <Image style={{height:25,width:25}} source={require('@/assets/icons/map.png')}/>

                    </View>


                  </TouchableOpacity>}

                  
                  <Menu style={{right:10, marginLeft:10}} renderer={Popover}>
                    <MenuTrigger>
                      <View style={styles.menuIconContainer}>
                      <Image
                        resizeMode="contain"
                        source={require('@/assets/icons/menu.png')}
                        style={[styles.menuIcon, {tintColor:'gray'}]}
                      />
                      </View>
                    </MenuTrigger>
                    <MenuOptions customStyles={{
                      optionsContainer: {
                        borderRadius: 12,
                        padding: 8,
                        width: 200,
                        backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 5,
                        elevation: 6
                      }
                    }}>

                      {!iscurrentuserpost && (
                        <MenuOption onSelect={() => 
                          handleBlockUser({postcreatorid:post.user, postcreatorimage:post.profileImage,postcreatorusername:post.username})
                        }>
                          <View style={styles.menuItemContainer}>
                            <Ionicons name="person-remove-outline" size={20} color={colorScheme === 'dark' ? '#FF6B6B' : '#FF3B30'} />
                            <Text style={[styles.menuItemText, {color: colorScheme === 'dark' ? '#FF6B6B' : '#FF3B30'}]}>Block user</Text>
                          </View>
                        </MenuOption>
                      )}

                      {iscurrentuserpost && (
                        <MenuOption onSelect={onDeletePost}>
                          <View style={styles.menuItemContainer}>
                            <Ionicons name="trash-outline" size={20} color={colorScheme === 'dark' ? '#FF6B6B' : '#FF3B30'} />
                            <Text style={[styles.menuItemText, {color: colorScheme === 'dark' ? '#FF6B6B' : '#FF3B30'}]}>Delete post</Text>
                          </View>
                        </MenuOption>
                      )}

                      {iscurrentuserpost && (
                        <MenuOption onSelect={onCaptionEdit}>
                          <View style={styles.menuItemContainer}>
                            <Ionicons name="create-outline" size={20} color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} />
                            <Text style={[styles.menuItemText, {color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Edit caption</Text>
                          </View>
                        </MenuOption>
                      )}

                      {!iscurrentuserpost && (
                        <MenuOption onSelect={postSharePress}>
                          <View style={styles.menuItemContainer}>
                            <Ionicons name="share-social-outline" size={20} color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} />
                            <Text style={[styles.menuItemText, {color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Share post</Text>
                          </View>
                        </MenuOption>
                      )}
                      
                      {!iscurrentuserpost && (
                        <MenuOption onSelect={onReportDialogOpen}>
                          <View style={styles.menuItemContainer}>
                            <Ionicons name="flag-outline" size={20} color={colorScheme === 'dark' ? '#FF6B6B' : '#FF3B30'} />
                            <Text style={[styles.menuItemText, {color: colorScheme === 'dark' ? '#FF6B6B' : '#FF3B30'}]}>Report post</Text>
                          </View>
                        </MenuOption>
                      )}
                    </MenuOptions>
                  </Menu>


                </View>

                

              </View>

              
            </View>







           <View style={{flexDirection:'column',flex:1,height:height - 70, marginTop:15}}>

           {post.description?.length > 0 && <Text style={styles.description}>{post.description}</Text>}

          <View style={{ flex:1, width: '100%',marginBottom:5}}>
            {post.contentType === 'image' ? post.content.length < 2 ? (
              <View style={{flex:1}}>
                <TouchableWithoutFeedback onPress={()=>onImagePress(post.content[0])}>

                <ImageBackground
                resizeMode='contain'
                  source={{ uri: post.content[0] }}
                  style={{ width: '100%', height: '100%', borderRadius: 10, overflow: 'hidden',flex:1}}
                />

                </TouchableWithoutFeedback>

              </View>
              
            
            ):
            ( <View style={{borderRadius:10,flex:1}}>

                <ImageSlider 

                caroselImageContainerStyle={{height:'100%',overflow:'hidden',width:screenWidth-50,borderRadius:10}}
                caroselImageStyle={{resizeMode:'contain',height:'100%',overflow:'hidden',width:screenWidth-50,marginHorizontal:5,borderRadius:10}}
                data={post.content.map((image) => ({ img: image }))}
                autoPlay={false}


                onItemChanged={(item) => console.log("item", item)}
                closeIconColor="#fff"
                />

            </View>
            
            ) : (
                    <View >

                <Video
                source={{ uri: post.content }}
                shouldPlay={true}
                ref={videoRef}
                style={{ width: '100%',height:'100%',  borderRadius: 10,overflow:'hidden' }}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls={true}
                usePoster={true}
              
                posterStyle={{ borderRadius: 10, overflow: 'hidden', resizeMode: 'contain' }}
                posterSource={{ uri: post.thumbnail }}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                />
                <TouchableOpacity
                onPress={handleOnPlay}
                style={{
                    position: 'absolute',
                    alignSelf: 'center',
                    top: '50%',
                    opacity: !isVideoPlaying ? 1 : 0,
                    marginTop: -10
                }}
                >
                <Image
                    style={{ width: 20, height: 20 }}
                    source={require('@/assets/icons/play.png')}
                />
                </TouchableOpacity>
            </View>
            )}
          </View>

          { (post.peopleliked && post.peopleliked?.length > 2) &&

          <TouchableOpacity onPress={handleLikesPress}>

          <View style={styles.peopleLikedContainer}>
          {post.peopleliked?.slice(0, 4).map((liker, index) => (
            <Image 
              key={liker.id || index}
                  source={{ uri: liker.profileImage }}
                  style={[styles.peopleLikedImage, { marginLeft: index > 0 ? -15 : 0 }]} 
                />
              ))}

              <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}}> Liked by </Text>

              <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,fontWeight:'bold' }}>{post.peopleliked[0].name || "Linda"}</Text>

              <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}}> and </Text>

              <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,fontWeight:'bold' }}>{"Others"}</Text>
            </View>

          </TouchableOpacity>

          }

          <View style={styles.bottomIcons}>
            <TouchableOpacity onPress={handleOnLiked} style={styles.actionButton}>
              <View style={[
                styles.bottomIconsView, 
                isLiked && {backgroundColor: 'rgba(222, 61, 80, 0.1)', borderColor: 'rgba(222, 61, 80, 0.3)'}
              ]}>
                <Image
                  resizeMode="contain"
                  source={!isLiked ? require('@/assets/images/heart.png') : require('@/assets/icons/heartliked.png')}
                  style={[styles.actionIcon, !isLiked && {tintColor: 'gray'}]}
                />
                <Text style={[
                  styles.bottomIconsText,
                  isLiked && {color: '#DE3D50', fontWeight: '500'}
                ]}>
                  {getFormatedString(likes)}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <View style={[
                styles.bottomIconsView, 
                isShared && {backgroundColor: 'rgba(234, 93, 22, 0.2)', borderColor: 'rgba(234, 93, 22, 0.3)'}
              ]}>
                <Menu renderer={Popover}>
                  <MenuTrigger>
                    <Image
                      resizeMode="contain"
                      source={require('@/assets/images/refresh.png')}
                      style={[
                        styles.actionIcon, 
                        !isShared && {tintColor: 'gray'}, 
                        isShared && {tintColor: 'tomato'}
                      ]}
                    />
                  </MenuTrigger>
                  <MenuOptions customStyles={{
                    optionsContainer: {
                      borderRadius: 12,
                      padding: 4,
                      backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF',
                      borderWidth: colorScheme === 'dark' ? 1 : 0.5,
                      borderColor: colorScheme === 'dark' ? '#444444' : '#DDDDDD',
                    }
                  }}>
                    <MenuOption onSelect={onRepostSelect}>
                      <View style={styles.menuOptionItem}>
                        <Image
                          resizeMode="contain"
                          source={require('@/assets/images/refresh.png')}
                          style={{height: 20, width: 20, marginRight: 8}}
                        />
                        <Text style={styles.menuOptionText}>Repost</Text>
                      </View>
                    </MenuOption>
                    <MenuOption>
                      <View style={styles.cancelOption}>
                        <Text style={{color: '#FF3B30'}}>Cancel</Text>
                      </View>
                    </MenuOption>
                  </MenuOptions>
                </Menu>
                <Text style={[
                  styles.bottomIconsText,
                  isShared && {color: 'tomato', fontWeight: '500'}
                ]}>
                  {getFormatedString(shares)}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCommentPress} style={styles.actionButton}>
              <View style={styles.bottomIconsView}>
                <Image
                  resizeMode="contain"
                  source={require('@/assets/images/chat.png')}
                  style={[styles.actionIcon, {tintColor: 'gray'}]}
                />
                <Text style={styles.bottomIconsText}>{post.comments || 0}</Text>
              </View>
            </TouchableOpacity>

            {distanceString && (
              <View style={styles.distanceContainer}>
                <Image
                  resizeMode="contain"
                  source={require('@/assets/icons/location_small.png')}
                  style={[styles.locationIcon, {tintColor: 'gray'}]}
                />
                <Text style={styles.distanceText}>{distanceString}</Text>
              </View>
            )}
          </View>



           </View>



            

            {isloading && <ActivityIndicator size="large" color="white" style={{position:"absolute",alignSelf:'center',marginTop:'40%'}} />}


            </View>


          </PullToRefresh>


          

          </View>

          

          

          

        



        <Comments
          isVisible={isFullWidthModalVisible}
          onClose={handleCommentModalClose}
          setIsFullWidthModalVisible={setIsFullWidthModalVisible}
          post={post}
         
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
          iscurrurentuser={iscurrentuserpost}
          setDialog={setDialog}
          handleBlockUserConfirmation={handleOnDialogPress} 
          blockinguserinfo={{postcreatorimage:oppuserinfo?.profileImage, postcreatorusername:oppuserinfo?.username}} 
        />}

        <ImageView
          images={selectedImage}
          imageIndex={0}
          visible={imageViewerVisible}
          onRequestClose={() => setimageViewerVisible(false)}
        />

        {
          <InteractingUsers isVisible={isLikersModalVisible} onClose={handleLikersModalClose} info={post}/>
        }

        {dialogDownLoad && <CustomDialog onclose={handleDialogClose}  isVisible={dialogDownLoad}>

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

        {/* Replace the Caption Edit Bottom Sheet with the memoized component */}
        <CaptionEditBottomSheet 
          bottomSheetRef={captionEditSheetRef}
          colorScheme={colorScheme}
          newDescription={newDescription}
          setNewDescription={setNewDescription}
          loading={captionLoading}
          handleSaveCaption={handleSaveCaption}
          onSheetChange={(index) => setDescriptionEdit(index !== -1)}
        />

        </SafeAreaView>

      </GestureHandlerRootView>

       


    
    )
}

export default postpage

const styles = StyleSheet.create({
    mainView: {
        flex: 1,
        padding: 10,
      },
      headerView: {
        flexDirection: 'row',
        alignItems: 'center',
      
        borderRadius: 3,
      },
      profileView: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      profileImage: {
        width: 40,
        height: 40,
        borderColor: 'white',
        borderWidth: 3,
        borderRadius: 20,
        marginEnd: 10,
      },
      textView: {
        flexDirection: 'column',
        flex: 1,
      },
      username: {
        fontSize: 17,
        fontWeight: 'bold',
      },
      description: {
        color: 'gray',
        marginTop:5,
        marginBottom:10,
        fontSize: 14,
      },
      menuIcon: {
        width: 30,
        height: 30,
        
        paddingRight: 25,
      },
      thumbnail: {
        width: '100%',
        height: 250,
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 10,
        shadowColor: 'gray',
        shadowRadius: 3,
      },
      bottomIcons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        marginBottom:10
      },
      bottomIconsText: {
        color: 'gray',
        fontSize: 13,
        marginLeft: 5,
      },
      bottomIconsView: {
        flexDirection: 'row',
        alignItems: 'center',
        marginStart:15,
        borderRadius:20,
        marginBottom:10,
        borderWidth:0.8,
        borderColor:"gray",
        padding:10
      },
      peopleLikedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop:8,
        marginBottom:10
      },
      peopleLikedImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: 'white',
      },
      actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      actionIcon: {
        width: 30,
        height: 30,
        paddingRight: 25,
      },
      menuOptionItem: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      menuOptionText: {
        color: 'black',
        fontSize: 16,
        fontWeight: 'bold',
      },
      cancelOption: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      },
      distanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      locationIcon: {
        width: 20,
        height: 20,
        paddingRight: 10,
      },
      distanceText: {
        color: 'gray',
        fontSize: 13,
      },
      menuIconContainer: {
        width: 30,
        height: 30,
        paddingRight: 25,
      },
      menuItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      menuItemText: {
        fontSize: 16,
        marginLeft: 12,
        fontWeight: '500',
      },
})