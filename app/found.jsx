


import { StyleSheet, View, FlatList, ImageBackground, Image,Animated,TouchableWithoutFeedback,Text,Dimensions,TextInput, Button,TouchableOpacity,Icon } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import * as Animatable from 'react-native-animatable';
import { ResizeMode, Video } from 'expo-av';

import {useLocalSearchParams,useRouter} from 'expo-router'

import { SafeAreaView } from 'react-native-safe-area-context';

const {width,height} = Dimensions.get('window')
const ITEM_SIZE = width * 0.88

const SPACER_SIZE = (width - ITEM_SIZE)/2

const zoomIn = {
  0: { scale: 0.8 },
  1: { scale: 1.1 },
};

const zoomOut = {
  0: { scale: 1.1 },
  1: { scale: 0.8 },
};


const ProgressIndicator = ({positionInMillis,id,viewedThreads,contentType, duration, isActive,position,previousPos,storyId,activeStoryId,buffering,threadSize,threadPosition,isStoryActive}) => {
  const progress = useRef(new Animated.Value(0)).current;

  const animationRef = useRef(null);

  const prevActiveStory = useRef(activeStoryId);

 // const [isFinished,setFinished] = useState(false);

  useEffect(() => {


    if (isActive && duration > 0) {

      if(animationRef.current){

        console.log('here')

        if(buffering){

          console.log('stop- '+positionInMillis)

          if(positionInMillis > 0){

            animationRef.current.stop()

          }else{

            progress.setValue(0)

            const animationDuration = duration - positionInMillis

            animationRef.current = Animated.timing(progress, {
              toValue: 1,
              duration: animationDuration,
              useNativeDriver: false,
            });

         
           animationRef.current.start()

          }

          
        }else{

          console.log('here i come '+positionInMillis+'and ' +duration)


          if(prevActiveStory.current){

            console.log(activeStoryId+' story sitau-'+prevActiveStory.current)



            if(prevActiveStory.current !== activeStoryId || contentType === 'image'){

              progress.setValue(0)

              positionInMillis = 0

            }
          }

          


          

          const animationDuration = duration - positionInMillis

          animationRef.current = Animated.timing(progress, {
            toValue: 1,
            duration: animationDuration,
            useNativeDriver: false,
          });

         
          animationRef.current.start()
        }

      
      }else{

        console.log('What')

        

        progress.setValue(0)
        animationRef.current = Animated.timing(progress, {
          toValue: 1,
          duration: duration,
          useNativeDriver: false,
        });

        animationRef.current.start()

      }

    
       


    } else {

      


      if (!viewedThreads.has(id)) {

        if(previousPos > position){
          progress.setValue(1)
          //console.log('here'+position)
        }else{
          progress.setValue(0);
        }
        
      }else{

        if(!isStoryActive){
          progress.setValue(1);
        }else{

        //  console.log('sfss  '+position+' abnd ' + previousPos)

         // console.log('id :'+id)

          if(position > previousPos){
            progress.setValue(0)
            //console.log('here'+position)
          }else{
            progress.setValue(1)
          }
          //progress.setValue(0)

        }
      }
    }

    prevActiveStory.current = activeStoryId;


  }, [isActive, duration,buffering,activeStoryId]);


  return (
    <View style={styles.progressBackground}>
      <Animated.View style={[styles.progressForeground, { flex: progress }]} />
    </View>
  );
};



