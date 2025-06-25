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
  TouchableOpacity
} from 'react-native';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Animatable from 'react-native-animatable';
import { ResizeMode, Video } from 'expo-av';

const { width: windowWidth } = Dimensions.get('window');
const ITEM_SIZE = windowWidth * 0.72;
const SPACER = (windowWidth - ITEM_SIZE) / 2;

import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { setVolume } from '@/slices/volumeSlice';
import PulseLoader from './PulseLoader';
import { debounce } from 'lodash';
import * as FileSystem from 'expo-file-system';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
const ProgressIndicator = React.memo(({ isStoriesVisible, focused, id, viewedThreads, duration, isActive, position, previousPos, content, contentType, isVideoBuffering, threadSize, threadPosition, isStoryActive }) => {
  const [progress, setProgress] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isStoriesVisible && isActive && duration > 0) {
      console.log("Active")
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
      console.log("Not Active")
      if (!viewedThreads.has(id)) {
        if (previousPos > position) {
          progress.setValue(1);
        } else {
          progress.setValue(0);
        }
      } else {
        if (!isStoryActive) {
          progress.setValue(1);
        } else {
          if (position > previousPos) {
            progress.setValue(0);
          } else {
            progress.setValue(1);
          }
        }
      }
    }
  }, [isActive, duration, isVideoBuffering, focused, isStoriesVisible]);

  return (
    <View style={styles.progressBackground}>
      <Animated.View style={[styles.progressForeground, { flex: progress }]} />
    </View>
  );
});

