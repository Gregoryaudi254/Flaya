import { StyleSheet, Text, View,FlatList,Dimensions ,ActivityIndicator,RefreshControl, TouchableOpacity, Image} from 'react-native'
import React, { useState, useCallback,useEffect } from 'react'


import ProfilePostItem from '@/components/ProfilePostItem'
import { doc, setDoc,GeoPoint,serverTimestamp, getDoc ,getDocs, query, orderBy, limit, collection, startAfter, deleteDoc} from 'firebase/firestore';

const { width } = Dimensions.get('window'); // Get the screen width
import { db } from '@/constants/firebase';

const numColumns = 2;
import { getData } from '@/constants/localstorage';
import { useSelector } from 'react-redux';

import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';


const Gallery = () => {

  const colorScheme = useColorScheme();

  const router = useRouter();

  const { value } = useSelector(state => state.data);
  const [posts,setPosts] = useState([]);


  useEffect(() => {
    if (value !== null && value.intent === "postdelete") {
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== value.id))
    }
  },[value])

  useEffect(() => {
    if (value !== null && value.intent === "postupdate") {
      setPosts((prevPosts) => 
        prevPosts.map((post) => 
          post.id === value.info.id ? { ...post, description:value.info.description } : post
        )
      );
    }
  },[value])

    const [loadingmore,setLoadingMore] = useState(false);
    const [isrefreshing, setrefreshing] = useState(true);
    const [userinfo, setUserInfo] = useState(null);
    const [lastVisiblePost,setLastVisible] = useState(null);

    const getPosts = useCallback(async () => {

      console.log("getting posts")

      const userInfo = await getData('@profile_info');

      if (userInfo === null || userInfo === undefined) return;
      setUserInfo(userInfo)  
      const postsRef = collection(db, `users/${userInfo.uid}/posts`);
      const q = query(postsRef, orderBy('createdAt', 'desc'), limit(20));
      const querySnapshot = await getDocs(q);

      // Map over messages and convert `stamp` to a date string
      const posts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data
        };
      });

      console.log(posts.length+ " length of posts")

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]); // Save the last document

      setPosts(posts);

      setrefreshing(false);
    })


    useEffect(() => {
        getPosts();
    },[]);

    const getMorePosts = useCallback(async () => {
      console.log("started loading")
      if (loadingmore || !lastVisiblePost || posts.length < 2) return;
      console.log("loading more")
      setLoadingMore(true);
      const profileInfo = await getData('@profile_info');
      const chatRef = collection(db, `users/${profileInfo.uid}/posts`);
      const q = query(chatRef, orderBy('createdAt', 'desc'), startAfter(lastVisiblePost), limit(20));

      const moreSnapshot = await getDocs(q);
      const morePosts = moreSnapshot.docs.map(doc => ({
          ...doc.data(),
      }));
      
      // Update last visible document and prepend new chats to list
      setLastVisible(moreSnapshot.docs[moreSnapshot.docs.length - 1]);
      setPosts((prevPosts) => [...prevPosts, ...morePosts]);
      setLoadingMore(false);
    },[loadingmore,lastVisiblePost,posts]);

    const footerComponent = useCallback(() => {
      return loadingmore ? (
        <View style={{margin:10}}>
          <ActivityIndicator size="large" color="white" />
        </View>
      ) : null;
    }, [loadingmore]);

    const handlePostPress = (id) =>{
      router.push({
        pathname: '/sharepost'
      });
     
    }

    const onRefresh = useCallback(() => {
        setrefreshing(true);
        getPosts()
      });


  return (


    <View style={{flex:1, backgroundColor: colorScheme === 'dark' ? Colors.dark_main : Colors.light_main}}>

     {!isrefreshing  ? <FlatList
      bounces={true}
      keyExtractor={(post) => post.id}
      numColumns={2}
      style={styles.container}
      refreshControl={<RefreshControl
        refreshing={isrefreshing}
        onRefresh={onRefresh}
      />}
      
      ListFooterComponent={footerComponent}
      onEndReachedThreshold={0.5}
      onEndReached={getMorePosts}
      renderItem={({item}) =>(
        <ProfilePostItem post={item} userinfo={userinfo}/>
          
      )}
      data={posts}/> :
      <ActivityIndicator style={{alignSelf:"center",marginTop:70}} size="large" color={colorScheme === 'dark' ?   Colors.light_main : Colors.dark_main}/>
     }

     {(posts.length < 1 && !isrefreshing) && <View style={{alignItems:'center',marginTop:50, position:"absolute", alignSelf:'center'}}>
     
      <TouchableOpacity onPress={handlePostPress}>
        <Image style={{height:70,width:70, tintColor:colorScheme === 'dark' ?   Colors.light_main : Colors.dark_main}} source={require('@/assets/icons/galleryadd.png')}/>
      </TouchableOpacity>

      <Text style={{color:colorScheme === 'dark' ? 'white' : "black",fontSize:20, marginTop:10}}>Upload post!</Text>

     </View>}

    </View>
    

   

  )
}

export default Gallery

const styles = StyleSheet.create({
  container: {
    flex: 1,
   height:'100%',
    marginHorizontal:3
  },
  item: {
    
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    margin: 1,
    height: Dimensions.get('window').width / numColumns, // approximate a square
  },
})