const StoriesItem = ({ activeStory, item,index,scrollX }) => {

  const [activeThreadIndex, setActiveThreadIndex] = useState(0);
  const activeThread = item.threads[activeThreadIndex];
  const videoRef = useRef(null);
  const [durationTime, setDuration] = useState(5000);
  const [isVideoReady, setVideoReady] = useState(false);
  
  const [isVideoBuffering, setVideoBuffering] = useState(false);

  const [previousThreadPosition,setPreviousThreadPosition] = useState(0)

  const [viewedThreads, setViewedThreads] = useState(new Set());

  const [isPaused,setPaused] = useState(false)

  const [positionInMillis,setPositionInMillis] = useState(0)



  const inputRange = [(index - 2) * ITEM_SIZE,
  (index - 1) * ITEM_SIZE, index * ITEM_SIZE]

  const translateY = scrollX.interpolate({
    inputRange,
    outputRange:[0,-50,0]
  })


  const addViewedThread = (threadId) => {
    setViewedThreads((prevViewedThreads) => new Set(prevViewedThreads).add(threadId));
  };

 

  useEffect(() => {
    if (videoRef.current) {
      if (activeStory === item.id) {

       
       
        videoRef.current.playAsync();
      } else {
        videoRef.current.pauseAsync();

        videoRef.current.setPositionAsync(0);
      }
    }
  }, [activeStory, item.id]);

 

  useEffect(() => {
    let timer;
    if (activeThread.contentType === 'image' && activeStory === item.id) {
      timer = setTimeout(() => {
        addViewedThread(activeThread.content);
        goToNextThread();
      }, 5000); // 5 seconds for images
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeThread, activeStory]);

  const goToNextThread = () => {
    //console.log('Going to next thread'); // Debug log
    setActiveThreadIndex((prevIndex) => {
      //const newIndex = (prevIndex + 1) % item.threads.length;



     // setVideoBuffering(false)

      setPreviousThreadPosition(prevIndex)

     
      return (prevIndex + 1) < item.stories.length ? (prevIndex + 1):  prevIndex;
    });
  };

  const goToPreviousThread = () => {
    //console.log('Going to next thread'); // Debug log
    setActiveThreadIndex((prevIndex) => {
      //const newIndex = (prevIndex + 1) % item.threads.length;


      //setVideoBuffering(false)

      setPreviousThreadPosition(prevIndex +1)

      console.log('Thread '+activeThread.caption)

      return (prevIndex - 1) > -1 ? (prevIndex - 1):  prevIndex;
    });
  };


  useEffect(() => {
   // console.log('sActive Thread Index:', activeThreadIndex); // Debug log
    //console.log('Active Thread:', activeThread); // Debug log
  }, [activeThread,activeThreadIndex]);

  const handlePress = (event) => {
    const { locationX, width,locationY } = event.nativeEvent;
    //console.log(`locationX: ${locationX}, width: ${width}`);

    if(locationY < 350){
      if (locationX > 200 / 2) {
        goToNextThread();
        console.log('Next'); 
      } else {
        console.log('Back'); 
        goToPreviousThread();
      }
    }

    
  };

  const handlePressTest = () => {


    if (videoRef.current) {

      if(!isPaused){

        videoRef.current.pauseAsync();

        setPaused(true)

      }else{

        videoRef.current.playAsync();

        setPaused(false)

      }
      
    }
   
    
  };

  return (


    <Animated.View
    style={{transform:[{translateY:translateY}],marginTop:40}}
    duration={400}
    >
    <View style={{width:ITEM_SIZE,top:30}}>


    
      <TouchableWithoutFeedback  onPress={handlePress}>

        <View style={styles.mainView}>
          {activeThread.contentType === 'image' ? (

            <View style={{flex:1, height: 550,  borderRadius: 10 }}>

              <ImageBackground
                resizeMode='cover'
                source={{ uri: activeThread.content }}
                style={styles.mainShape}
              />



            </View>


          ) : (

            <View style={{ flex:1, height: 550, borderRadius: 10 }}>
              <Video
                source={{ uri: activeThread.content }}
                key={`${item.id}-${activeThreadIndex}`}
                ref={videoRef}
                useNativeControls={false}
                usePoster={true}
                posterStyle={{borderRadius:10,overflow:'hidden',resizeMode:'cover'}}
                style={styles.mainShape}
                resizeMode={ResizeMode.COVER}
               
                onPlaybackStatusUpdate={(status) => {
                  if (status.didJustFinish) {
                    addViewedThread(activeThread.content);
                    goToNextThread();   
                  }


                  setVideoBuffering(status.isBuffering);

                  // if(!status.isPlaying){

                  //   setVideoBuffering(true)

                  // }else{
                  //   setVideoBuffering(false)
                  // }
                  

                
                  if (status.isLoaded && activeStory === item.id && videoRef.current) {

                    setPositionInMillis(status.positionMillis)

                    setDuration(status.durationMillis)

                    setVideoReady(true)
          

                  
                      if(!status.isPlaying){
                        
                         videoRef.current.playAsync().catch((error) => {
                             console.error('Error playing video:', error);
                        });


                     }


                  }

                
                  
                }}
              />
            </View>
          )}

          

        </View>

    
      </TouchableWithoutFeedback>

      <View style={{flexDirection:'column',position:'absolute',marginBottom:20,marginStart:30,bottom:0,right:0,flex:1,left:0,marginEnd:30}}>

        <Text style={{fontSize:15,color:'white',marginBottom:20,alignSelf:'center'}}>{activeThread.caption? activeThread.caption:null}</Text>


         <View style={{flexDirection:'row'}}>

            <Image source={{uri:item.userProfileImage}} 
            style={{width:35,height:35,borderColor:'white',borderWidth:2,borderRadius:40,marginEnd:10}} />



            <Text style={{fontSize:20,color:'white',fontStyle:'bold'}}>{item.username}</Text>

           


         </View>
            

          
      </View>

      

      

    </View>

    <View style={styles.progressContainer}>
      {item.stories.map((thread, index) => (
        <ProgressIndicator
          key={thread.content}
          duration={thread.contentType === 'image' ? 5000 : isVideoReady ? durationTime : 0}
          isActive={activeStory === item.id && activeThreadIndex === index}
         
          buffering={isVideoBuffering}
          isStoryActive={item.id === activeStory}
          storyId={item.id}
          activeStoryId={activeStory}
          contentType={thread.contentType}
        
          positionInMillis={positionInMillis}
          viewedThreads={viewedThreads}
          previousPos={activeThreadIndex}
          id={thread.content}
          position={index}
        
        />

        
      ))}
    </View>

    </Animated.View>

  );
};


export default function found () {
  const { data } = useLocalSearchParams();
  const [stories,setStories] = useState(data ? [{id:'left'}, ...JSON.parse(decodeURIComponent(data)),{id:'right'} ]: null) ;

  const flatListRef = useRef(null)

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToIndex({ animated: true, index: 1 });
      }, 0); // Use a timeout to ensure FlatList has rendered before scrolling
    }
  }, []);



  const [activeStory, setActiveStory] = useState(stories[1].id);

  const onViewableItemsChanged = ({ viewableItems }) => {
    if (viewableItems.length > 0) {

      try{
        if(viewableItems[0].key === 'left'){
          setActiveStory(viewableItems[1].key);
        }else{
          setActiveStory(viewableItems[0].key);
        }
      }catch(e){
        console.log('length -'+viewableItems.length+' key-'+viewableItems[0])
      }

     

     // console.log('length -'+viewableItems.length+' key-'+viewableItems[0].key)
    }
  };

  const scrollX = React.useRef(new Animated.Value(0)).current

  const handleScrollToIndexFailed = (info) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current.scrollToIndex({ index: info.index, animated: true });
    });
  };

  const router = useRouter();


  const handleClose = () => {
    router.back(); // Navigate back to the previous screen
    // Or navigate to a specific screen:
    // router.push('/desired-screen');
  };

  

  return (

    <SafeAreaView style={{flex:1}}>

      <View style={{flex:1}}>

      <View style={{height:10,flex:1,marginBottom:20,justifyContent:'space-between',flexDirection:'row',margin:20}}>

          <TouchableOpacity onPress={handleClose} style={{width:50,height:50,alignItems:'center'}} >
            <Image style={{width:30,height:30}} source={require('@/assets/icons/arrow.png')}></Image>
          </TouchableOpacity>

          <Image source={{uri:'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg'}} 
          style={{width:50,height:50,borderColor:'orange',shadowRadius:1,shadowOpacity:2,shadowColor:'white',borderWidth:3,borderRadius:50,marginEnd:10,right:0}} />

      </View>

      <Animated.FlatList
        data={stories}
        ref={flatListRef}
        bounces={true}
        keyExtractor={(story) => story.id}
        snapToInterval={ITEM_SIZE}
        
        onScroll={Animated.event(
          [{nativeEvent:{contentOffset:{x:scrollX}}}],
          {useNativeDriver:true}
        )}
        scrollEventThrottle={16}
        renderItem={({ item ,index}) =>

          !item.username ? (
            <View style={{width:SPACER_SIZE,height:550}}>
              {/* Your content for items with a username */}
            </View>
          ) : (
            <StoriesItem 
              activeStory={activeStory} 
              item={item} 
              index={index} 
              scrollX={scrollX} 
            />
          )
        
        
        }
        horizontal
        decelerationRate={true}
        viewabilityConfig={{ itemVisiblePercentThreshold: 95 }}
        contentOffset={{ x: 170 }}
        onViewableItemsChanged={onViewableItemsChanged}
        onScrollToIndexFailed={handleScrollToIndexFailed}
      />


      <View style={{height:10,flex:1,flexDirection:'row',marginBottom:20,marginHorizontal:10,}}>

        <TextInput placeholder='Reply' style={{backgroundColor:'white',padding:10,marginRight:10,flex:1,borderRadius:10,borderColor:'white',shadowColor:'gray'}}/>

          <TouchableOpacity style={styles.circularButton} >
            <Image style={{width:20,height:20}} source={require('@/assets/icons/send.png')}></Image>
          </TouchableOpacity>

      </View>

      </View>

    </SafeAreaView>

   
   
  );

  
}


const styles = StyleSheet.create({
  mainView: {
    flexDirection:'row',
    marginHorizontal:10
  },
  circularButton: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: 'blue',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainShape: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 10,
    shadowColor: 'white',
    shadowRadius: 10,
    shadowOpacity: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 10,
    left: 10,
    marginTop:30,
    marginEnd:10,
    marginStart:10,
    marginBottom:2,
    right: 10,
    height: 2,
    zIndex: 1,
  },
  progressBackground: {
    flex: 1,
    flexDirection:'row',
    height: 5,
    borderRadius:5,
    overflow:'hidden',
    backgroundColor: '#e0e0e0',
    margin: 2,
  },
  progressForeground: {
    backgroundColor: '#FFA500',
  },
});