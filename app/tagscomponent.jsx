import { StyleSheet, Text, View,FlatList,Dimensions ,ActivityIndicator,RefreshControl, TouchableOpacity, Image} from 'react-native'
import React, { useState, useCallback,useEffect, useMemo } from 'react'


import ProfilePostItem from '@/components/ProfilePostItem'
import { doc, setDoc,GeoPoint,serverTimestamp, getDoc ,getDocs, query, orderBy, limit, collection, startAfter, deleteDoc} from 'firebase/firestore';

const { width } = Dimensions.get('window'); // Get the screen width
import { db } from '@/constants/firebase';

const numColumns = 2;
import { getData } from '@/constants/localstorage';
import { useSelector } from 'react-redux';


import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';


const tagscomponent = () => {

  const colorScheme = useColorScheme();

  const router = useRouter();

  const { value } = useSelector(state => state.data);
  const [posts,setPosts] = useState([]);

  const {uid} = useLocalSearchParams();


  useEffect(() => {
    if (value !== null && value.intent === "postdelete") {
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== value.id))
    }
  },[value])

    const [loadingmore,setLoadingMore] = useState(false);
    const [isrefreshing, setrefreshing] = useState(true);
    const [userinfo, setUserInfo] = useState(null);
    const [lastVisiblePost,setLastVisible] = useState(null);

    const getPosts = useCallback(async () => {

      console.log("getting posts")

      
      const postsRef = collection(db, `users/${uid}/tags`);
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
   
      const chatRef = collection(db, `users/${uid}/tags`);
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


    
      

      const getUserInfo = async () => {
     
        const ref = doc(db,`users/${uid}`);
        const userInfoSnap = await getDoc(ref);

        setUserInfo(userInfoSnap.data())
      }

      useEffect(() => {
        getUserInfo()
      },[])

      const listHeaderComponent = useMemo(
        () => (
            <View style={{marginBottom:15}}>

                <View style={{flexDirection:'row',alignItems:'center',marginTop:10}}>
                  <TouchableOpacity onPress={() => router.back()} >
                    <Image style={{width:20,height:20,tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,marginStart:20}} source={require('@/assets/icons/arrow.png')}></Image>
                  </TouchableOpacity>

                  <Text style={{fontSize:25,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontWeight:'bold',marginStart:10}}>Tags</Text>

                </View>
                

                {userinfo !== null && <View style={{flexDirection:'row',marginTop:15}}>
                    {userinfo !== null && <Image source={{uri:userinfo.profilephoto}} 
                     style={{width:100,height:100,borderColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,borderWidth:3,borderRadius:10,marginEnd:10,marginStart:20}} />}

                    <View >
                        <Text style={{fontSize:25,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,marginTop:5}}>{userinfo.username}</Text>

                        <View style={{flexDirection:'row',alignItems:'center',marginTop:10}}>
                            <Text style={{fontSize:17,color:'gray'}}>Posts</Text>

                            <View style={{justifyContent:'center',backgroundColor:Colors.dark_gray,marginStart:5,width:25,height:25, borderRadius:5,alignItems:'center'}}>

                              <Text style={{fontSize:14,color:"white",marginBottom:2}}>{userinfo.tagscount || 0}</Text>

                            </View>

                        </View>

                    </View>


                </View>}

            </View>
        ),[userinfo]
      )
     

    const onRefresh = useCallback(() => {
        setrefreshing(true);
        getPosts();
        getUserInfo();
      });


  return (


     <SafeAreaView style={{flex:1}} >

      <View style={{flex:1}}>

      {!isrefreshing  ? <FlatList
      bounces={true}
      keyExtractor={(post) => post.id}
      numColumns={2}
      style={styles.container}
      refreshControl={<RefreshControl
        refreshing={isrefreshing}
        onRefresh={onRefresh}
      />}

      ListHeaderComponent={listHeaderComponent}
      
      ListFooterComponent={footerComponent}
      onEndReachedThreshold={0.5}
      onEndReached={getMorePosts}
      renderItem={({item}) =>(
          <View style={styles.item}>

          <ProfilePostItem post={item} userinfo={userinfo}/>

          </View>
          
      )}
      data={posts}/> :
      <ActivityIndicator style={{alignSelf:"center",marginTop:70}} size="large" color={colorScheme === 'dark' ?   Colors.light_main : Colors.dark_main}/>
      }

      {posts.length < 1 && !isrefreshing && <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,position:'absolute',alignSelf:'center',marginTop:'50%'}}>No tags yet</Text>}

      </View>

     </SafeAreaView>
   
    

   

  )
}

export default tagscomponent;

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