const StoriesItem = React.memo(({ activeStory, item, isStoriesVisible, stories }) => {
  const router = useRouter();
  const [activeThreadIndex, setActiveThreadIndex] = useState(0);
  const videoRef = useRef(null);
  const [durationTime, setDuration] = useState(0);
  const [isVideoReady, setVideoReady] = useState(false);
  const [viewedThreads, setViewedThreads] = useState(new Set());

  const colorScheme = useColorScheme();

  
  const [cachedVideos, setCachedVideos] = useState({});

  const dispatch = useDispatch();
  const activeThread = useMemo(() => item.stories[activeThreadIndex], [item.stories, activeThreadIndex]);

  const addViewedThread = useCallback((threadId) => {
    setViewedThreads(prev => new Set(prev).add(threadId));
  }, []);


  const cacheVideoUrl = useCallback(async(threadId,videoUrl) => {
    try {
      const fileUri = `${FileSystem.cacheDirectory}${threadId}.mp4`;
      const downloadResumable = FileSystem.createDownloadResumable(videoUrl, fileUri);
      const { uri } = await downloadResumable.downloadAsync();
      setCachedVideos((prev) => ({ ...prev, [threadId]: fileUri }));
      return uri;
    } catch (e) {
      console.error('Error caching video:', e);
      return videoUrl; // Fallback to remote URL if download fails
    }
  })

  const getCachedVideoUri = useCallback(async (threadId) => {
    const fileUri = `${FileSystem.cacheDirectory}${threadId}.mp4`;

    console.log("getting started..");
    if (cachedVideos[threadId]) return cachedVideos[threadId];
   

    // Check if video is already cached
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      console.log(`Using cached video: ${fileUri}`);
      
      return fileUri;
    }

    cacheVideoUrl(activeThread.threadId,activeThread.content)

    return null;

  },[activeThread]);

  const cacheVideos = useCallback(async () => {
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
  }, [item, cachedVideos]); // Dependencies to prevent unnecessary re-renders
  

  useEffect(() =>{
    if (activeStory === item.id) {
      console.log("Caching first videos..")
      cacheVideos();
    }
  },[]);

  useEffect(() =>{
    const activeitemPos = stories.findIndex(item => item.id === activeStory);
    const currenritemPos = stories.findIndex(itemStory => itemStory.id === item.id);

    console.log(item.id+" and " +activeStory +" and "+currenritemPos)

    if (currenritemPos > 0 && (activeitemPos + 1) === currenritemPos) {
      console.log("Loading next..")
      cacheVideos();
    }
  },[activeStory,item,stories])

 
  useEffect(() => {
    const handleVideoPlayback = async () => {
      if (!videoRef.current || !isStoriesVisible || activeStory !== item.id) {
        console.log("returning "+isStoriesVisible)
        return;
      }

      try {
        const status = await videoRef.current.getStatusAsync();

        
        if (status?.isLoaded) {
          console.log("Loaded")
          if (!status.isPlaying) {
            await videoRef.current.setPositionAsync(0);
            await videoRef.current.playAsync();
          }
        } else {
          console.log("Loading")
          await videoRef.current.loadAsync(
            { uri:activeThread.content },
            {},
            true
          );
          await videoRef.current.playAsync();
        }
      } catch (e) {
        console.log('Video playback error:', e);
      }
    };

    handleVideoPlayback();

    return () => {
      if (videoRef.current) {
        console.log("stopped")
        videoRef.current.stopAsync().catch(console.error);
      }
    };
  }, [activeStory, item.id, isStoriesVisible, activeThread.content]);

  useEffect(() => {
    let timer;
    if (isStoriesVisible && activeThread.contentType === 'image' && activeStory === item.id) {
      timer = setTimeout(() => {
        addViewedThread(activeThread.content);
        goToNextThread();
      }, 5000);
    }
    return () => timer && clearTimeout(timer);
  }, [activeThread, activeStory, isStoriesVisible, addViewedThread]);

  const goToNextThread = useCallback(() => {
    setActiveThreadIndex(prev => prev + 1 < item.stories.length ? prev + 1 : prev);
  }, [item.stories.length]);

  const goToPreviousThread = useCallback(() => {
    setActiveThreadIndex(prev => prev > 0 ? prev - 1 : prev);
  }, []);

  const handlePress = useCallback((event) => {
    const { locationX, locationY } = event.nativeEvent;
    if (locationY < 200) {
      locationX > 200 / 2 ? goToNextThread() : goToPreviousThread();
    }
  }, [goToNextThread, goToPreviousThread]);

  const onProfilePress = useCallback(() => {
    router.push({
      pathname: '/oppuserprofile',
      params: { uid: item.creatorid }
    });
  }, [router, item.creatorid]);

  const onMoreStoriesPress = useCallback(() => {
    router.push({
      pathname: '/story',
      params: {
        data: JSON.stringify({
          currentuser: false,
          seriesid: item.id
        })
      }
    });
  }, [router, item.id]);

  const { ismute } = useSelector(state => state.volume);
  const handleChangeVolume = useCallback(() => {
    dispatch(setVolume(!ismute));
  }, [ismute, dispatch]);

  const videoStatusHandler = useCallback((status) => {
    if (status.didJustFinish) {
      addViewedThread(activeThread.content);
      goToNextThread();
    }

    
    if (status.isLoaded && activeStory === item.id) {
      setDuration(status.durationMillis);
       // console.log(status.positionMillis+" Time");
      setVideoReady(true)
      
    }
  }, [activeStory, item.id, activeThread.content, addViewedThread, goToNextThread,durationTime]);

   // Memoize expensive string operations
   const displayUsername = useMemo(() => {
    const maxLength = 12;
    
    return item.username.length > maxLength ? item.username.slice(0, maxLength) + '..' : item.username;
  }, [item.username]);

  return (
    <Animatable.View style={{ width: ITEM_SIZE }} duration={1000}>
      <View style={styles.mainView}>
        <TouchableWithoutFeedback onPress={handlePress}>
          <View style={styles.mainView}>
            {activeThread.contentType === 'image' ? (
              <View style={{ height: 250, borderRadius: 10 }}>
                <ImageBackground
                  resizeMode='cover'
                  source={{ uri: activeThread.content }}
                  style={[styles.mainShape, {backgroundColor:colorScheme === 'dark' ? Colors.dark_main : Colors.light_main}]}
                />
              </View>
            ) : (
              <View style={{ height: 250, borderRadius: 10 }}>
                <Video
                  key={activeThread.threadId}
                  ref={videoRef}
                  source={{uri:cachedVideos[activeThread.threadId] || activeThread.content}}
                 // shouldPlay={true}
                  style={[styles.mainShape, {backgroundColor:colorScheme === 'dark' ? Colors.dark_main : Colors.light_main}]}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls={false}
                  usePoster={true}
                  posterStyle={{ borderRadius: 10, overflow: 'hidden', resizeMode:'cover' }}
                  posterSource={{ uri: activeThread.thumbnail }}
                  onPlaybackStatusUpdate={videoStatusHandler}
                />
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        <View style={{ flexDirection: 'row', position: 'absolute', marginBottom: 30, marginStart: 30, bottom: 0,alignItems:'center' }}>

          <TouchableOpacity onPress={onProfilePress}>
            <View style={{flexDirection:'row',alignItems:'center'}}>
              <Image source={{ uri: item.userProfileImage }} style={{ width: 40, height: 40, borderColor: 'white', borderWidth: 2, borderRadius: 15, marginEnd: 10 }} />
              <Text style={{ fontSize: 20, color: 'white' }}>{displayUsername}</Text>
            </View>
          </TouchableOpacity>
          
          

          <TouchableOpacity onPress={onMoreStoriesPress} >
            <Image style={{ width: 27, height: 27 ,marginStart:5}} source={require('@/assets/icons/share.png')} />
          </TouchableOpacity>
        </View>
      </View>

      {(activeStory === item.id && durationTime === 1 && activeThread.contentType === "video") || (activeStory === item.id && !isVideoReady && activeThread.contentType === "video") && <View style={{position:'absolute',alignSelf:'center',marginTop:"40%"}} >
        <PulseLoader size={30} color="#ffffff"/>
      </View>}

      <View style={styles.progressContainer}>
        {item.stories.map((thread, index) => (
          <ProgressIndicator
            key={thread.content}
            isStoriesVisible={isStoriesVisible}
            duration={thread.contentType === 'image' ? 5000 : isVideoReady ? durationTime === 1 ? 0 : durationTime : 0}
            isActive={activeStory === item.id && activeThreadIndex === index}
            content={activeThread.content}
            contentType={activeThread.contentType}
            isVideoBuffering={false}
            isStoryActive={item.id === activeStory}
            focused={true}
            
            viewedThreads={viewedThreads}
            previousPos={activeThreadIndex}
            id={thread.threadId}
            position={index}
          />
        ))}
      </View>
    </Animatable.View>
  );
});

const Stories = React.memo(({ stories, isStoriesVisible, setActiveStory }) => {
  const [activeStoryID, setactiveStoryID] = useState(stories[0]?.id);
  
  const updateStories = useMemo(() => 
    [{ id: 'left' }, ...stories, { id: 'right' }], 
    [stories]
  );

  const debouncedSetActiveStory = useCallback(
    debounce((newActiveStory) => {
      setactiveStoryID(newActiveStory?.key || "NoKey");
      setActiveStory?.(newActiveStory);
    }, 500), // 500ms debounce delay
    []
  );

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      try {
        const newActiveStory = viewableItems[0].key === 'left' 
          ? viewableItems[1] 
          : viewableItems[0];

        debouncedSetActiveStory(newActiveStory);
      } catch (e) {
        console.error('Viewable items error:', e);
      }
    }
  }, [setActiveStory]);

  const renderItem = useCallback(({ item }) => (
    !item.username 
      ? <View style={{ width: SPACER }} /> 
      : <StoriesItem 
          activeStory={activeStoryID}
          isStoriesVisible={isStoriesVisible}
          stories={stories}
          item={item}
        />
  ), [activeStoryID, isStoriesVisible, stories]);

  const keyExtractor = useCallback((story) => story.id, []);

  return (
    <FlatList
      data={updateStories}
      bounces
      snapToInterval={ITEM_SIZE}
      scrollEventThrottle={16}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      horizontal
      viewabilityConfig={{ itemVisiblePercentThreshold: 100 }}
      onViewableItemsChanged={onViewableItemsChanged}
      showsHorizontalScrollIndicator={false}
      removeClippedSubviews
      windowSize={5}
    />
  );
});

export default Stories;

const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    marginEnd: 10,
    marginStart: 10,
  },
  mainShape: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 10,
    
   
    shadowRadius: 10,
    shadowOpacity: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 10,
    left: 10,
    marginTop: 2,
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
  },
});
