import { StyleSheet, Text, View, Image, ImageBackground, Dimensions, TouchableOpacity } from 'react-native';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ResizeMode, Video } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useLocalSearchParams,useRouter} from 'expo-router'


import CommentsPost from '@/components/commentsPost';
import CustomDialogRepost from '@/components/CustomDialogRepost';


const postpage = () => {
    
    const { data } = useLocalSearchParams();

    

    const post = JSON.parse(data);

    console.log(post)


    const videoRef = useRef(null);

    const [isLiked, setLiked] = useState(false);
    const [isVideoPlaying, setVideoPlaying] = useState(true);

    const [isDialogVisible, setIsDialogVisible] = useState(false);
    const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
    const [isFullWidthModalVisible, setIsFullWidthModalVisible] = useState(false);
    const [fullWidthModalOrigin, setFullWidthModalOrigin] = useState({ x: 0, y: 0 });

    const handleRepostPress = (event) => {
        const { pageY, pageX } = event.nativeEvent;
        setButtonPosition({ top: pageY, left: pageX });
        setIsDialogVisible(true);
      };
    
      
  
    const handleOnLiked = useCallback(() => {
      setLiked(true);
    }, []);
  
    const handleIconPress = useCallback((event) => {
      const { pageX, pageY } = event.nativeEvent;
      setFullWidthModalOrigin({ x:pageX, y:pageY });
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
  

    




    return (

        <SafeAreaView style={{flex:1}}>

            <View style={styles.mainView}>
               

                <View style={styles.headerView}>

                  <TouchableOpacity onPress={handleClose} >
                   <Image style={{width:30,height:30}} source={require('@/assets/icons/arrow.png')}></Image>
                  </TouchableOpacity>

                    <View style={{flexDirection:'row',justifyContent:'space-between',flex:1,alignItems:'center',marginStart:20}}>

                      <View style={styles.profileView}>
                        <Image
                            source={{ uri: post.profileImage }}
                            style={styles.profileImage}
                        />

                        <Text style={styles.username}>{post.username}</Text>

                      
                      </View>

                      <Image
                                resizeMode="contain"
                                source={require('@/assets/icons/menu.png')}
                                style={styles.menuIcon}
                            />

                    </View>

                    
                </View>

                <Text style={styles.description}>{post.description}</Text>

                <View style={{ flex:1, width: '100%', marginTop: 10 }}>
                    {post.contentType === 'image' ? (
                    <ImageBackground
                        source={{ uri: post.content }}
                        style={{ width: '100%',height:'100%', borderRadius: 10, overflow: 'hidden' }}
                    />
                    ) : (
                    <View>

                        <Video
                        source={{ uri: post.content }}
                        shouldPlay={true}
                        ref={videoRef}
                        style={{ width: '100%',height:'100%',  borderRadius: 10,overflow:'hidden' }}
                        resizeMode={ResizeMode.COVER}
                        useNativeControls={true}
                        usePoster={true}
                      
                        posterStyle={{ borderRadius: 10, overflow: 'hidden', resizeMode: 'cover' }}
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
                    <TouchableOpacity onPress={handleOnLiked} style={{ width: 20, height: 20 }}>
                        <Image
                        resizeMode="contain"
                        source={!isLiked ? require('@/assets/images/heart.png') : require('@/assets/icons/heartliked.png')}
                        style={styles.menuIcon}
                        />
                    </TouchableOpacity>
                    <Text style={styles.bottomIconsText}>2.1k</Text>
                    </View>

                    <View style={styles.bottomIconsView}>
                    <TouchableOpacity onPress={(event) => handleRepostPress(event)} style={{ width: 20, height: 20 }}>
                        <Image
                        source={require('@/assets/images/refresh.png')}
                        style={styles.menuIcon}
                        />
                    </TouchableOpacity>
                    <Text style={styles.bottomIconsText}>988</Text>
                    </View>

                    <View style={styles.bottomIconsView}>
                    <TouchableOpacity onPress={(event) => handleIconPress(event)} style={{ width: 20, height: 20 }}>
                        <Image
                        resizeMode="contain"
                        source={require('@/assets/images/chat.png')}
                        style={styles.menuIcon}
                        />
                    </TouchableOpacity>
                    <Text style={styles.bottomIconsText}>200</Text>
                    </View>

                    <View style={styles.bottomIconsView}>
                    <Image
                        resizeMode="contain"
                        source={require('@/assets/images/location-pin.png')}
                        style={styles.menuIcon}
                    />
                    <Text style={styles.bottomIconsText}>700m</Text>
                    </View>
                </View>


            </View>


            <CustomDialogRepost isVisible={isDialogVisible} onClose={() => setIsDialogVisible(false)} buttonPosition={buttonPosition} />


            <CommentsPost
                isVisible={isFullWidthModalVisible}
                onClose={() => setIsFullWidthModalVisible(false)}
                origin={fullWidthModalOrigin}
            />

        </SafeAreaView>


    
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
        color: 'white',
        fontSize: 17,
       
        fontWeight: 'bold',
      },
      description: {
        color: 'gray',
        fontSize: 14,
      },
      menuIcon: {
        width: 20,
        height: 20,
        
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
        marginTop: 10,
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