import { StyleSheet, Text, View, Image, ImageBackground, Dimensions, TouchableOpacity } from 'react-native';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ResizeMode, Video } from 'expo-av';

const { width: screenWidth,height } = Dimensions.get('window');
import { ImageSlider } from "react-native-image-slider-banner";
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { Menu, MenuOptions, MenuOption, MenuTrigger ,renderers} from 'react-native-popup-menu';
import { getData, storeData } from '@/constants/localstorage';
import { getDistance } from 'geolib';
import { db } from '@/constants/firebase';


import { setDoc ,doc, GeoPoint,serverTimestamp} from 'firebase/firestore';
import { store } from '@/store/store';
import { useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { geoFirestore } from '@/constants/firebase';
import { timeAgo } from '@/constants/timeAgo';
const { ContextMenu, SlideInMenu, Popover } = renderers;
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useSelector } from 'react-redux';
const PostSecondary = React.memo(({ post}) => {

    

    const videoRef = useRef(null);
    const colorScheme = useColorScheme();
    
    const router = useRouter()

     const [isLiked, setLiked] = useState(false);
      const [isVideoPlaying, setVideoPlaying] = useState(false);
    
      const [likes,setLikes] = useState(post.likes)
    
      const [shares, setShares] = useState(post.shares)

      const [isShared,setShared] = useState(false);
    
      
    
      const getFormatedString = useCallback((number) => {
    
        return (number || 0) < 1000 
        ? `${number || 0}` 
        : `${(number / 1000).toFixed(1)}k`
    
      }) 

  

       

 

  
  return (
    <View style={styles.mainView}>
      <View style={styles.headerView}>
        <View style={styles.profileView}>

          <TouchableOpacity>

            <Image
              source={{ uri: post.profileImage }}
              style={styles.profileImage}
            />

          </TouchableOpacity>

          

          <View style={styles.textView}>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>

              <View style={{flex:1, flexDirection:'row',alignItems:'center'}}>

                <TouchableOpacity >
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

                 <MenuOption 
                  text='Block user' />
                  <MenuOption  text='Remove post' />

                  <MenuOption>
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
            {post.description && <TouchableOpacity >

              <Text numberOfLines={3} style={styles.description}>{post.description}</Text>

            </TouchableOpacity> }
          </View>
        </View>
      </View>

      <View style={{ height: 250, width: '100%', marginTop: 10 }}>
        {post.contentType === 'image'  ? post.content.length < 2 ? (
          <TouchableWithoutFeedback >

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


            onItemChanged={(item) => console.log("item", item)}
            closeIconColor="#fff"
            />

        </View>
         
        )
         : (
          <View style={{marginHorizontal:1}}>
             
            <TouchableOpacity
          
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
               
              />

              </View>

            


              <Image
                style={{ width: 20, height: 20 ,position: 'absolute',
                  alignSelf: 'center',
                  top: '50%',
                  opacity: !isVideoPlaying ? 1 : 0,
                  marginTop: -10}}
                source={require('@/assets/icons/play.png')}
              />
              
            </TouchableOpacity>


            
          </View>
        )}
      </View>

     
       

       
   
    </View>
  );
}, (prevProps, nextProps) => {
    return prevProps.post === nextProps.post && prevProps.userinfo === nextProps.userinfo;
  });

export default PostSecondary;

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
