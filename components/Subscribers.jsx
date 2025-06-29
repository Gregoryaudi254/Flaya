import { StyleSheet, Text, View,FlatList,Dimensions ,ActivityIndicator,RefreshControl} from 'react-native'
import React, { useState, useCallback,useEffect } from 'react'

import SubscribedItem from './SubscribedItem'


import { getData } from '@/constants/localstorage'

import { doc, setDoc,GeoPoint,serverTimestamp, getDoc ,getDocs, query, orderBy, limit, collection, startAfter, deleteDoc} from 'firebase/firestore';
import { db } from '@/constants/firebase'

import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const Subscribers = () => {

  const colorScheme = useColorScheme();
  const [loadingmore,setLoadingMore] = useState(false);
  const [isrefreshing, setrefreshing] = useState(true);
  const [subs,setSubs] = useState([]);
  const [userinfo, setUserInfo] = useState(null);
  const [lastVisiblePost,setLastVisible] = useState(null);


  const getSubs = useCallback(async () => {

    console.log("getting posts")

    const userInfo = await getData('@profile_info');

    if (userInfo === null || userInfo === undefined) return;
    setUserInfo(userInfo)  
    const subRef = collection(db, `users/${userInfo.uid}/subscribed`);
    const q = query(subRef, orderBy('createdAt', 'desc'), limit(20));
    const querySnapshot = await getDocs(q);

    // Map over messages and convert `stamp` to a date string
    const subs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
          ...data
      };
    });

    console.log(subs.length+ " length of posts")

    setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]); // Save the last document

    setSubs(subs);

    setrefreshing(false);
  })


  useEffect(() => {
      getSubs();
  },[]);

  const getMoreSubs = useCallback(async () => {
    console.log("started loading")
    if (loadingmore || !lastVisiblePost || subs.length < 2) return;
    console.log("loading more")
    setLoadingMore(true);
    const profileInfo = await getData('@profile_info');
    const subRef = collection(db, `users/${profileInfo.uid}/subscribed`);
    const q = query(subRef, orderBy('createdAt', 'desc'), startAfter(lastVisiblePost), limit(20));

    const moreSnapshot = await getDocs(q);
    const morePosts = moreSnapshot.docs.map(doc => ({
        ...doc.data(),
    }));
    
    // Update last visible document and prepend new chats to list
    setLastVisible(moreSnapshot.docs[moreSnapshot.docs.length - 1]);
    setSubs((prevSubs) => [...prevSubs, ...morePosts]);
    setLoadingMore(false);
  },[loadingmore,lastVisiblePost,subs]);

  const footerComponent = useCallback(() => {
    return loadingmore ? (
      <View style={{margin:10}}>
        <ActivityIndicator size="large" color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} />
      </View>
    ) : null;
  }, [loadingmore]);

  const onRefresh = useCallback(() => {
    setrefreshing(true);
    getSubs()
  })

 
  return (

  


          <View style={{flex:1, backgroundColor: colorScheme === 'dark' ? Colors.dark_main : Colors.light_main}}>

            {!isrefreshing  ? <FlatList
              bounces={true}
              keyExtractor={(sub) => sub.id}
             
              style={styles.container}
              refreshControl={<RefreshControl
                refreshing={isrefreshing}
                onRefresh={onRefresh}
              />}
              
              ListFooterComponent={footerComponent}
              onEndReachedThreshold={0.5}
              onEndReached={getMoreSubs}
              renderItem={({item}) =>(
                <SubscribedItem user={item}/>
                
              )}
              data={subs}/> :
              <ActivityIndicator style={{alignSelf:"center",marginTop:70}} size="large" color={colorScheme === 'dark' ?   Colors.light_main : Colors.dark_main}/>
            }

            {subs.length < 1 && !isrefreshing && <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,position:'absolute',alignSelf:'center',marginTop:'50%'}}>Subscriptions goes here</Text>}

            </View>

   
  )
}

export default Subscribers

const styles = StyleSheet.create({
  item:{
    flex:1
  },container: {
    flex:1,
    height:'100%',
  
   
    marginTop:20,
    marginHorizontal:3
  },
})