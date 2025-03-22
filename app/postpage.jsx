import { StyleSheet, Text, View, Image, ImageBackground, Dimensions, TouchableOpacity ,ActivityIndicator,TouchableWithoutFeedback, FlatList} from 'react-native';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ResizeMode, Video } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useLocalSearchParams,useRouter} from 'expo-router'

import CommentsPost from '@/components/commentsPost';
import CustomDialogRepost from '@/components/CustomDialogRepost';
import { getData, storeData } from '@/constants/localstorage';
import { db } from '@/constants/firebase';

import { setDoc , serverTimestamp, doc, getDoc, deleteDoc, writeBatch} from 'firebase/firestore';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Comments from '@/components/comments';

import { getDistance } from 'geolib';
import { Menu, MenuOptions, MenuOption, MenuTrigger ,renderers} from 'react-native-popup-menu';
const { ContextMenu, SlideInMenu, Popover } = renderers;
import Dialog from '@/components/CustomDialog';

const reports = ['Nudity or sexual activity','Scam or Fraud','Violence or self injury','False information']

import { Colors } from '@/constants/Colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ImageSlider } from "react-native-image-slider-banner";
import ImageView from "react-native-image-viewing";
import { defaultProfileImage, goToGoogleMap, handleSharePostPress } from '@/constants/common';
import { useDispatch, useSelector } from 'react-redux';
import { setData } from '@/slices/dataChangeSlice';
const { width: screenWidth,height } = Dimensions.get('window');
import { useColorScheme } from '@/hooks/useColorScheme';

import PullToRefresh from 'react-native-pull-to-refresh';
import { timeAgo } from '@/constants/timeAgo';
import MemoizedDialog from '@/components/MemoizedDialog';
import ReportBottomSheet from '@/components/ReportBottomSheet';
import DownLoadMediaItem from '@/components/DownloadMediaItem';
import CustomDialog from '@/components/CustomDialog';
import CircularProgress from "react-native-circular-progress-indicator";

