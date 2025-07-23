import { StyleSheet, Text, View, Image,TouchableOpacity ,FlatList, ActivityIndicator, RefreshControl} from 'react-native'
import React,{useEffect, useState, useCallback} from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import UpdateItem from '@/components/UpdateItem'

import { getData } from '@/constants/localstorage'

import { doc,onSnapshot, getDoc ,getDocs, query, orderBy, limit, collection, startAfter, where} from 'firebase/firestore';
import { db } from '@/constants/firebase'
import { Colors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'
import Interactingusers from '@/components/interactingusers'
import Animated from 'react-native-reanimated'
import { useAuth } from '@/constants/AuthContext'
const index = () => {

  const colorScheme = useColorScheme();
  const isDark = colorScheme == 'dark';

  const router = useRouter();

  
  const [updates,setUpdates] = useState([]);

  const [loadingmore,setLoadingMore] = useState(false);
  const [isrefreshing, setrefreshing] = useState(true);
 
  const [lastVisiblePost,setLastVisible] = useState(null);

  const [isLoadingPost,setLoadingPost] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [userInfo, setUserInfo] = useState(null);

  const [isFullWidthModalVisible, setisFullWidthModalVisible] = useState(false);

  const [selectedcollectionInfo,setSelectedcollectionInfo] = useState({});



  const {user} = useAuth()

  const signUp = useCallback(() =>{
    router.push('/signUp')
  },[])

  const signIn = useCallback(() =>{
    router.push('/signIn')
  },[])

    const handleMessagingPress = () =>{
        router.push({
            pathname: '/(tabs)/updates/messaging'
          });
    }

    useEffect(() => {

      if (userInfo === null || userInfo === undefined) return;
      // Define the reference to the collection
      const messagesRef = collection(db, `users/${userInfo.uid}/messages`);
      
      // Create a query to filter unread messages
      const unreadMessagesQuery = query(messagesRef, where("isread", "==", false));
  
      // Set up the real-time listener
      const unsubscribe = onSnapshot(unreadMessagesQuery, (snapshot) => {
        setUnreadCount(snapshot.size); // Update count based on the number of matching documents
      });
  
      // Clean up the listener on unmount
      return () => unsubscribe();
    }, [userInfo, user]);

    const getIntitialUpdates = async () => {

      

      const userInfo = await getData('@profile_info');
      if (userInfo === null || userInfo === undefined) return;

      setUserInfo(userInfo);

      const updatedRef = collection(db, `users/${userInfo.uid}/updates`);
      const q = query(updatedRef, orderBy('timestamp', 'desc'), limit(11));
      const querySnapshot = await getDocs(q);

      // Map over messages and convert `stamp` to a date string
      const updates = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data
        };
      });

      console.log(updates.length+ " length of posts")

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]); // Save the last document

      setUpdates(updates);

      setrefreshing(false);
    }

    const getMoreUpdates = useCallback(async () => {
      console.log("started loading")
      if (loadingmore || !lastVisiblePost || updates.length < 10) return;
      console.log("loading more")
      setLoadingMore(true);
      const profileInfo = await getData('@profile_info');
      const updateRef = collection(db, `users/${profileInfo.uid}/updates`);
      const q = query(updateRef, orderBy('timestamp', 'desc'), startAfter(lastVisiblePost), limit(20));

      const moreSnapshot = await getDocs(q);
      const morePosts = moreSnapshot.docs.map(doc => ({
          ...doc.data(),
      }));
      
      // Update last visible document and prepend new chats to list
      setLastVisible(moreSnapshot.docs[moreSnapshot.docs.length - 1]);
      setUpdates((prevUpdates) => [...prevUpdates, ...morePosts]);
      setLoadingMore(false);
    },[loadingmore,lastVisiblePost,updates]);

    useEffect(() => {
      getIntitialUpdates();
    },[user]);

    
    const footerComponent = useCallback(() => {
      return loadingmore ? (
        <View style={{margin:10}}>
          <ActivityIndicator size="large" color="white" />
        </View>
      ) : null;
    }, [loadingmore]);

    const getPostInfo = () => {

    }

    

    const onItemPress = useCallback(async(selection, item) => {

      if (selection === 'profile') {
        router.push({
          pathname:'/oppuserprofile',
          params:{uid:item.uid}
        });

      }else if (selection === 'post') {



        setLoadingPost(true)

        const userinfo = await getData('@profile_info')

        const ref = doc(db, `users/${item.postcreatorid}/posts/${item.postid}`);
        const document = await getDoc(ref);

        setLoadingPost(false);

        if (!document.exists()) {
          setLoadingPost(false);
          return;
        }
        

        console.log("info "+ JSON.stringify(document.data()))

      

        const origin = item.postcreatorid === userinfo.uid ? 'currentuserprofile' : 'notcurrentuserprofile'

        const updatedPost = {...document.data(),userinfo:userinfo,origin:origin}
        router.push({
          pathname: '/postpage',
          params: { data: encodeURIComponent(JSON.stringify(updatedPost)) }
        });
       
      }else {

        setSelectedcollectionInfo(item)
        setisFullWidthModalVisible(true)

      }

    });

     const onRefresh = useCallback(() => {
          setrefreshing(true);
          getIntitialUpdates();
      })

      const handleModalClose = () => {
        setisFullWidthModalVisible(false)
      }

      const renderItem = useCallback(
        ({ item,index }) => <UpdateItem prevItem={(index-1) > -1 ? updates[index - 1] : null} update={item} onItemPress={onItemPress}/>,
        [updates]
      );


      if (user?.isAnonymous) {
        return (
          <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
             <View style={[styles.container1, {backgroundColor:isDark ? "#121212" : "#F9F9F9"}]}>
          <View style={styles.content}>
            <Text style={[styles.title, {color:isDark ? 'white' : 'black'}]}>Join Us Today</Text>
            <Text style={styles.subtitle}>
              Create an account to unlock all features and get started
            </Text>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={signUp}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
             onPress={signIn}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Already have an account?</Text>
            </TouchableOpacity>
          </View>
        </View>
          </SafeAreaView>
        );
      }
      


  return (

    <SafeAreaView>

      <View style={{marginHorizontal:10}}>

       
            <Animated.FlatList
              bounces={true}
              style={{paddingTop:5}}
              keyExtractor={(subscriber) => subscriber.id}
              ListHeaderComponent={<View style={styles.imageContainer}>
              {/* Image */}
              <TouchableOpacity onPress={handleMessagingPress}>
                  <Image 
                    source={require('@/assets/icons/sendM.png')} 
                    style={{ width: 40, height: 40, tintColor:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main }} 
                    resizeMode="contain"
                  />
              </TouchableOpacity>
              
              {/* Badge */}
              {unreadCount > 0 && <View style={[
                  styles.badgeContainer,
                ]}>

                  <Text style={styles.badgeText}>{unreadCount}</Text>
                  
                </View>}
            </View>
            }
            
            
             
              refreshControl={<RefreshControl
                refreshing={isrefreshing}
                onRefresh={onRefresh}
              />}
              
              ListFooterComponent={() => (loadingmore ? <ActivityIndicator style={{marginBottom:3}} size="large" color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} /> : null)}
              onEndReachedThreshold={0.5}
              onEndReached={getMoreUpdates}
              
              renderItem={renderItem}
              data={updates}/>

              <Interactingusers
                  isVisible={isFullWidthModalVisible}
                  onClose={handleModalClose}
                  info={selectedcollectionInfo}
                />

              {(updates.length === 0 && !isrefreshing) && <Text style={{color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontSize:20,alignSelf:'center', position:'absolute',marginTop:100,fontFamily:'Lato'}}>No updates yet!</Text>}

              {isLoadingPost && <View style={{margin:10,alignContent:'center',alignSelf:'center', position:'absolute'}}>
                <ActivityIndicator style={{alignSelf:'center'}} size="large" color={colorScheme === 'dark' ? Colors.light_main: Colors.dark_main} />
              </View>}
    </View>
    </SafeAreaView>
  )
}

export default index

const styles = StyleSheet.create({
  container1: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    
   
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'gray',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: Colors.red_orange,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: Colors.red_orange,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  container: {
    height:'100%',
    marginTop:20,
    position:'relative'
    
  },imageContainer: {
    width: 50,
    alignSelf:'flex-end',
    marginEnd:10,
    marginTop:5,
    
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
})