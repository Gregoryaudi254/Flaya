// BottomSheetViewers.js
import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator ,TouchableOpacity,Image} from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback , useEffect} from 'react';

import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { getDocs, collection ,query, orderBy, limit,startAfter} from 'firebase/firestore';
import Modal from 'react-native-modal';

import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';


const storybottomsheet = ({renderItem, activethread,isVisible, onClose}) => {

    const [replies, setReplies] = useState([])
    const [isRefreshing, setRefreshing] = useState(true);

    const colorScheme = useColorScheme()

    const [shouldLoadMore,setLoadMore] = useState(true)

    const fetchInitialReplies = useCallback(async (id) => {
        const userInfo = await getData('@profile_info');

        
        setRefreshing(true);

        console.log('active threadd '+id)

        try {
          const repliesRef = collection(db, `users/${userInfo.uid}/stories/${activethread.threadId}/replies`);
          const q = query(repliesRef, orderBy('createdAt', 'desc'), limit(15));
          const querySnapshot = await getDocs(q);
          const loadedComments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log("replies size "+ loadedComments.length);
          setReplies(loadedComments);

          setLoadMore(loadedComments.length > 10)
        } catch (error) {
          console.error('Error fetching initial replies:', error);
        } finally {
          setRefreshing(false);
        }
      }, [db,activethread]);


    useEffect(() => {
      if (isVisible) {
        setReplies([]);
        setRefreshing(true)
        fetchInitialReplies(activethread.threadId);
      }
      
      }, [isVisible]);

      const handleSheetChange = useCallback((index) => {
        if (index === -1) {
          setVisibility(false) // BottomSheet collapsed
        } else {
          setVisibility(true); // BottomSheet open
        }
      }, []);



       const [isloadingMore, setLoadingMore] = useState(false)


        const fetchMoreUsers = useCallback(async (lastUser) => {
         
          console.log("fetching")
          if (!lastUser || isloadingMore) return;
          setLoadingMore(true);
      
          
          const userinfo = await getData('@profile_info')
          try {
            const repliesRef = collection(db, `users/${userinfo.uid}/stories/${activethread.threadId}/replies`);
            const q = query(repliesRef, orderBy('createdAt', 'desc'), startAfter(lastUser.createdAt), limit(15));
            const querySnapshot = await getDocs(q);
            const moreUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReplies((prev) => [...prev, ...moreUsers]);
      
            console.log("size of users "+moreUsers.length);
      
            setLoadMore(moreUsers.length > 10)
          } catch (error) {
            console.error('Error fetching more replies:', error);
          } finally {
            setLoadingMore(false);
          }
        }, [db, isloadingMore, activethread]);

        const [isEndReachedCalled, setEndReachedCalled] = useState(false);

      const handleLoadMore = useCallback(() => {

        if (isEndReachedCalled || !shouldLoadMore || !isVisible) return;
        console.log("loading more")

        setEndReachedCalled(true)
        fetchMoreUsers(replies[replies.length - 1]).finally(() => {
          setTimeout(() => setEndReachedCalled(false), 1000); // Add a small delay to avoid re-triggers
        });

       

      },[replies,shouldLoadMore,isVisible,isEndReachedCalled]);


  return (
    <Modal isVisible={isVisible} onBackdropPress={onClose}>
          <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? Colors.dark_main : Colors.light_main , borderRadius:10}}>
            <TouchableOpacity onPress={onClose}>
              <Image style={{ width: 20, height: 20 , margin:15, tintColor: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main}} source={require('@/assets/icons/cancel.png')} />
            </TouchableOpacity>
    
            
            <Text style={{ fontSize: 20, fontWeight: 'bold', alignSelf: 'center', color: 'white' }}>
              Viewers
            </Text>
            {!isRefreshing ? <FlatList
              bounces
              keyExtractor={(viewer) => viewer.id}
              data={replies}
              renderItem={renderItem}
              refreshing={isRefreshing}
              scrollEventThrottle={16}
              onEndReachedThreshold={0.2}
              onRefresh={fetchInitialReplies}
              onEndReached={handleLoadMore}
              ListFooterComponent={() => (isloadingMore ? <ActivityIndicator size="large" color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} /> : null)}
              
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={21}
              removeClippedSubviews
            />: <ActivityIndicator size='large' color='white' style={{alignSelf:'center',marginTop:20}}/>}

            {replies.length < 1 && !isRefreshing && <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,position:'absolute',alignSelf:'center',marginTop:'50%'}}>No Viewers yet</Text>}
         
          </View>
        </Modal>
  );
};

export default storybottomsheet;