const postpage = () => {

  const colorScheme = useColorScheme()

  


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
        goToGoogleMap(post.coordinates._latitude,post.coordinates._longitude)
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

      const handleDialogClose = useCallback(() =>{
         setsharingUrls([])
         setDialogDownLoad(false);
      });


          
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

                        {timestamp !== null && <Text style={{fontSize:15, color:'gray',marginTop:3}}>{timeAgo(timestamp)}</Text>}

                      </View>

                      

                     

                    </View>

                    </TouchableOpacity> : <View></View>
                    }

                    {(timestamp !== null && iscurrentuserpost) && <Text style={{fontSize:15, color:'gray'}}>{timeAgo(timestamp)}</Text>}

                </View>

               
              
                <View style={{flexDirection:'row',alignItems:'center'}}>

                  {(post.isshowinglocation || iscurrentuserpost) && <TouchableOpacity onPress={handleGoogleMaps}>

                    <View style={{borderRadius:5, backgroundColor:Colors.blue,alignItems:'center',flexDirection:'row', paddingHorizontal:10, marginRight:10}}>
                      <Image style={{height:25,width:25, tintColor:'white'}} source={require('@/assets/icons/right-arrow.png')}/>

                      <View style={{height:30,width:1,backgroundColor:'white',marginLeft:10,marginRight:10}}/>

                      <Image style={{height:25,width:25}} source={require('@/assets/icons/map.png')}/>

                    </View>


                  </TouchableOpacity>}

                  
                  <Menu style={{right:10,marginLeft:10}} renderer={Popover} >
                  <MenuTrigger >
                  <Image
                        resizeMode="contain"
                        source={require('@/assets/icons/menu.png')}
                        style={[styles.menuIcon, {tintColor:'gray'}]}
                      />
                  </MenuTrigger>
                  <MenuOptions >


                  {!iscurrentuserpost && <MenuOption  onSelect={() => 
                    handleBlockUser({postcreatorid:post.user, postcreatorimage:post.profileImage,postcreatorusername:post.username})} 
                    text='Block user' />}

                  {iscurrentuserpost && <MenuOption onSelect={onDeletePost}>
                      <View style={{flexDirection:'row'}}>

                        <Image
                          resizeMode="contain"
                          source={require('@/assets/icons/deletepost.png')}
                          style={{tintColor:'red',height:25,width:25}}
                        />

                        <Text style={{color:'red', marginStart:5}}>Delete post</Text>

                      </View>
                      
                    </MenuOption>}

                    {!iscurrentuserpost && <MenuOption onSelect={postSharePress}>
                      <View style={{flexDirection:'row'}}>

                        <Image
                          resizeMode="contain"
                          source={require('@/assets/icons/sharing_post.png')}
                          style={{tintColor:'gray',height:25,width:25}}
                        />

                        <Text style={{color:'black', marginStart:5}}>Share post</Text>

                      </View>
                      
                    </MenuOption>}
                  

                    {!iscurrentuserpost &&<MenuOption onSelect={onReportDialogOpen}>
                      <View style={{flexDirection:'row'}}>

                        <Image
                          resizeMode="contain"
                          source={require('@/assets/icons/block.png')}
                          style={{tintColor:'red',height:25,width:25}}
                        />

                        <Text style={{color:'red'}}>Report post</Text>

                      </View>
                      
                    </MenuOption>}


                   
                  
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

          <View style={styles.bottomIcons}>
                <View style={styles.bottomIconsView}>
                  <TouchableOpacity onPress={handleOnLiked}>
                    <Image
                      resizeMode="contain"
                      source={!isLiked ? require('@/assets/images/heart.png') : require('@/assets/icons/heartliked.png')}
                      style={[styles.menuIcon, !isLiked && {tintColor:'gray'}]}
                    />
                  </TouchableOpacity>
                  <Text style={styles.bottomIconsText}>{getFormatedString(likes)}</Text>
                </View>

                <View style={styles.bottomIconsView}>

                  <Menu renderer={Popover} >
                        <MenuTrigger >
                        <Image
                              resizeMode="contain"
                              source={require('@/assets/images/refresh.png')}
                              style={[styles.menuIcon,  !isShared && {tintColor:'gray'}, isShared && {tintColor:'tomato'}]}
                            />
                        </MenuTrigger>
                        <MenuOptions >

                      
                          <MenuOption onSelect={onRepostSelect}>
                            <View style={{flexDirection:'row',marginHorizontal:10}}>

                              <Image
                                resizeMode="contain"
                                source={require('@/assets/images/refresh.png')}
                                style={{tintColor:'black',height:20,width:20}}
                              />

                              <Text style={{color:'black'}}>Repost</Text>

                            </View>
                            
                          </MenuOption>

                          <MenuOption>
                            <View style={{alignItems:'center'}}>

                              <Text style={{color:'red'}}>Cancel</Text>

                            </View>
                            
                          </MenuOption>
                        
                        
                        </MenuOptions>
                    </Menu>
                  
                  <Text style={styles.bottomIconsText}>{getFormatedString(shares)}</Text>
                </View>

                <View style={styles.bottomIconsView}>
                  <TouchableOpacity onPress={handleCommentPress}>
                    <Image
                      resizeMode="contain"
                      source={require('@/assets/images/chat.png')}
                      style={[styles.menuIcon, {tintColor:'gray'}]}
                    />
                  </TouchableOpacity>
                  <Text style={styles.bottomIconsText}>{post.comments || 0}</Text>
                </View>

                {distanceString && <View style={styles.bottomIconsView}>
                  <Image
                    resizeMode="contain"
                    source={require('@/assets/icons/location_small.png')}
                    style={[styles.menuIcon, {tintColor:'gray'}]}
                  />
                  <Text style={styles.bottomIconsText}>{distanceString}</Text>
                </View>}
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
      }
})