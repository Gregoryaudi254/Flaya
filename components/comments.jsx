import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image, StyleSheet, Platform,FlatList,TextInput ,Text,ScrollView, View,Button,Dimensions,ImageBackground,ScrollViewTextInput,TouchableOpacity,ActivityIndicator} from 'react-native';

import Modal from 'react-native-modal';

const { width } = Dimensions.get('window');

import {Data} from '@/constants/Data'

import CommentItem from '@/components/commentItem'
import { ResizeMode, Video } from 'expo-av';


import React, { useState, useRef, useEffect,useCallback ,memo, useMemo} from 'react';
import { Colors } from '@/constants/Colors';

import { getFirestore, collection, query, orderBy, limit, getDocs,serverTimestamp, setDoc, doc,startAfter } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';

import { useToast } from 'react-native-toast-notifications';

import { useComments } from '@/constants/useComments';
import { useColorScheme } from '@/hooks/useColorScheme';




// const CommentList = ({ comments, loadMoreComments, isLoadingMore, flatListRef, renderItem ,fetchInitialComments,isRefreshing}) => (
//   <FlatList
//     ref={flatListRef}
//     data={comments}
//     showsVerticalScrollIndicator={false}
//     style={{ marginTop: 10, flex: 2 }}
//     keyExtractor={(item) => item.id}
//     refreshing={isRefreshing}
//     initialNumToRender={20}
//     onRefresh={fetchInitialComments}
//     onEndReached={loadMoreComments}
//     onEndReachedThreshold={0.5}
//     ListFooterComponent={() => (isLoadingMore ? <ActivityIndicator size="large" color="white" /> : null)}
//     renderItem={renderItem}
//   />
// );

const CommentInput = memo(({ comment, setComment, handleSendComment, username , isReplying ,setReplying, commentcreatorid, uid, color}) => (

  <View>

  
    {isReplying && <View style={{backgroundColor:'gray', padding:10, alignItems:'center', flexDirection:'row',alignContent:'space-between'}}>

      <Text style={{color:'white',fontSize:20,marginStart:10,flex:1}}>replying to {commentcreatorid === uid ? 'yourself' : username}</Text>


      <TouchableOpacity onPress={()=> setReplying(false)}>

        <Image style={{tintColor:'white',height:20 ,width:20, marginEnd:10}} source={require('@/assets/icons/close.png')} />

      </TouchableOpacity>

    </View>}

    <View style={{ height: 60, flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          placeholderTextColor="gray"
          placeholder="Comment"
          onChangeText={setComment}
          value={comment}
          style={{ color: color, padding: 10, marginRight: 10, flex: 1, borderRadius: 10, borderColor: color, shadowColor: 'gray' }}
        />
        <TouchableOpacity onPress={handleSendComment} style={styles.circularButton}>
          <Image style={{ width: 20, height: 20 ,marginEnd:10, tintColor:color}} source={require('@/assets/icons/send.png')} />
        </TouchableOpacity>
      </View>

</View>

)
);

const comments = memo(({ isVisible, onClose, post , setIsFullWidthModalVisible}) => {
  const { comments,  sendComment ,setComments, handleReply} = useComments(db, post.id, post.user);
  const flatListRef = useRef(null);
  const [comment, setComment] = useState('');

  const colorScheme = useColorScheme();

  const [uid, setUid] = useState(null);

  const [isReplying,setReplying] = useState(false);

  const [infoR,setInfoR] = useState({});

  console.log("comments Size "+comments)

  const [isRefreshing, setRefreshing] = useState(false)
  const [isLoadingMore, setLoadingMore] = useState(false)



  const fetchInitialComments = useCallback(async () => {
    setRefreshing(true);
    try {
      const commentsRef = collection(db, `users/${post.user}/posts/${post.id}/comments`);
      const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const loadedComments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("comments size "+ loadedComments.length)
      setComments(loadedComments);
    } catch (error) {
      console.error('Error fetching initial comments:', error);
    } finally {
      setRefreshing(false);
    }
  }, [post.id]);

  const fetchMoreComments = useCallback(async (lastComment) => {
    console.log("started")
    if (!lastComment || isLoadingMore) return;
    setLoadingMore(true);

    console.log("loading more ")
    try {
      const commentsRef = collection(db, `users/${post.user}/posts/${post.id}/comments`);
      const q = query(commentsRef, orderBy('createdAt', 'desc'), startAfter(lastComment.createdAt), limit(11));
      const querySnapshot = await getDocs(q);
      const moreComments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments((prev) => [...prev, ...moreComments]);
    } catch (error) {
      console.error('Error fetching more comments:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [db, isLoadingMore]);

  useEffect(() => {
    if (isVisible) {
      fetchInitialComments();
    }
  }, [isVisible, fetchInitialComments]);

  const handleSendComment = useCallback(async () => {
    if (!comment) return;
    const profileInfo = await getData('@profile_info')

    setComment('');

    if (!isReplying) {
      flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
       await sendComment({ comment, profileImage: profileInfo.profilephoto, username: profileInfo.username, commentcreatorid:profileInfo.uid});
    }else {
      setReplying(false)
      await handleReply(infoR.id, comment ,post)
    }


  }, [comment, sendComment]);

  const handleClosing = () => {
    onClose();
    setComments([])
  }


  const onReply = async (id,username,commentcreatorid) =>{

    const profileInfo = await getData('@profile_info');
    setUid(profileInfo.uid)
  
    setInfoR({
      username:username,
      id:id,
      commentcreatorid:commentcreatorid
    })
    setReplying(true)
   // 
  }


  const renderItem = useMemo(() => ({ item }) => (
    <CommentItem 
      profileImage={item.profileImage} 
      username={item.username}
      postcreatorid={post.user}
      replies={item.replies} 
      comment={item.comment} 
      commentid={item.id}
      likes={item.likes}
      status={item.status}
      postid={post.id}
      commentcreatorid={item.commentcreatorid}
      handleReplyPress={onReply}
      setIsFullWidthModalVisible={setIsFullWidthModalVisible}
    />
  ), [onReply]);

  const handleLoadMore = () => {
    console.log("loading more")
    if (comments.length > 10) {
      fetchMoreComments(comments[comments.length - 1])
    }  
  }

  return (
    <Modal isVisible={isVisible} onBackdropPress={handleClosing}>
      <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? Colors.dark_main : Colors.light_main , borderRadius:10}}>
        <TouchableOpacity onPress={handleClosing}>
          <Image style={{ width: 20, height: 20 , margin:15, tintColor: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}} source={require('@/assets/icons/cancel.png')} />
        </TouchableOpacity>

        
        <Animated.FlatList
            ref={flatListRef}
            data={comments}
            showsVerticalScrollIndicator={false}
           style={{marginVertical:10,flex:1}}
            keyExtractor={(item) => item.id}
            refreshing={isRefreshing}
            scrollEventThrottle={16}
            onEndReachedThreshold={0.09}
           
            onRefresh={fetchInitialComments}
            onEndReached={handleLoadMore}
           
            ListFooterComponent={() => (isLoadingMore ? <ActivityIndicator size="large" color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} /> : null)}
            renderItem={renderItem}
          />

        {comments.length < 1 && !isRefreshing && <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,position:'absolute',alignSelf:'center',marginTop:'50%'}}>No Comments yet</Text>}

        <CommentInput comment={comment} setComment={setComment} handleSendComment={handleSendComment} 
        setReplying={setReplying} 
        commentcreatorid={infoR.commentcreatorid}
        uid={uid}
        color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}
        username={infoR.username} isReplying={isReplying}/>
      </View>
    </Modal>
  );
}) 



  export default comments;


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
  
