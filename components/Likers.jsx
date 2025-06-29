import {Data} from '@/constants/Data'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image, StyleSheet, Platform,FlatList,TextInput ,Text,ScrollView, View,Button,Dimensions,ImageBackground,ScrollViewTextInput,TouchableOpacity,ActivityIndicator} from 'react-native';

import Modal from 'react-native-modal';

const { width } = Dimensions.get('window');

import CommentItem from '@/components/commentItem'
import { ResizeMode, Video } from 'expo-av';


import React, { useState, useRef, useEffect,useCallback } from 'react';
import { Colors } from '@/constants/Colors';

import { getFirestore, collection, query, orderBy, limit, getDocs,serverTimestamp, setDoc, doc,startAfter, startAt, where } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';

import { useToast } from 'react-native-toast-notifications';

import { useComments } from '@/constants/useComments';
import { useColorScheme } from '@/hooks/useColorScheme';
import InteractingusersItem from './interactingusersItem';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import profileInfo from '@/app/(profile)';


const interactingusers = React.memo(({ isVisible, onClose, info}) => {
 
  const router = useRouter();
  const flatListRef = useRef(null);

  console.log("Likers")


  const [interactingusers,setinteractingusers] = useState([])

  const colorScheme = useColorScheme();

  const postid = info.id;
  const postcoordinate = info.coordinates;
  const postcreatorid = info.user


  const [isRefreshing, setRefreshing] = useState(false)
  const [isLoadingMore, setLoadingMore] = useState(false)
  const [shouldLoadMore, setShouldLoadMore] = useState(true)


  const fetchInitialUsers = useCallback(async () => {
    setRefreshing(true);
    setShouldLoadMore(true)

    const userinfo = await getData('@profile_info')

    try {
     
      const collectionsRef = collection(db, `users/${postcreatorid}/posts/${postid}/likes`);
      const q = query(collectionsRef, orderBy('popularity', 'desc'), limit(11), where('uid', '!=', userinfo.uid));
      const querySnapshot = await getDocs(q);
      const loadedCollections = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("comments size "+ loadedCollections.length)
      setinteractingusers(loadedCollections);

      setShouldLoadMore(loadedCollections.length > 11)
    } catch (error) {
      console.error('Error fetching initial comments:', error);
    } finally {
      setRefreshing(false);
    }
  }, [db,postid]);

  const fetchMoreUsers = useCallback(async (lastUser) => {
    console.log("started" +postid)
    if (!lastUser || isLoadingMore) return;
    setLoadingMore(true);

    console.log("loading more ");

    const userinfo = await getData('@profile_info')
   
    try {
      const collectionsRef = collection(db, `users/${postcreatorid}/posts/${postid}/likes`);
      const q = query(collectionsRef, orderBy('popularity', 'desc'), startAfter(lastUser.createdAt), limit(11) , where('uid', '!=', userinfo.uid));
      const querySnapshot = await getDocs(q);
      const moreUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setinteractingusers((prev) => [...prev, ...moreUsers]);

      console.log("size of users "+moreUsers.length);

      setShouldLoadMore(moreUsers.length > 10)
    } catch (error) {
      console.error('Error fetching more comments:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [db, isLoadingMore, postid]);

  useEffect(() => {
      if (isVisible) {
        fetchInitialUsers();
      }
      
  }, [postid,isVisible]);

  

  const handleClosing = () => {
    onClose();
    setinteractingusers([])
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

      handleClosing();
  
    }

    const handleUserPress = (senderid) => {

      router.push({
        pathname:'/oppuserprofile',
        params:{uid:senderid}
      });

      handleClosing();

    }

  const renderItem = useCallback(
    ({ item }) => (
      <InteractingusersItem 
       userinfo={item}
       postcoordinate={postcoordinate}
       handleChatPress={handleChatPress}
       handleUserPress={handleUserPress}

      />
    ),
    [interactingusers]
  );

  const handleLoadMore = () => {
    console.log("loading more")
    if (interactingusers.length > 10 && shouldLoadMore) {
      fetchMoreUsers(interactingusers[interactingusers.length - 1])
    }  
  }

  return (
    <Modal isVisible={isVisible} onBackdropPress={handleClosing}>
      <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? Colors.dark_main : Colors.light_main , borderRadius:10}}>
        <TouchableOpacity onPress={handleClosing}>
          <Image style={{ width: 20, height: 20 , margin:15, tintColor: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}} source={require('@/assets/icons/cancel.png')} />
        </TouchableOpacity>

        <Text style={{fontWeight:'bold', marginTop:10, fontSize:18, alignSelf:'center', position:'absolute', color:colorScheme === 'dark' ? Colors.light_main:Colors.dark_main}}>Likers</Text>

        
        <Animated.FlatList
            ref={flatListRef}
            data={interactingusers}
            showsVerticalScrollIndicator={false}
            style={{marginVertical:10,flex:1}}
            keyExtractor={(item) => item.id}
            refreshing={isRefreshing}
            scrollEventThrottle={16}
            onEndReachedThreshold={0.1}
           
            onRefresh={fetchInitialUsers}
            onEndReached={handleLoadMore}
           
            ListFooterComponent={() => (isLoadingMore ? <ActivityIndicator size="large" color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} /> : null)}
            renderItem={renderItem}
          />

     

      
      </View>
    </Modal>
  );
})



  export default interactingusers;


  const styles = StyleSheet.create({
   
    
    modal: {
      justifyContent: 'flex-start',
      margin: 0,
    },
  
    fullWidthModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    fullWidthModalContent: {
      width: width,
      height: 800,
      backgroundColor: 'black',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
    },
    profileImage: {
      width: 50,
      height: 50,
      borderColor: 'white',
      borderWidth: 3,
      borderRadius: 25,
      marginEnd: 10,
    }, 
    menuIcon: {
      width: 20,
      height: 20,
      paddingRight:5  
    },

    username: {
      color: 'white',
      fontSize: 17,
     
      
      fontWeight: 'bold',
    },
    description: {
      color: 'gray',
      fontSize: 14,
    },bottomIcons:{
     
      flexDirection:'row',
      marginTop:10,
      justifyContent:'space-between',
      marginEnd:10,
     
  },

  bottomIconsText:{
      color:'gray',
      fontSize:13,
      marginLeft:5
  },
  bottomIconsView:{
      flexDirection:'row',
      alignItems:'center',
      
  }
   
  });