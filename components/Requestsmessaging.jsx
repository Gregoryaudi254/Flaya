import { StyleSheet, Text, View ,FlatList,Pressable,ActivityIndicator,TouchableOpacity,Image} from 'react-native'
import React ,{useRef,useState,useMemo,useCallback}from 'react'



import MessageItem from '@/components/MessageItem';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/Colors';

import { useRouter } from 'expo-router';

import { useSelector, useDispatch } from 'react-redux'
import { collection, getDocs ,query ,orderBy, where,limit, onSnapshot,startAfter, deleteDoc, updateDoc, doc,writeBatch} from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';

//import { setMessages } from '@/slices/primaryMessagesSlice';
import { useEffect } from 'react';


import { useColorScheme } from '@/hooks/useColorScheme';
import Dialog from '@/components/CustomDialog';

import { setData } from '@/slices/dataChangeSlice';
import { useToast } from 'react-native-toast-notifications';
import { getDefaultReturnUrl } from 'expo-auth-session';
import MemoizedBottomSheetMessaging from './MemoizedBottomSheetMessaging';
import MemoizedDialog from './MemoizedDialog';



const Requestmessages = () => {

  const colorScheme = useColorScheme();
  const dispatch = useDispatch();

  const router = useRouter();

  const bottomSheetRef = useRef(null);
  const initialSnapIndex = -1;

  const [selectedMessage,setSelectedMessage] = useState({});


 // const dispatch = useDispatch();


 // const list = useSelector(state => state.messages.messages);

  const [messages,setMessages] = useState([]);

  const [userInfo,setUserInfo] = useState();

  const [lastVisibleMessage,setLastVisible] = useState(null);
  const isFirstSnapshot = useRef(true);

   const [dialog,setDialog] = useState(false);



  useEffect(() => {
    // Set isFirstSnapshot to false after 3 seconds (adjust as needed)
    const timer = setTimeout(() => {
        isFirstSnapshot.current = false;
        console.log("isFirstSnapshot set to false");
    }, 10000);

    // Clean up the timer on component unmount
    return () => clearTimeout(timer);
}, []);

  const [initialLoad, setInitialLoad] = useState(true);
  const [shouldLoadMore, setShouldLoadMore] = useState(true);

  const getMessages = async (callback) => {

    const userInfo = await getData('@profile_info');

    setUserInfo(userInfo)

    try{
      const messagesRef = collection(db, `users/${userInfo.uid}/messages`);
      const q = query(messagesRef, where('isrequest', '==', true), orderBy('stamp', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);

      // Map over messages and convert `stamp` to a date string
      const messages = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data
        };
      });

      setShouldLoadMore(messages.length > 11);

      console.log("snap "+querySnapshot.docs[querySnapshot.docs.length - 1])

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]); // Save the last document

      callback(messages,true);
      const listenerq = query(messagesRef, where('isrequest', '==', true), orderBy('stamp', 'desc'));

      setInitialLoad(false);
  
      // Real-time listener to detect new documents
      return onSnapshot(listenerq, (snapshot) => {

        console.log("we hear")

        if (isFirstSnapshot.current) {
          console.log("not run")
          return;
        }

        snapshot.docChanges().forEach((change) => {
          console.log(change.type+" changed "+JSON.stringify(change.doc.data()))
          callback(change.doc.data(),false,change.type);
        });
        
    });

    }catch(e){
      console.log(e)

    }


  }

  useEffect(() => {
    let unsubscribe;

    // Call the async function and set the unsubscribe function
    (async () => {
        unsubscribe = await getMessages((messages, isInitial,type = null) => {
            setMessages((prevChats) => {
                if (isInitial) {
                    return messages; // Set the initial 30 messages
                } else {
                  const messageIndex = prevChats.findIndex(message => message.id === messages.id);

                  if (messageIndex > -1) { // Message is already in the list
                      const existingMessage = prevChats[messageIndex];
                      
                      // Check if timestamp has changed
                      if (existingMessage.stamp.toMillis() !== messages.stamp.toMillis()) {
                          // Remove the old message and add the new one at the top
                          const updatedChats = [...prevChats];
                          updatedChats.splice(messageIndex, 1);
                          return [ messages, ...updatedChats];

                      } else {

                           if (type === "removed") {

                            console.log("removed")

                            const updatedChats = [...prevChats];
                            updatedChats.splice(messageIndex, 1);
                            return updatedChats;

                           } else {
                            // Replace the existing message without changing its position
                           return prevChats.map((oldmessage, index) =>
                            index === messageIndex ? messages : oldmessage
                            );

                           }
                          
                      }
                  } else {

                    if (type === 'added') {
                       // New message not in the list, add it to the top
                       const existingIds = new Set(prevChats.map(message => message.id));
                     
                       // Avoid creating a new array if there's no change
                       if (existingIds.has(messages.id)) {
                         console.log("message exists")
                         return prevChats;
                       }
                        // New message not in the list, add it to the top
                        return [messages, ...prevChats];
                     
                    }else if (type === 'modified') {
                      return prevChats;
                    }
               
                     
                  }


                    
              }
            });
        });
    })();

    return () => {
        if (unsubscribe) unsubscribe();
    };
}, []);




  const handleLongPress = (item) => {
    setSelectedMessage(item)
    bottomSheetRef.current?.snapToIndex(0); 
  };

  const snapPoinst = useMemo(() => ['50%'],[])

  const handleMessagePress = (item) =>{

    console.log("stra " + item.isrequest);

    isFirstSnapshot.current = false;
    
    const oppUserInfo = {
      username:item.username,
      profilephoto:item.photo,
      uid:item.id,
      requeststatus:item.isrequestaccepted,
      isrequest:item.isrequest

    }

    router.push({
      pathname: '/chatglobal',
      params: { data: JSON.stringify(oppUserInfo) }
    });

  }

  const renderItem = useCallback(
    ({ item }) => (

      <Pressable
        onLongPress={()=>handleLongPress(item)}
        onPress={() =>handleMessagePress(item)}
      
        style={({ pressed }) => [
          pressed && { opacity: 1 }, // Maintain opacity during press
        ]}
        > 
        <MessageItem message={item} currentuserid={userInfo.uid} page={'primary'}/>
        </Pressable>
     
    )
  );

  const [loadingmore,setLoadingMore] = useState(false);

  const loadMoreMessage = useCallback(async () => {

   

    if (loadingmore || !lastVisibleMessage) return;
    setLoadingMore(true);
    const profileInfo = await getData('@profile_info');
    const chatRef = collection(db, `users/${profileInfo.uid}/messages`);
    const q = query(chatRef, where('isrequest', '==', true), orderBy('stamp', 'desc'), startAfter(lastVisibleMessage), limit(20));

    const moreSnapshot = await getDocs(q);
    const moreMessages = moreSnapshot.docs.map(doc => ({
        ...doc.data(),
    }));

    setShouldLoadMore(moreMessages > 11);
    
    // Update last visible document and prepend new chats to list
    setLastVisible(moreSnapshot.docs[moreSnapshot.docs.length - 1]);
    setMessages((prevMessages) => {
      const existingIds = new Set(prevMessages.map(message => message.id));
      const newMessages = moreMessages.filter(message => !existingIds.has(message.id));
    
      // Avoid creating a new array if there's no change
      if (newMessages.length === 0) {
        console.log("going here")
        return prevMessages;
      }

      return [...prevMessages, ...newMessages]});
   
    setLoadingMore(false);

  },[loadingmore,lastVisibleMessage]);


  const footerComponent = useCallback(() => {
    return loadingmore ? (
      <View style={{margin:10}}>
        <ActivityIndicator size="large" color="white" />
      </View>
    ) : null;
  }, [loadingmore]);


  const handleMarkAsRead =  async () => {

    const userInfo = await getData('@profile_info');

    const batch = writeBatch(db);

    const messageRef = doc(db, `users/${userInfo.uid}/messages/${selectedMessage.id}`);
    batch.update(messageRef,{isread:true})

    const oppmessageRef = doc(db, `users/${selectedMessage.id}/messages/${userInfo.uid}`);
    batch.update(oppmessageRef,{isoppread:true})

    // Commit the batch
    try {
      await batch.commit();
      console.log('Batch update successful');
    } catch (error) {
      console.error('Error executing batch update:', error);
    }

    bottomSheetRef.current?.close();
  }

  const handleDelete = useCallback(async () => {

    const userInfo = await getData('@profile_info');

    const messageRef = doc(db, `users/${userInfo.uid}/messages/${selectedMessage.id}`);

    await deleteDoc(messageRef);

    bottomSheetRef.current?.close();
  })

  const handleBlock = useCallback(async () => {
    bottomSheetRef.current?.close();
    setDialog(true);
  })

  const handleBlockUserConfirmation = useCallback(async() => {
  
        console.log("going hee")
    
        const batch = writeBatch(db);
    
        setDialog(false);
    
        const oppuserinfo = {
          username:selectedMessage.username,
          uid:selectedMessage.id,
          profilephoto:selectedMessage.photo
        }
    
        const currentuserprofile = await getData('@profile_info')
        const currentUserRef = doc(db, `users/${currentuserprofile.uid}/blockedusers/${selectedMessage.id}`);
        batch.set(currentUserRef, oppuserinfo);
    
      
        const oppUserRef = doc(db, `users/${selectedMessage.id}/blockers/${currentuserprofile.uid}`);
        batch.set(oppUserRef, currentuserprofile);
    
        try {
          await batch.commit();
    
          showToast("User blocked")
  
  
          dispatch(setData({id:selectedMessage.id, intent:'blockuser'}));
    
        
        }catch(e){console.log("error blocking "+e)}
    
    });
  
      const toast = useToast();
  
      function showToast(message){
        toast.show(message, {
          type: "normal",
          placement: "bottom",
          duration: 2000,
          offset: 30,
          animationType: "zoom-in",
        });
      };

  return (
    <View>
      <FlatList
            bounces={true}
            keyExtractor={(message) => message.id}
            style={styles.container}
            onEndReached={loadMoreMessage}
            onEndReachedThreshold={0.1}
            renderItem={renderItem}
            ListFooterComponent={footerComponent}
            data={messages}/>


            {messages.length < 1 && !initialLoad && <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,position:'absolute',alignSelf:'center',marginTop:'50%'}}>No requests yet</Text>}

            <MemoizedBottomSheetMessaging 
              selectedMessage={selectedMessage}
              initialSnapIndex={initialSnapIndex}
              snapPoinst={snapPoinst}
              bottomSheetRef={bottomSheetRef}
              handleMarkAsRead={handleMarkAsRead}
              handleDelete={handleDelete}
              handleBlock={handleBlock}
            />


            {dialog && <MemoizedDialog 
                dialog={dialog} 
                setDialog={setDialog}
                handleBlockUserConfirmation={handleBlockUserConfirmation} 
                blockinguserinfo={{postcreatorimage:selectedMessage.photo, postcreatorusername:selectedMessage.username}} 
              />}

              {initialLoad && <ActivityIndicator size='large' color={colorScheme === 'dark' ? Colors.light_main : Colors.dark_main} style={{alignSelf:'center' ,marginTop:'40%', position:'absolute'}} />}

            {/* <BottomSheet  
            enablePanDownToClose={true} 
            ref={bottomSheetRef}
            index={initialSnapIndex}
            backgroundStyle={{backgroundColor:Colors.dark_gray}}
            handleIndicatorStyle={{backgroundColor:'#fff'}}
            snapPoints={snapPoinst}>

              <View style={{margin:10}}>
                <Text style={{fontSize:20,color:'white',fontWeight:'bold',alignSelf:'center',marginBottom:10}}>
                  {selectedMessage && selectedMessage.username}
                </Text>

                <View style={{width:'100%',height:1,backgroundColor:'white'}}/>

                {(selectedMessage!== null && !selectedMessage.isread) && <TouchableOpacity onPress={handleMarkAsRead}>
                  <Text style={{fontSize:20,color:'white',marginTop:10}}>
                    Mark as read
                  </Text>
                </TouchableOpacity>}

                <TouchableOpacity onPress={handleDelete}>
                  <Text style={{fontSize:20,color:'white',marginTop:10}}>
                    Delete
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleBlock}>
                  <Text style={{fontSize:20,color:'red',marginTop:10}}>
                    Block
                  </Text>
                </TouchableOpacity>
                

              </View>

                

            </BottomSheet> */}

            {/* <Dialog onclose={() => setDialog(false)}  isVisible={dialog}>

              <View style={{padding:10,backgroundColor:Colors.dark_gray,borderRadius:10}}>

                <View style={{flexDirection:'row',alignItems:'center'}}>

                  <Image
                    source={{ uri: selectedMessage.photo || getDefaultReturnUrl }}
                    style={styles.profileImage}
                  />

                  <Text style={{color:'white',fontSize:20,marginStart:3}}>{selectedMessage.username  || 'user'}</Text>


                </View>


                <Text style={{color:'white',margin:5,fontSize:20,marginBottom:15}}>Proceed to block user?</Text>


                <View style={{flexDirection:"row"}}>

                  <TouchableOpacity onPress={handleBlockUserConfirmation}>

                    <View  style={{flexDirection:'row'}}>

                      <Image style={{width:30,height:30,tintColor:'red'}} source={require('@/assets/icons/block.png')}/>

                      <Text style={{color:'red',fontSize:20}}>Proceed</Text>

                    </View>

                  </TouchableOpacity>

                  <Text style={{flex:1}}></Text>

                  <TouchableOpacity  onPress={() => setDialog(false)}>

                  <Text style={{color:'white',fontSize:20}}>Cancel</Text>

                  </TouchableOpacity>



                </View>


                


                </View>

          </Dialog> */}
    </View>
  )
}

export default React.memo(Requestmessages);



const styles = StyleSheet.create({
    container: {
       
       
        height:'100%',
      
       
       
        marginHorizontal:3
      },
      profileImage: {
        width: 50,
        height: 50,
        borderColor: 'white',
        borderWidth: 3,
        borderRadius: 25,
        marginEnd: 10,
      }
})