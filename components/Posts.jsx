import { StyleSheet, Text, View, Image, ImageBackground, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ResizeMode, Video } from 'expo-av';
import Events from './Events';
import Businesses from '@/components/Businesses';

const { width: screenWidth, height } = Dimensions.get('window');
import { ImageSlider } from "react-native-image-slider-banner";
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { Menu, MenuOptions, MenuOption, MenuTrigger, renderers } from 'react-native-popup-menu';
import { getData, storeData } from '@/constants/localstorage';
import { getDistance } from 'geolib';
import { db, functions } from '@/constants/firebase';

import { setDoc, doc, GeoPoint, serverTimestamp } from 'firebase/firestore';
import { store } from '@/store/store';
import { useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { geoFirestore } from '@/constants/firebase';
import { timeAgo } from '@/constants/timeAgo';
const { ContextMenu, SlideInMenu, Popover } = renderers;
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useSelector, useDispatch } from 'react-redux';
import { httpsCallable } from 'firebase/functions';
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { setVolume } from '@/slices/volumeSlice';
import { timeAgoPost } from '@/constants/timeAgoPost';
import Ionicons from '@expo/vector-icons/Ionicons';

const Posts = React.memo(({ setLikesMap, likesMap, setSharesMap, sharesMap, post, activePost, onCommentPress, handlePlayPress, onImagePress, onReportPress, userinfo, handleRemovePost, handleBlockUser, handleSharePostPress, handleLikersPress }) => {
  const videoRef = useRef(null);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const lastItemId = useRef(post.id);
  const userInteracted = useRef(false);
  const dimensionsCalculated = useRef(false);

  // Add state for media dimensions with a key tied to the post ID to handle recycling
  const [mediaDimensions, setMediaDimensions] = useState({
    width: screenWidth,
    height: 350,
    aspectRatio: null,
    postId: post.id // Track which post these dimensions belong to
  });

  // Reset dimensions when post changes due to view recycling
  useEffect(() => {
    if (mediaDimensions.postId !== post.id) {
    
    }
  }, [post.id]);

 

  // Memoized formatString function
  const getFormatedString = useMemo(() => (number) => {
    return (number || 0) < 1000 
      ? `${number || 0}` 
      : `${(number / 1000).toFixed(1)}k`
  }, []);

  const [state, setState] = useState({
    isLiked: false,
    isShared:false,
    isVideoPlaying: false,
    shares: post.shares,
    isBuffering: false,
    isMuted: true,
    userLiked: false,
    likes: post.likes
  });

  // Batch state updates for better performance
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset video state when post changes
  useEffect(() => {
    if (post.id !== lastItemId.current) {
      lastItemId.current = post.id;
      updateState({
        isBuffering: false,
        isMuted: true
      });

      if (videoRef.current) {
        const unloadVideo = async () => {
          try {
            await videoRef.current.unloadAsync();
          } catch (error) {
            console.error("Error unloading video:", error);
          }
        };

        if (activePost !== post.id) {
          unloadVideo();
        }
      }
    }
  }, [post.id, activePost]);

  // Optimized likes/shares check with caching
  const checkInteractions = useCallback(async () => {
    try {
      const [likedPosts, sharedPosts] = await Promise.all([
        getData('@liked_posts'),
        getData('@shared_posts')
      ]);

      updateState({
        isLiked: (likedPosts || []).includes(post.id),
        isShared: (sharedPosts || []).includes(post.id)
      });
    } catch (error) {
      console.error("Error checking interactions:", error);
    }
  }, [post.id]);

  // Update likes and shares when they change
  useEffect(() => {
    updateState({
      likes: likesMap[post.id] !== undefined ? likesMap[post.id] : post.likes,
      shares: sharesMap[post.id] !== undefined ? sharesMap[post.id] : post.shares
    });
    
    checkInteractions();
  }, [post.id, post.likes, likesMap, sharesMap]);

  // Optimized video playback handling
  const handleVideoPlayback = useCallback(async (shouldPlay) => {
    if (!videoRef.current) return;

    try {
      const status = await videoRef.current.getStatusAsync();
      
      if (shouldPlay) {
        if (!status?.isLoaded) {
          updateState({ isBuffering: true });
          await videoRef.current.loadAsync(
            { uri: post.content },
            { shouldPlay: true },
            false
          );
        } else if (!status.isPlaying) {
          await videoRef.current.playAsync();
        }
        handlePlayPress(post.id);
        updateState({ isVideoPlaying: true, isBuffering: false });
      } else {
        if (status?.isPlaying) {
          await videoRef.current.pauseAsync();
          updateState({ isVideoPlaying: false });
        }
      }
    } catch (error) {
      console.error("Video playback error:", error);
      updateState({ isBuffering: false });
    }
  }, [post.content, handlePlayPress]);

  const handleOnPlay = useCallback(() => {
    handleVideoPlayback(!state.isVideoPlaying);
  }, [state.isVideoPlaying, handleVideoPlayback]);

  const updateInteranctions = useCallback(async (path) => {
    const userinfo = await getData('@profile_info');
    const ref = doc(db,`users/${post.user}/posts/${post.id}/${path}/${userinfo.uid}`);
    await setDoc(ref, userinfo, {merge: true});
  }, [post.user, post.id]);

  // Optimized like handling with batched updates
  const handleOnLiked = useCallback(async () => {
    try {
      const likedPosts = await getData('@liked_posts') || [];
      
      if (!likedPosts.includes(post.id)) {
        setLikesMap(prev => ({
          ...prev,
          [post.id]: (post.likes || 0) + 1,
        }));

        updateState({
          isLiked: true,
          likes: (post.likes || 0) + 1
        });

        await Promise.all([
          updateInteranctions("likes"),
          storeData('@liked_posts', [...likedPosts, post.id])
        ]);
      }
    } catch (error) {
      console.error("Error handling like:", error);
    }
  }, [post.id, post.likes, updateInteranctions]);

  // Memoized icon press handler
  const handleIconPress = useCallback((onPress) => {
    onPress(post);
    if (post.contentType === 'video' && videoRef.current) {
      videoRef.current.pauseAsync();
    }
  }, [post]);
  

  const handlePressLikers = useCallback((onpress) => {
    onpress(post)
  },[post])

  useEffect(() => {
    if (videoRef.current) {
      if (activePost === post.id) {
        try {
          // videoRef.current.playAsync();
        } catch (e) {
          console.log(e);
        }
      } else {
        try {
          videoRef.current.pauseAsync();
          updateState({ isVideoPlaying: false });
          videoRef.current.setPositionAsync(0);

          const unloadVideo = async () => {
            await videoRef.current.unloadAsync();
          }

          unloadVideo();
        } catch (e) {
          console.log(e);
        }
      }
    }
  }, [activePost]);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.stopAsync();
      }
    };
  }, []);

  const { ismute } = useSelector(state => state.volume);

  const handlePlaybackStatusUpdate = useCallback((status) => {
    if (status?.isPlaying) {
      updateState({ isBuffering: false })
    }

    if(status.didJustFinish){
      if (videoRef.current) {
        videoRef.current.setPositionAsync(0);
      }
    }

    updateState({ isVideoPlaying: status.isPlaying });
  }, []);

  const userlocation = userinfo?.coordinates;

  const [distanceString , setDistanceString] = useState(null);

  const { coordinates } = useSelector(state => state.location);

  const setLocation = useCallback((coordinates) => {

    if (!post.coordinates) return;

    try{
      const usergeopoint = { latitude: coordinates.latitude, longitude: coordinates.longitude };
      const postgeopoint = { latitude: post.coordinates._latitude, longitude: post.coordinates._longitude };
      const distance = getDistance(usergeopoint,postgeopoint);
      
      const distanceString = distance < 1000 
      ? `${distance} m` 
      : `${(distance / 1000).toFixed(1)} km`;
  
      setDistanceString(distanceString)
    }catch(e){console.log(e)}
  });

  useEffect(() => {
    try{
      if (coordinates.coords) {
        setLocation({latitude:coordinates.coords.latitude, longitude:coordinates.coords.longitude})
      }else if (userlocation){
        setLocation(userlocation)
      }
    }catch(e){
      console.log("crashed ",e)
    }
  }, [coordinates,post.id])

  const [isShared,setShared] = useState(false);

  const onRepostSelect = useCallback(async()=>{
    let sharedposts = await getData('@shared_posts')

    if (!sharedposts) {
      sharedposts = []
    }
 
    if (!sharedposts.includes(post.id)) {
      setSharesMap((prev) => ({
        ...prev,
        [post.id]: (post.shares || 0) + 1, // Increment likes
      }));

      updateState({
        isShared: true,
        shares: (post.shares || 0) + 1
      });
    
      // Update the interaction in Firestore
      await updateInteranctions("shares");

      // Update the share posts array immutably
      const updatedSharedPosts = [...sharedposts, post.id];

      // Store the new share posts array
      await storeData('@shared_posts', updatedSharedPosts);
    }
  },[post]);

  const handleReport = useCallback(() => {
    const postInfo = {
      postcreatorid:post.user,
      postid:post.id,
    }
    onReportPress(postInfo)
  });

  const handlePostPress = () =>{
    const updatedPost = {...post,userinfo:userinfo, likes:state.likes,shares:state.shares}
    router.push({
      pathname: '/postpage',
      params: { data: encodeURIComponent(JSON.stringify(updatedPost)) }
    });
  }

  useEffect(() => {
    checkInteractions();
  },[])

  const handleProfilePress = ()=> {
    router.push({
      pathname:'/oppuserprofile',
      params:{uid:post.user}
    })
  }

  const handleImagePress = useCallback((uri) => {
    onImagePress(uri);
  }, [onImagePress]);

  const handlePressShare = useCallback(async () => {
    let content;
    if (post.contentType === 'video'){
      content = [post.content]
    }else {
      content = post.content;
    }
    handleSharePostPress(content, post.contentType, post.user, post.id)
  },[post]);


  const onEventPress = useCallback((event) => {
    router.push({
      pathname: '/eventdetails',
      params: { 
        id: event.id,
        data: encodeURIComponent(JSON.stringify(event))
      }
    });
  });

  // Business categories with icons
  const categories = useMemo(() => [
    { id: 'all', name: 'All', icon: 'apps-outline' },
    { id: 'food', name: 'Food', icon: 'restaurant-outline' },
    { id: 'fashion', name: 'Fashion', icon: 'shirt-outline' },
    { id: 'groceries', name: 'Groceries', icon: 'cart-outline' },
    { id: 'services', name: 'Services', icon: 'construct-outline' },
    { id: 'health', name: 'Health', icon: 'fitness-outline' },
    { id: 'beauty', name: 'Beauty', icon: 'cut-outline' },
    { id: 'electronics', name: 'Electronics', icon: 'hardware-chip-outline' },
    { id: 'home accesories', name: 'Home Accesories', icon: 'bed-outline' },
    { id: 'drinks & beverages', name: 'Drinks & Beverages', icon: 'wine-outline' },
    { id: 'entertainment', name: 'Entertainment', icon: 'musical-notes-outline' },
    { id: 'other', name: 'Other', icon: 'ellipsis-horizontal-outline' }
  ], []);

  const getCategoryIcon = (categoryName) => {
    const category = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    return category ? category.icon : 'storefront-outline'; // Default icon if not found
  };
  
  
  return (
    <View style={styles.mainView}>

      {
       ( post.contentType !== 'event' && post.contentType !== 'business') && <View style={styles.headerView}>
        <View style={styles.profileView}>
          <TouchableOpacity onPress={handleProfilePress}>
            <Image
              source={{ uri: post.profileImage }}
              style={styles.profileImage}
            />
          </TouchableOpacity>

          <View style={styles.textView}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{flex:1, flexDirection:'row',alignItems:'center'}}>
                <TouchableOpacity onPress={handlePostPress}>
                <Text style={[styles.username, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>{post.business ? post.business.name : post.username}</Text>
                </TouchableOpacity>

                {post.verified && <Image
                  resizeMode="contain"
                  source={require('@/assets/icons/verified.png')}
                  style={{
                    width: 20,
                    height: 20,    
                    paddingRight: 25,
                  }}
                />}

                

                <TouchableOpacity onPress={handlePressShare}>
                  <Image
                        resizeMode="contain"
                        source={require('@/assets/icons/sharing_post.png')}
                        style={[styles.menuIcon, {tintColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main, marginStart:10}]}
                      />
                </TouchableOpacity>

                <Text style={{fontSize:15, color:'gray', marginStart:3}}>{getFormatedString(post.sharings || 0)}</Text>  
              </View>

              {post.isshowinglocation && <Image style={{height:25,width:25}} source={require('@/assets/icons/pinview.png')}/>}
              
              <Menu renderer={Popover} >
                <MenuTrigger >
                <Image
                      resizeMode="contain"
                      source={require('@/assets/icons/menu.png')}
                      style={[styles.menuIcon, {tintColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}
                    />
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
                 <MenuOption onSelect={() => 
                  handleBlockUser({postcreatorid:post.user, postcreatorimage:post.profileImage,postcreatorusername:post.username})}>
                   <View style={styles.menuItemContainer}>
                     <Ionicons name="person-remove-outline" size={20} color={colorScheme === 'dark' ? '#FF6B6B' : '#FF3B30'} />
                     <Text style={[styles.menuItemText, {color: colorScheme === 'dark' ? '#FF6B6B' : '#FF3B30'}]}>Block user</Text>
                   </View>
                 </MenuOption>
                  
                  <MenuOption onSelect={() => handleRemovePost(post.id)}>
                    <View style={styles.menuItemContainer}>
                      <Ionicons name="eye-off-outline" size={20} color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} />
                      <Text style={[styles.menuItemText, {color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>Remove post</Text>
                    </View>
                  </MenuOption>

                  <MenuOption onSelect={handleReport}>
                    <View style={styles.menuItemContainer}>
                      <Ionicons name="flag-outline" size={20} color={colorScheme === 'dark' ? '#FF6B6B' : '#FF3B30'} />
                      <Text style={[styles.menuItemText, {color: colorScheme === 'dark' ? '#FF6B6B' : '#FF3B30'}]}>Report post</Text>
                    </View>
                  </MenuOption>
                </MenuOptions>
              </Menu>
            </View>

            <View style={{flexDirection:'row'}}>

              <TouchableOpacity onPress={handlePostPress}>
                <Text style={{fontSize:15, color:'gray', marginStart:5}}>{timeAgoPost(post.createdAt)}</Text>
              </TouchableOpacity>

             { post.business && <View
                  style={[
                    styles.categoryButton,
                    { marginStart:10,
                      marginTop:5,
                      backgroundColor: 
                        colorScheme === 'dark' ? '#333333' : '#F0F0F0',
                      borderWidth:  1,
                      borderColor: 'rgba(150,150,150,0.3)'
                    }
                  ]}
                 
                >
                  <Ionicons 
                    name={getCategoryIcon(post.business.category)} 
                    size={16} 
                    color={colorScheme === 'dark' ? '#DDDDDD' : '#666666'} 
                  />
                  <Text 
                    style={[
                      styles.categoryText, 
                      { 
                        color: colorScheme === 'dark' ? '#DDDDDD' : '#666666',
                        marginLeft: 5
                      }
                    ]}
                  >
                    {post.business.category}
                  </Text>
                </View>}

            </View>

           

          </View>
        </View>
      </View>
      }

      {post.description && <TouchableOpacity onPress={handlePostPress}>
              <Text numberOfLines={3} style={[styles.description, {color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}>{post.description}</Text>
            </TouchableOpacity> }
      

      <View style={{ height: (post.contentType !== 'event' && post.contentType !== 'business') ? mediaDimensions.height : 280, width: '100%', marginTop: 10 }}>
        {post.contentType === 'image'  ? post.content.length < 2 ? (
          <TouchableWithoutFeedback onPress={()=>onImagePress(post.content[0])}>
            <ImageBackground
              source={{ uri: post.content[0] }}
              style={{ width: '100%', height: mediaDimensions.height, borderRadius: 10, overflow: 'hidden' }}
            
            />
          </TouchableWithoutFeedback>
         
        ):
        ( <View style={{borderRadius:10, height: mediaDimensions.height}}>
            <ImageSlider 
            caroselImageContainerStyle={{ height: mediaDimensions.height, overflow:'hidden', width:screenWidth-100, borderRadius:10 }}
            caroselImageStyle={{ resizeMode:'cover', height: mediaDimensions.height, overflow:'hidden', width:screenWidth, marginHorizontal:5, borderRadius:10 }}
            data={post.content.map((image) => ({ img: image }))}
            autoPlay={false}
            closeIconColor="#fff"
          
            />
        </View>
         
        )
         :  post.contentType === "video" ? ( 
          <View style={{marginHorizontal:1}}>
            <TouchableOpacity
              onPress={handleOnPlay}
              style={{
                width: "100%", height: mediaDimensions.height
              }}
              >
              <View>
                <Video 
                  source={{ uri: post.content }}
                  shouldPlay={false}
                  ref={videoRef}
                  style={{ width: "100%", height: mediaDimensions.height, borderRadius: 10 }}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls={false}
                  usePoster={true}
                  posterStyle={{ borderRadius: 10, overflow: 'hidden', resizeMode: 'cover' }}
                  posterSource={{ uri: post.thumbnail }}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}

                />
              </View>

              <Image
                style={{ width: 20, height: 20 ,position: 'absolute',
                  alignSelf: 'center',
                  top: '50%',
                  opacity: !state.isVideoPlaying && !state.isBuffering ? 1 : 0,
                  marginTop: -10}}
                source={require('@/assets/icons/play.png')}
              />
            </TouchableOpacity>
            {state.isBuffering && <ActivityIndicator style={{ alignSelf: 'center',
             marginTop: -10, top: '50%',  position:"absolute" }} size='large' color="white"  />}
          </View>
        ) : post.contentType === "event" ? (
          <View style={{borderRadius: 10, overflow: 'hidden'}}>
            <Events 
              events={post.events || []} 
              onEventPress={onEventPress}
            />
          </View>
        ) : post.contentType === "business" ? (
          <View style={{borderRadius: 10, overflow: 'hidden'}}>
            <Businesses 
              businesses={post.businesses || []} 
              onBusinessPress={(business) => {
                router.push({
                  pathname: '/oppuserprofile',
                  params: { 
                    uid: business.ownerid, 
                  }
                });
              }}
            />
          </View>
        ) : (
          <View style={{padding: 10, alignItems: 'center', justifyContent: 'center', height: 100}}>
            <Text style={{color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}}>
              Unsupported content type
            </Text>
          </View>
        )}
      </View>



     { (post.peopleliked && post.peopleliked?.length > 2) &&

       <TouchableOpacity onPress={()=>handlePressLikers(handleLikersPress)}>

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


      {
        (post.contentType !== 'event' && post.contentType !== 'business') && <View style={styles.bottomIcons}>

          <View style={{flexDirection:'row'}}>

            <View style={[styles.bottomIconsView, {marginStart:3}, state.isLiked && {backgroundColor:'rgba(222, 61, 80, 0.1)',borderWidth:0}]}>
              <TouchableOpacity onPress={handleOnLiked}>
                <Image
                  resizeMode="contain"
                  source={!state.isLiked ? require('@/assets/images/heart.png') : require('@/assets/icons/heartliked.png')}
                  style={[styles.menuIcon, !state.isLiked && {tintColor:'gray', marginRight:3}, {width:25,height:25, marginRight:5}]}
                />
              </TouchableOpacity>
              <Text style={styles.bottomIconsText}>{getFormatedString(state.likes)}</Text>
            </View>
            

            <View style={[styles.bottomIconsView, state.isShared && {backgroundColor:'rgba(234, 93, 22, 0.2)',borderWidth:0}]}>
            <Menu renderer={Popover}>
                  <MenuTrigger>
                    <Image
                      resizeMode="contain"
                      source={require('@/assets/images/refresh.png')}
                      style={[
                        styles.actionIcon, 
                        !state.isShared && {tintColor: 'gray'}, 
                        state.isShared && {tintColor: 'tomato'}
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
                  {getFormatedString(state.shares)}
                </Text>
           </View>
            


        <View style={styles.bottomIconsView}>
          <TouchableOpacity onPress={() => handleIconPress(onCommentPress)}>
            <Image
              resizeMode="contain"
              source={require('@/assets/images/chat.png')}
              style={[styles.menuIcon, {tintColor:'gray',width:27,height:27, marginRight:3}]}
            />
          </TouchableOpacity>
          <Text style={[styles.bottomIconsText]}>{post.comments || 0}</Text>
        </View>


          </View>
        

       
        {distanceString && <View style={{flexDirection: 'row',
        alignItems: 'center',}}>
          <Image
            resizeMode="contain"
            source={require('@/assets/icons/location_small.png')}
            style={[styles.menuIcon, {tintColor:'gray',width:35,height:35, marginRight:3}]}
          />
          <Text style={styles.bottomIconsText}>{distanceString}</Text>
        </View>}
      </View>
      }

      
    </View>
  );
}) 

export default Posts;

const triggerStyles = {
  triggerText: {
    color: 'white',
  },
  triggerOuterWrapper: {
    backgroundColor: 'orange',
    padding: 5,
    flex: 1,
  },
  triggerWrapper: {
    backgroundColor: 'blue',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  triggerTouchable: {
    underlayColor: 'darkblue',
    activeOpacity: 70,
    style : {
      flex: 1,
    },
  },
};

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
    width: 50,
    height: 50,
    borderColor: 'white',
    borderWidth: 3,
    borderRadius: 25,
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
   
    marginTop:10,
    fontSize: 15,
  },
  menuIcon: {
    width: 30,
    height: 30,
    
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
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  bottomIconsText: {
    color: 'gray',
    fontSize: 15,
  },
  bottomIconsView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart:15,
    borderRadius:20,
    borderWidth:0.8,
    borderColor:"gray",
    padding:10
   
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  peopleLikedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop:8
  },
  peopleLikedImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'white',
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
});
