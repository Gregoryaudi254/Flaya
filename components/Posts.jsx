import { StyleSheet, Text, View, Image, ImageBackground, Dimensions, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
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
  
const Posts = React.memo(({ isAuthenticated, setLikesMap, likesMap, setSharesMap, sharesMap, post, activePost, onCommentPress, handlePlayPress, onImagePress, onReportPress, userinfo, handleRemovePost, handleBlockUser, handleSharePostPress, handleLikersPress }) => {
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

  // Animation for like button
  const likeAnimation = useRef(new Animated.Value(1)).current;

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

  // Optimized like handling with batched updates and animation
  const handleOnLiked = useCallback(async () => {
    try {
      const authentication = await isAuthenticated();
      if (!authentication) return;

      // Animate like button
      Animated.sequence([
        Animated.timing(likeAnimation, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(likeAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

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
  }, [post.id, post.likes, updateInteranctions, likeAnimation]);

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
    const authentication = await isAuthenticated();
    if (!authentication) return;
    
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
      <View style={styles.postCard}>
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{flex:1, flexDirection:'row', alignItems:'center', flexWrap: 'wrap'}}>
                  <TouchableOpacity onPress={handlePostPress}>
                    <Text style={[styles.username, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>
                      {post.business ? post.business.name : post.username}
                    </Text>
                  </TouchableOpacity>

                  {post.verified && <Image
                    resizeMode="contain"
                    source={require('@/assets/icons/verified.png')}
                    style={[styles.verifiedBadge, {tintColor: Colors.blue}]}
                  />}

                  <TouchableOpacity onPress={handlePressShare} style={styles.shareButton}>
                    <Image
                      resizeMode="contain"
                      source={require('@/assets/icons/sharing_post.png')}
                      style={[styles.menuIcon, {tintColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}
                    />
                  </TouchableOpacity>

                  <Text style={[styles.shareCount, {color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>
                    {getFormatedString(post.sharings || 0)}
                  </Text>  
                </View>

                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  {post.isshowinglocation && <Image style={{height:20,width:20, opacity: 0.7}} source={require('@/assets/icons/pinview.png')}/>}
                  
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
                        borderRadius: 16,
                        padding: 8,
                        width: 200,
                        backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        elevation: 8
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
              </View>

              <View style={styles.timestampContainer}>
                <TouchableOpacity onPress={handlePostPress}>
                  <Text style={[styles.timestamp, {color: colorScheme === 'dark' ? '#999' : '#666'}]}>
                    {timeAgoPost(post.createdAt)}
                  </Text>
                </TouchableOpacity>

               { post.business && <View
                    style={[
                      styles.categoryButton,
                      { 
                        marginStart: 12,
                        backgroundColor: 
                          colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                      }
                    ]}
                  >
                    <Ionicons 
                      name={getCategoryIcon(post.business.category)} 
                      size={14} 
                      color={colorScheme === 'dark' ? '#DDDDDD' : '#666666'} 
                    />
                    <Text 
                      style={[
                        styles.categoryText, 
                        { 
                          color: colorScheme === 'dark' ? '#DDDDDD' : '#666666',
                          marginLeft: 6
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

        {post.description && (
          <View style={styles.postContentContainer}>
            <TouchableOpacity onPress={handlePostPress}>
              <Text numberOfLines={3} style={[styles.description, {color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}>
                {post.description}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.mediaContainer}>
          <View style={{ height: (post.contentType !== 'event' && post.contentType !== 'business') ? mediaDimensions.height : 280, width: '100%' }}>
            {post.contentType === 'image' ? post.content.length < 2 ? (
              <TouchableWithoutFeedback onPress={()=>onImagePress(post.content[0])}>
                <ImageBackground
                  source={{ uri: post.content[0] }}
                  style={{ width: '100%', height: mediaDimensions.height, borderRadius: 12, overflow: 'hidden' }}
                />
              </TouchableWithoutFeedback>
            ) : (
              <View style={{borderRadius: 12, height: mediaDimensions.height, overflow: 'hidden'}}>
                <ImageSlider 
                  caroselImageContainerStyle={{ height: mediaDimensions.height, overflow:'hidden', width: screenWidth - 32, borderRadius: 12 }}
                  caroselImageStyle={{ resizeMode:'cover', height: mediaDimensions.height, overflow:'hidden', width: screenWidth, marginHorizontal: 8, borderRadius: 12 }}
                  data={post.content.map((image) => ({ img: image }))}
                  autoPlay={false}
                  closeIconColor="#fff"
                />
              </View>
            ) : post.contentType === "video" ? ( 
              <View style={{marginHorizontal: 0}}>
                <TouchableOpacity
                  onPress={handleOnPlay}
                  style={{
                    width: "100%", 
                    height: mediaDimensions.height,
                    borderRadius: 12,
                    overflow: 'hidden'
                  }}
                >
                  <Video 
                    source={{ uri: post.content }}
                    shouldPlay={false}
                    ref={videoRef}
                    style={{ width: "100%", height: mediaDimensions.height, borderRadius: 12 }}
                    resizeMode={ResizeMode.COVER}
                    useNativeControls={false}
                    usePoster={true}
                    posterStyle={{ borderRadius: 12, overflow: 'hidden', resizeMode: 'cover' }}
                    posterSource={{ uri: post.thumbnail }}
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                  />

                  {!state.isVideoPlaying && !state.isBuffering && (
                    <View style={styles.videoPlayButton}>
                      <Image
                        style={styles.videoPlayIcon}
                        source={require('@/assets/icons/play.png')}
                      />
                    </View>
                  )}
                </TouchableOpacity>
                {state.isBuffering && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size='large' color="white" />
                  </View>
                )}
              </View>
            ) : post.contentType === "event" ? (
              <View style={{borderRadius: 12, overflow: 'hidden'}}>
                <Events 
                  events={post.events || []} 
                  onEventPress={onEventPress}
                />
              </View>
            ) : post.contentType === "business" ? (
              <View style={{borderRadius: 12, overflow: 'hidden'}}>
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
              <View style={{padding: 20, alignItems: 'center', justifyContent: 'center', height: 100, borderRadius: 12, backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}}>
                <Text style={{color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main, fontSize: 14}}>
                  Unsupported content type
                </Text>
              </View>
            )}
          </View>
        </View>



        { (post.peopleliked && post.peopleliked?.length > 2) && (
          <TouchableOpacity onPress={()=>handlePressLikers(handleLikersPress)}>
            <View style={styles.peopleLikedContainer}>
              {post.peopleliked?.slice(0, 4).map((liker, index) => (
                <Image 
                  key={liker.id || index}
                  source={{ uri: liker.profileImage }}
                  style={[styles.peopleLikedImage, { marginLeft: index > 0 ? -12 : 0 }]} 
                />
              ))}

              <Text style={[styles.bottomIconsText, {color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main, marginLeft: 8}]}>
                Liked by 
              </Text>

              <Text style={[styles.bottomIconsText, {color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main, fontWeight: '600', marginLeft: 4}]}>
                {post.peopleliked[0].name || "Linda"}
              </Text>

              <Text style={[styles.bottomIconsText, {color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main, marginLeft: 4}]}>
                and 
              </Text>

              <Text style={[styles.bottomIconsText, {color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main, fontWeight: '600', marginLeft: 4}]}>
                Others
              </Text>
            </View>
          </TouchableOpacity>
        )}


        {
          (post.contentType !== 'event' && post.contentType !== 'business') && (
            <View style={styles.bottomIcons}>
              <View style={styles.interactionContainer}>
                <View style={[
                  styles.bottomIconsView, 
                  state.isLiked && {
                    backgroundColor: 'rgba(255, 59, 48, 0.1)',
                    borderColor: 'rgba(255, 59, 48, 0.3)',
                    borderWidth: 1
                  }
                ]}>
                  <TouchableOpacity onPress={handleOnLiked}>
                    <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                      <Image
                        resizeMode="contain"
                        source={!state.isLiked ? require('@/assets/images/heart.png') : require('@/assets/icons/heartliked.png')}
                        style={[
                          styles.actionIcon, 
                          !state.isLiked && {tintColor: '#666'}, 
                          state.isLiked && {tintColor: '#FF3B30'}
                        ]}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                  <Text style={[
                    styles.bottomIconsText,
                    state.isLiked && {color: '#FF3B30', fontWeight: '600'}
                  ]}>
                    {getFormatedString(state.likes)}
                  </Text>
                </View>

                <View style={[
                  styles.bottomIconsView, 
                  state.isShared && {
                    backgroundColor: 'rgba(255, 149, 0, 0.1)',
                    borderColor: 'rgba(255, 149, 0, 0.3)',
                    borderWidth: 1
                  }
                ]}>
                  <Menu renderer={Popover}>
                    <MenuTrigger>
                      <Image
                        resizeMode="contain"
                        source={require('@/assets/images/refresh.png')}
                        style={[
                          styles.actionIcon, 
                          !state.isShared && {tintColor: '#666'}, 
                          state.isShared && {tintColor: '#FF9500'}
                        ]}
                      />
                    </MenuTrigger>
                    <MenuOptions customStyles={{
                      optionsContainer: {
                        borderRadius: 16,
                        padding: 8,
                        backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF',
                        borderWidth: colorScheme === 'dark' ? 1 : 0.5,
                        borderColor: colorScheme === 'dark' ? '#444444' : '#DDDDDD',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 4,
                      }
                    }}>
                      <MenuOption onSelect={onRepostSelect}>
                        <View style={styles.menuOptionItem}>
                          <Image
                            resizeMode="contain"
                            source={require('@/assets/images/refresh.png')}
                            style={{height: 18, width: 18, marginRight: 10, tintColor: '#FF9500'}}
                          />
                          <Text style={[styles.menuOptionText, {color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>
                            Repost
                          </Text>
                        </View>
                      </MenuOption>
                      <MenuOption>
                        <View style={styles.cancelOption}>
                          <Text style={{color: '#FF3B30', fontWeight: '500'}}>Cancel</Text>
                        </View>
                      </MenuOption>
                    </MenuOptions>
                  </Menu>
                  <Text style={[
                    styles.bottomIconsText,
                    state.isShared && {color: '#FF9500', fontWeight: '600'}
                  ]}>
                    {getFormatedString(state.shares)}
                  </Text>
                </View>

                <View style={styles.bottomIconsView}>
                  <TouchableOpacity onPress={() => handleIconPress(onCommentPress)}>
                    <Image
                      resizeMode="contain"
                      source={require('@/assets/images/chat.png')}
                      style={[styles.actionIcon, {tintColor: '#666'}]}
                    />
                  </TouchableOpacity>
                  <Text style={styles.bottomIconsText}>{post.comments || 0}</Text>
                </View>
              </View>

              {distanceString && (
                <View style={styles.locationContainer}>
                  <Image
                    resizeMode="contain"
                    source={require('@/assets/icons/location_small.png')}
                    style={[styles.actionIcon, {tintColor: '#666', width: 16, height: 16}]}
                  />
                  <Text style={[styles.bottomIconsText, {fontSize: 12}]}>{distanceString}</Text>
                </View>
              )}
            </View>
          )
        }

      </View>
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
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  postCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  profileView: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderRadius: 24,
    marginEnd: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textView: {
    flexDirection: 'column',
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  description: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  menuIcon: {
    width: 24,
    height: 24,
    opacity: 0.7,
  },
  thumbnail: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomIcons: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bottomIconsText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  bottomIconsView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    minWidth: 60,
    justifyContent: 'center',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  peopleLikedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  peopleLikedImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  menuItemText: {
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 24,
    height: 24,
    opacity: 0.8,
  },
  menuOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  menuOptionText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  cancelOption: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  // New styles for enhanced UI
  postContentContainer: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  mediaContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  interactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    marginLeft: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  shareButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 13,
    color: '#888',
    marginLeft: 8,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  shareCount: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  videoPlayButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  videoPlayIcon: {
    width: 24,
    height: 24,
    tintColor: 'white',
  },
  loadingContainer: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -20,
  },
  // Enhanced interaction button styles
  likeButton: {
    transform: [{ scale: 1 }],
  },
  shareButtonContainer: {
    transform: [{ scale: 1 }],
  },
  commentButton: {
    transform: [{ scale: 1 }],
  },
});
