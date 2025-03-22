import { StyleSheet, Text, View, Image, ImageBackground, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ResizeMode, Video } from 'expo-av';

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

const Posts = React.memo(({ setLikesMap, likesMap, setSharesMap, sharesMap, post, activePost, onCommentPress, handlePlayPress, onImagePress, onReportPress, userinfo, handleRemovePost, handleBlockUser, handleSharePostPress }) => {
  const videoRef = useRef(null);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const lastItemId = useRef(post.id);
  const userInteracted = useRef(false);

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

  useEffect(() => {
    console.log("triggered")
    if (videoRef.current) {
      console.log("here")
      if (activePost === post.id) {
        try {
          console.log("Play video")
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
            console.log("unloaded")
          }

          console.log("stopping video")

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

    // if (status.positionMillis > 0) {
    //   setBuffering(status.isBuffering)
    // }

    if(status.didJustFinish){

  
      if (videoRef.current) {
        videoRef.current.setPositionAsync(0);
      }

    }

    updateState({ isVideoPlaying: status.isPlaying });

  }, []);

  

  const userlocation = userinfo?.coordinates;

  

  //console.log(JSON.stringify(post))


  const [distanceString , setDistanceString] = useState(null);

  const { coordinates } = useSelector(state => state.location);

  const setLocation = useCallback((coordinates) => {

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

      // Optimistically update the share state in the UI
  

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

      // Optionally, if you have a setter for sharedposts, update the state in the app
      // setsharePosts(updatedsharePosts);
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

  


  
  


  
  return (
    <View style={styles.mainView}>
      <View style={styles.headerView}>
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
                <Text style={[styles.username, {color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}]}>{post.username}</Text>
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

                <Text style={{fontSize:15, color:'gray', marginStart:5}}>{timeAgo(post.createdAt)}</Text>


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
                <MenuOptions >

                 <MenuOption  onSelect={() => 
                  handleBlockUser({postcreatorid:post.user, postcreatorimage:post.profileImage,postcreatorusername:post.username})} 
                  text='Block user' />
                  <MenuOption onSelect={() => handleRemovePost(post.id)} text='Remove post' />

                  <MenuOption onSelect={handleReport}>
                    <View style={{flexDirection:'row'}}>

                      <Image
                        resizeMode="contain"
                        source={require('@/assets/icons/block.png')}
                        style={{tintColor:'red',height:20,width:20}}
                      />

                      <Text style={{color:'red'}}>Report post</Text>

                    </View>
                     
                  </MenuOption>
                 
                </MenuOptions>
              </Menu>

              
            </View>
            {post.description && <TouchableOpacity onPress={handlePostPress}>

              <Text numberOfLines={3} style={styles.description}>{post.description}</Text>

            </TouchableOpacity> }
          </View>
        </View>
      </View>

      <View style={{ height: 250, width: '100%', marginTop: 10 }}>
        {post.contentType === 'image'  ? post.content.length < 2 ? (
          <TouchableWithoutFeedback onPress={()=>onImagePress(post.content[0])}>

            <ImageBackground
              source={{ uri: post.content[0] }}
              style={{ width: '100%', height: 250, borderRadius: 10, overflow: 'hidden' }}
            />

          </TouchableWithoutFeedback>
         
        ):
        ( <View style={{borderRadius:10}}>

            <ImageSlider 

            caroselImageContainerStyle={{height:250,overflow:'hidden',width:screenWidth-100,borderRadius:10}}
            caroselImageStyle={{resizeMode:'cover',height:250,overflow:'hidden',width:screenWidth,marginHorizontal:5,borderRadius:10}}
            data={post.content.map((image) => ({ img: image }))}
            autoPlay={false}

            closeIconColor="#fff"
            />

        </View>
         
        )
         : (
          <View style={{marginHorizontal:1}}>
             
            <TouchableOpacity
              onPress={handleOnPlay}
              style={{
                width: "100%", height: 250
              }}
              >

              <View >

                <Video 
                source={{ uri: post.content }}
                shouldPlay={false}
                ref={videoRef}
                style={{ width: "100%", height: 250, borderRadius: 10 }}
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
        )}

      </View>

      <View style={styles.bottomIcons}>
        <View style={styles.bottomIconsView}>
          <TouchableOpacity onPress={handleOnLiked}>
            <Image
              resizeMode="contain"
              source={!state.isLiked ? require('@/assets/images/heart.png') : require('@/assets/icons/heartliked.png')}
              style={[styles.menuIcon, !state.isLiked && {tintColor:'gray'}, {width:25,height:25}]}
            />
          </TouchableOpacity>
          <Text style={styles.bottomIconsText}>{getFormatedString(state.likes)}</Text>
        </View>

        <View style={styles.bottomIconsView}>

           <Menu renderer={Popover} >
                <MenuTrigger >
                <Image
                      resizeMode="contain"
                      source={require('@/assets/images/refresh.png')}
                      style={[styles.menuIcon,  !state.isShared && {tintColor:'gray'}, state.isShared && {tintColor:'tomato'}]}
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
          
          <Text style={styles.bottomIconsText}>{getFormatedString(state.shares)}</Text>
        </View>

        <View style={styles.bottomIconsView}>
          <TouchableOpacity onPress={() => handleIconPress(onCommentPress)}>
            <Image
              resizeMode="contain"
              source={require('@/assets/images/chat.png')}
              style={[styles.menuIcon, {tintColor:'gray',width:27,height:27}]}
            />
          </TouchableOpacity>
          <Text style={[styles.bottomIconsText]}>{post.comments || 0}</Text>
        </View>

        {distanceString && <View style={styles.bottomIconsView}>
          <Image
            resizeMode="contain"
            source={require('@/assets/icons/location_small.png')}
            style={[styles.menuIcon, {tintColor:'gray',width:35,height:35}]}
          />
          <Text style={styles.bottomIconsText}>{distanceString}</Text>
        </View>}
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
    color: 'gray',
    fontSize: 14,
  },
  menuIcon: {
    width: 30,
    height: 30,
    marginRight: 5,
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
  }
});
