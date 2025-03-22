import { StyleSheet, Text, View,TouchableOpacity,Image, FlatList,TextInput,Dimensions ,Pressable,Modal,Animated,TouchableWithoutFeedback,ActivityIndicator} from 'react-native'
import React,{useLayoutEffect, useState,useEffect,useRef,useMemo,useCallback} from 'react'

import { useNavigation,useLocalSearchParams, router } from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient'
import { Data } from '@/constants/Data';
import ChatItem from '@/components/ChatItem';

import { Colors } from '@/constants/Colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/constants/firebase';


import ScalablePressable from '@/components/ScalablePressable';
import moment from 'moment';
import { useSelector, useDispatch } from 'react-redux';

import { removeMessage } from '@/slices/requestmessageSlice';

import FloatingButton from '@/components/FloatingButton';

import ImageView from "react-native-image-viewing";
import { getData} from '@/constants/localstorage';
import { doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, getDoc, collection ,updateDoc,where, getDocs, limit, startAfter, writeBatch} from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { Linking } from 'react-native';
import { timeAgo } from '@/constants/timeAgo';
import { getLocation } from '@/constants/common';
import { useToast } from 'react-native-toast-notifications';

import { useColorScheme } from '@/hooks/useColorScheme';
import * as Clipboard from 'expo-clipboard';
import { setData } from '@/slices/dataChangeSlice';


const chatglobal = () => {

    const dispatch = useDispatch();
    const colorScheme = useColorScheme();

    const toast = useToast();

    function showToast (message){
      toast.show(message, {
        type: "normal",
        placement: "bottom",
        duration: 2000,
        offset: 30,
        animationType: "zoom-in",
      });
    };
    


   

    const [isChatAccepted ,setChatAccepted] = useState(null);

    const [imageViewerVisible, setimageViewerVisible] = useState(false);

    const [selectedImages, setselectedImages] = useState(null);
    const [isrequest,setisRequest] = useState(null);
    const [isInteracted,setInteracted] = useState(false);



    const { data } = useLocalSearchParams();

    const oppUser = JSON.parse(data);
    const isRequestaccepted = oppUser.requeststatus;

    //console.log("open " + JSON.stringify(oppUser))


   

    const [userInfo,setUserInfo] = useState();

    const getRequestState = async() => {

      
      const profileInfo = await getData('@profile_info');
      console.log(profileInfo.uid +" and " + JSON.stringify(oppUser.uid))
      const messageRef = doc(db,`users/${profileInfo.uid}/messages/${oppUser.uid}`);

      const snap = await getDoc(messageRef);

      if (snap.exists()) {
        const data = snap.data();
         // Set `isrequestaccepted` only if it exists in the data

         if (data.isrequestaccepted !== undefined) {
          setChatAccepted(data.isrequestaccepted);
          } else {
              setChatAccepted(true);
          }

          const isrequest = data.isrequest;
          setisRequest(isrequest);

      
      }else {
        setChatAccepted(true);
        setisRequest(false);
      }

      

    }

    

    

    

    useEffect(()=>{
      if (isRequestaccepted !== null) {
        setisRequest(oppUser.isrequest)

        console.log("is requesting "+oppUser.isrequest)
        
        setChatAccepted(isRequestaccepted);
      }else{
        console.log("running here")
        getRequestState();
      }

    },[])

    const navigation = useNavigation();

    const handleHeaderLeftPress = () =>{

      router.back();
    }

    const [hasStories,setHasstories] = useState(null)
    const [text,setText] = useState('')

    const [isTyping,setTyping] = useState(false);

    const [userLocation, setUserLocation] = useState(null
            );

    const [address,setAdress] = useState(null)  
    
  
    const [chats,setChats] = useState([])
    const flatListRef = useRef(null); 

    const [showDialog,setShowDialog] = useState(false)

    const [selectedItem,setSelectedItem] = useState(null)

    const [isReplying,setReplying] = useState(false)

    const [dialogType,setDialogType] = useState('popup')

    const [isBottomReached, setIsBottomReached] = useState(true);

    const [oppusertyping,setoppusertyping] = useState(null)

   



  
    const typingTimeoutRef = useRef(null);


    const handleTyping = async (inputText) => {
      setText(inputText);

      // Handle typing status for icon change
      if (inputText){
        setTyping(true)
      }else{setTyping(false)}

      if (!isInteracted) return;
  
      const oppMessageRef = doc(db,`users/${oppUser.uid}/messages/${userInfo.uid}`);
  
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
  
      if (inputText) {
        // Update Firebase that the user is typing
        await updateDoc(oppMessageRef, {typing:true});
  
        // Clear typing status after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(async () => {
          await updateDoc(oppMessageRef, {typing:false})
        }, 2000);
      } else {
        // If the input is cleared, update Firebase immediately
        await updateDoc(oppMessageRef, {typing:false})
      }
    };
  


    useEffect(() => {

      const fetchAddress = async () => {

        if (userLocation) {
          const coords = { latitude: userLocation.latitude, longitude: userLocation.longitude };
  
          // Perform reverse geocoding
          try {
            const [address] = await Location.reverseGeocodeAsync(coords);

            setAdress(address)

            console.log(address)
            
          } catch (error) {
            console.error("Error during reverse geocoding:", error);
          }
        }
      };
  
      fetchAddress();
    }, [userLocation]);


    const bottomSheetRef = useRef(null);
    const initialSnapIndex = -1;

    const handleLocationPress = useCallback(() => {
      bottomSheetRef.current?.snapToIndex(0);
    }, []);


    const [lastVisibleChat,setLastVisible] = useState(null);
    const isFirstSnapshot = useRef(true);

    useEffect(() => {
      isFirstSnapshot.current = true;
      // Set isFirstSnapshot to false after 3 seconds (adjust as needed)
      const timer = setTimeout(async() => {
          isFirstSnapshot.current = false;
          console.log("isFirstSnapshot set to false");
    
      }, 9000);

      // Clean up the timer on component unmount
      return () => clearTimeout(timer);
    }, []);

    const listenNewMessages = async (callback) => {

      const profileInfo = await getData('@profile_info');

      setUserInfo(profileInfo)
      const chatRef = collection(db, `users/${profileInfo.uid}/messages/${oppUser.uid}/chats`);
      const q = query(chatRef, orderBy('timestamp', 'desc'));

      const initialLoadquery = query(chatRef, orderBy('timestamp', 'desc'), limit(15));
      const initialSnapshot = await getDocs(initialLoadquery);

      const initialChats = initialSnapshot.docs.map(doc => ({
        ...doc.data(),
        status: 'sent',
    }));


    setLastVisible(initialSnapshot.docs[initialSnapshot.docs.length - 1]); // Save the last document
    callback(initialChats, true);


      // Real-time listener to detect new documents
      return onSnapshot(q, (snapshot) => {

          console.log("something changed")

          if (isFirstSnapshot.current) {
            console.log("is first time")
            return;
          }

          snapshot.docChanges().forEach((change) => {
              console.log("changed")
             callback(change.doc.data(),false,change.type);
          });
      });

    }


    const [oppuseronline,setoppuseronline] = useState(null);
    const [incomingMessage,setIncomingMessage] = useState(null)


    // chat listeners
    useEffect(() => {


      let unsubscribe;

      // Call the async function and set the unsubscribe function
      (async () => {
          unsubscribe = await listenNewMessages((messages,initial,type = null) => {
              setChats((prevChats) => {

                if (initial) {
                  return messages
                }else {


                  console.log("here")
                  const chatIndex = prevChats.findIndex(message => message.id === messages.id);

                  if (chatIndex > -1) { // Message is already in the list
                      // Replace the existing message without changing its position
                      console.log("replaced "+JSON.stringify(messages))
                      return prevChats.map((oldmessage, index) =>
                        index === chatIndex ? {...messages,status:'sent'} : oldmessage
                    );
                  } else {

                      if (type === 'added') {
                        console.log("added")
                        // New message not in the list, add it to the top
                        setIncomingMessage(messages)
                         return [{...messages,status:'sent'}, ...prevChats];
                      }else if (type === 'modified') {
                        console.log("modified")
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
    },[]);

   

    const listenTypingStatus = async (callback) => {

      const profileInfo = await getData('@profile_info');
      const chatRef = collection(db, `users/${profileInfo.uid}/messages`);
      const q = query(chatRef, where('id','==', oppUser.uid),);

      // Real-time listener to detect new documents
      return onSnapshot(q, (snapshot) => {

          if (snapshot.docs.length > 0 && isInteracted!== null) {
            setInteracted(true);
          }
          
          snapshot.docChanges().forEach((change) => {
            console.log("chat type "+change.type)
            callback(change.doc.data());
          });
      });

    }


    const [oppuserprofile,setnewoppuserprofile] = useState(null);
    


    // messagw doc listener
    useEffect(() => {
      let unsubscribe;
      // Call the async function and set the unsubscribe function
      (async () => {
          unsubscribe = await listenTypingStatus((newMessage) => {
            const typing = newMessage.typing;
            setoppusertyping(typing);
            setHasstories(newMessage.hasstories);

            setChatAccepted(newMessage.isrequestaccepted)
   
          });
      })();

      return () => {
          if (unsubscribe) unsubscribe();
      };
    },[]);

    useEffect(() => {

      const setReadMessage = async () => {
        if (!isInteracted || isInteracted === null)return;

        if (incomingMessage !== null) {
          const userinfo = await getData('@profile_info');

          if (userinfo.uid !== incomingMessage.receiverid) {
            return;
          }

        }

        const batch = writeBatch(db);
        const userinfo = await getData('@profile_info')

        const oppMessageRef = doc(db, `users/${oppUser.uid}/messages/${userinfo.uid}`);
        batch.update(oppMessageRef, {isoppread:true});

        const messageRef = doc(db, `users/${userinfo.uid}/messages/${oppUser.uid}`);
        batch.update(messageRef, {isread:true});

        try {
          await batch.commit();
          console.log("Batch operations committed successfully!");
        } catch (error) {
          console.error("Error committing batch operations:", error);
        }

      }

      setReadMessage();

    },[isInteracted,incomingMessage]);

    const [iscurrentUserBlocked,setBlockedCurrentUser] = useState(false)

    const listenOppuserOnlineStatus = async (callback) => {

      
      const userRef = collection(db, `users`);
      const q = query(userRef, where('uid','==', oppUser.uid.trim()));

      console.log("userid "+oppUser.uid)


      // Real-time listener to detect new documents
      return onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
              console.log("something changedd")
              callback(change.doc.data());
          });
      });

    }


    const [oppuserlastseen,setoppuserlastseen] = useState(null)


    // messagw doc listener
    useEffect(() => {
      let unsubscribe;
      // Call the async function and set the unsubscribe function
      (async () => {
          unsubscribe = await listenOppuserOnlineStatus(async (data) => {

            console.log("running")

            const online = data.isonline;
            setoppuseronline(online);

            setoppuserlastseen(data.lastactive);

            setnewoppuserprofile({profilephoto:data.profilephoto});

            const blockedusers = data.blockedusers;

            if (blockedusers) {
              const currentUserInfo = await getData('@profile_info')
              const isCurrentUserBlocked = blockedusers.some(user => user === currentUserInfo.uid);

              console.log("is user blocked ? "+isCurrentUserBlocked)

              setBlockedCurrentUser(isCurrentUserBlocked);
            }
          });
      })();

      return () => {
          if (unsubscribe) unsubscribe();
      };
    },[]);

    const handleProfilePress = () => {
      router.push({
        pathname: '/oppuserprofile',
        params: {uid:oppUser.uid}

      });
    }


    useLayoutEffect(() => {
        navigation.setOptions({
          headerLeft: () => (

            <View style={{flexDirection:'row',alignItems:'center'}}>

                <TouchableOpacity  onPress={handleHeaderLeftPress}>
                    
                    <Image
                    resizeMode="contain"
                    source={require('@/assets/icons/arrow.png')}
                    style={{ height: 20, tintColor: colorScheme === 'dark' ? Colors.light_main: Colors.dark_main, alignSelf: 'flex-end' }}
                    />

                </TouchableOpacity>


               <TouchableOpacity onPress={handleProfilePress}>

                 <View style={{flexDirection:'row',alignItems:'center'}}>

                 <LinearGradient
                    colors={['#FF7F50', '#FF6347', '#FF4500']} // Define your gradient colors here
                    style={!hasStories ?{width:30,height:30,borderRadius:15}:styles.gradient}
                    start={{ x: 0, y: 0 }} // Gradient start point (top-left)
                    end={{ x: 1, y: 1 }} // Gradient end point (bottom-right)
                >
                    <Image
                    resizeMode="cover"
                    source={oppuserprofile !== null ?{uri: oppuserprofile.profilephoto} :require('@/assets/icons/user.png')}
                    style={[styles.profileImage, !hasStories && {borderWidth:0} , {borderColor:colorScheme === 'dark' ? Colors.dark_main: Colors.light_main}] }
                    />

                </LinearGradient>

                <View style={{marginStart:10}}>

                  <View style={{flexDirection:"row",alignItems:"center"}}> 
                              
                              
                      <Text style={{fontSize:16,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}>{oppUser.username}</Text>
          
                      {(oppUser.verified )&& <Image
                                          resizeMode="contain"
                                          source={require('@/assets/icons/verified.png')}
                                          style={{height:15, width:15,marginStart:3}}
                                        />}
                              
                    </View>

                  

                  {oppuserlastseen !== null && <Text style={{fontSize:16,color:'gray'}}>{(oppusertyping!== null && oppusertyping) ? 'typing':(oppuseronline !== null && oppuseronline) ? 'online' : timeAgo(oppuserlastseen)}</Text>}

                </View>


                


                 </View>

               </TouchableOpacity>

            </View>
           
           
          ),
        });
      }, [navigation,oppuserlastseen,oppuseronline,oppusertyping,oppuserprofile,hasStories]);

      


      const snapPoinst = useMemo(() => ['45%'],[])

      const checkLocationPermission = async () =>{

        const location = await getLocation();

        if (location === null) {
          showToast("Location is required")
          return;
        }

        setUserLocation({ 
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,})
      

        bottomSheetRef.current?.snapToIndex(0);

      }

      const handleRegionChangeComplete = (region) => {
        setUserLocation(region);
      };




      const handleSendMessage = async (messageType = 'text', content = null) =>{

        const userInfo = await getData('@profile_info');

        const id = Math.random().toString(36).substr(2, 9);

        const newMessage = {
          id: id, // Unique ID
          timestamp:serverTimestamp(),
          status: 'sending',
          senderid: userInfo.uid,
          receiverid:oppUser.uid,
          messageType,
           ...(messageType === 'text' ? { message: text } :
            messageType === 'image' ?{ images: content } : {location:content}), // Simulated sender ID
        };

        if(isReplying){
          newMessage.mainmessage = {
            sendername:selectedItem.senderid === userInfo.uid ? userInfo.username:oppUser.username,
            ...(selectedItem.messageType === 'text' ? { message: selectedItem.message } :
              selectedItem.messageType === 'image' ?{ images: selectedItem.images } : {location:selectedItem.location}),
            messageType:selectedItem.messageType,
            id:selectedItem.id,
            ...(selectedItem.messageType === 'text' ? { message: selectedItem.message } :
            selectedItem.messageType === 'image' ? { image: selectedItem.images[0] } : {location:selectedItem.location})
          }
        }

        setChats((prevChats) => [newMessage, ...prevChats]);

        setTyping(false);

        setText('')

        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
        }, 100);

        setReplying(false);

        simulateSendMessage(newMessage,userInfo.uid)

      }

      const simulateSendMessage = async (newMessage,userid) => {

        if (isFirstSnapshot.current === true) {
            console.log("still loading")

            const timer = setTimeout(async() => {
              simulateSendMessage(newMessage,userid)
            }, 5000);

          return;
        }

        let urls = []

        if (newMessage.messageType === 'image') {



          for (const uri of newMessage.images) {

            const fileName = uri.split('/').pop(); // Get the file name from the URI
  
            const response = await fetch(uri);
  
            const storageRef = ref(storage, `uploads/images/${userInfo.uid}/${fileName}`);
  
            if(!response.ok){
              throw new Error("Failed")
            }
  
           const mediaBlob = await response.blob();
  
            // Create the upload task
            const uploadTask = uploadBytesResumable(storageRef, mediaBlob
                 // This assumes uri is in the correct format for upload
            );
  
            // Monitor the upload progress
            await new Promise((resolve, reject) => {
    
              uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                       
                        
                    },
                    (error) => {
                        console.error('Upload error:', error);
                        reject(error); // Reject the promise on error
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        urls.push(downloadURL); // Add the download URL to the list
                        resolve(); // Resolve the promise
                    }
                );
            });
          }
  

        }

    
        const chatRef = doc(db,`users/${userid}/messages/${oppUser.uid}/chats/${newMessage.id}`);

        await setDoc(chatRef,{...newMessage, ...(newMessage.messageType === 'image'? {images:urls} : {})});

        setChats((prevChats) =>
          prevChats.map((msg) =>
            msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
          )
        );

      
      };


      const pickImageAsync = async () => {

        let result = await ImagePicker.launchImageLibraryAsync({
          
          //mediaTypes: ImagePicker.MediaTypeOptions.All,
          quality: 1,
          allowsMultipleSelection:true
        });
    
        if (!result.canceled) {
           const selectedImages = result.assets.map((asset) => asset.uri);
           handleSendMessage('image', selectedImages);
        } 
      };


      const [selectionMode, setSelectionMode] = useState(false);

      const [textdeleteStatus,settextdeleteStatus] = useState('')


      const handleLongPress = async (item) => {

          if (item.isdeleted) return;

          const userinfo = await getData('@profile_info');

          if (userinfo.uid === item.senderid) {
            settextdeleteStatus("Delete for everyone")
          }else {
            settextdeleteStatus("Delete for you")
          }



          setReplying(false)
          setSelectedItem(item)
          setShowDialog(true)


          console.log(JSON.stringify(item))
      };

      const handlePress = (itemId) => {
        if (selectionMode) {
          toggleSelection(itemId);
        } else {
          // Handle normal press behavior when not in selection mode
        }
      };

      const toggleSelection = (itemId) => {
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === itemId ? { ...chat, selected: !chat.selected } : chat
          )
        );
      };



      const CustomDialog = ({ isVisible,onclose,children, ...rest}) => {

        const content = (

          <TouchableWithoutFeedback onPress={onclose}>

            <View style={{alignItems:'center',justifyContent:'center',flex:1,backgroundColor:'rgba(0, 0, 0, 0.5)'}}>

            {children}

            </View>

          </TouchableWithoutFeedback>
          
        )
   
      
        return (
          <Modal 
          visible={isVisible} 
          transparent
      
          statusBarTranslucent
          animationType='fade' 
          {...rest}
           >

            {content}
            
          </Modal>
        );
      };
      

      const handleCloseDialog = () => {
        setShowDialog(false);
      };
      

      const handleReply = () =>{
        setReplying(!isReplying)
        setShowDialog(false)
      }

      const scrollToChatItem = (chatId) => {
        const index = chats.findIndex((chat) => chat.id === chatId);
      
        if (index !== -1) {
          flatListRef.current?.scrollToIndex({ animated: true, index });

        }
      };


      const handleOnSendLocationPress = () =>{

        const location = {
          latitude:userLocation.latitude,
          longitude:userLocation.longitude,
          address:address.formattedAddress
        }
        handleSendMessage('location',location)

        bottomSheetRef.current?.close();

      }

      const deleteChatItem = useCallback(async () => {

        const userInfo = await getData('@profile_info')

        const batch = writeBatch(db); // Initialize the batch

        const chatRef = doc(db, `users/${userInfo.uid}/messages/${oppUser.uid}/chats/${selectedItem.id}`);
        const oppchatRef = doc(db, `users/${oppUser.uid}/messages/${userInfo.uid}/chats/${selectedItem.id}`);

        // Add the updates to the batch
        batch.update(chatRef, { isdeleted: true });

        if (selectedItem.senderid === userInfo.uid) {
          batch.update(oppchatRef, { isdeleted: true });
        }

        

        // Commit the batch
        try {
          await batch.commit();
          console.log('Batch update successful');
        } catch (error) {
          console.error('Error executing batch update:', error);
        }

        // setChats((prevChats) =>
        //   prevChats.map((chat) =>
        //     chat.id === selectedItem.id ? { ...chat, ...updatedChat } : chat
        //   )
        // )
        
        setShowDialog(false)
      },[selectedItem,oppUser]
     )
      

      const handleAcceptRequest = async () =>{

        setDialogType('loading')
        setShowDialog(true);

        const userInfo = await getData('@profile_info')

        const batch = writeBatch(db); // Initialize the batch

        const messageRef = doc(db, `users/${userInfo.uid}/messages/${oppUser.uid}`);
        const oppmessageRef = doc(db, `users/${oppUser.uid}/messages/${userInfo.uid}`);

        // Add the updates to the batch
        batch.update(messageRef, { isrequest: false });
        batch.update(oppmessageRef, { isrequestaccepted: true });

        // Commit the batch
        try {
          await batch.commit();
          console.log('Batch update successful');
        } catch (error) {
          console.error('Error executing batch update:', error);
        }

        setShowDialog(false)
        setDialogType('popup')
        setisRequest(false)

        
      }

    
      const scrollToBottom = () => {
        const index = 0
        flatListRef.current?.scrollToIndex({ animated: true, index});
      };

      const scrollY = useRef(new Animated.Value(0)).current;

      const viewabilityConfig = {
        itemVisiblePercentThreshold: 100, // 100% of the item must be visible
      };

      const onViewableItemsChanged = ({ viewableItems }) => {
        if (viewableItems.length > 0) {
          const lastItemVisible = viewableItems[0].index === 0; // First item in data (visually bottom item)
          setIsBottomReached(lastItemVisible);
        }
      };

      const openGoogleMaps = (latitude, longitude) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        Linking.openURL(url).catch(err => console.error("Error opening Google Maps", err));
      };

      const handleItemPress = (item) =>{

        if(item.messageType === "image"){
          const objectList = item.images.map(uri => ({ uri }));

          setselectedImages(objectList)

          setimageViewerVisible(true)

        }else if (item.messageType === "location"){

          openGoogleMaps(item.location.latitude,item.location.longitude)

        }

        
      }

      const [loadingmore,setLoadingMore] = useState(false);

      const loadMoreChats = async () => {
        console.log("loading more")

        if (loadingmore || !lastVisibleChat) return;

        setLoadingMore(true);
        const profileInfo = await getData('@profile_info');
        const chatRef = collection(db, `users/${profileInfo.uid}/messages/${oppUser.uid}/chats`);
        const q = query(chatRef, orderBy('timestamp', 'desc'), startAfter(lastVisibleChat), limit(10));

        const moreSnapshot = await getDocs(q);
        const moreChats = moreSnapshot.docs.map(doc => ({
            ...doc.data(),
            status: 'sent',
        }));
        
        // Update last visible document and prepend new chats to list
        setLastVisible(moreSnapshot.docs[moreSnapshot.docs.length - 1]);
        setChats((prevChats) => [...prevChats, ...moreChats]);
        setLoadingMore(false);
      }


      const handleBlockUser = useCallback(async() => {

          if (oppuserprofile === null) return;
      
          const batch = writeBatch(db);

          setDialogType('loading')
          setShowDialog(true);
      
        
      
          const oppuserinfo = {
            username:oppUser.username,
            uid:oppUser.uid,
            profilephoto:oppuserprofile.profilephoto
          }
      
          const currentuserprofile = await getData('@profile_info')
          const currentUserRef = doc(db, `users/${currentuserprofile.uid}/blockedusers/${oppUser.uid}`);
          batch.set(currentUserRef, oppuserinfo);
      
        
          const oppUserRef = doc(db, `users/${oppUser.uid}/blockers/${currentuserprofile.uid}`);
          batch.set(oppUserRef, currentuserprofile);
      
          try {
            await batch.commit();
            showToast("User blocked")
            dispatch(setData({id:oppUser.uid, intent:'blockuser'}));
      
          }catch(e){console.log("error blocking "+e)}

          router.back();
      
        },[oppuserprofile,oppUser]);


      const headerComponent = useCallback(() => {
        return loadingmore ? (
          <View style={{marginTop:10}}>
            <ActivityIndicator size="large" color="white" />
          </View>
        ) : null;
      }, [loadingmore]);

      const handleDelete = useCallback( async() => {

        setDialogType('loading')
        setShowDialog(true);

        const userInfo = await getData('@profile_info')

        const batch = writeBatch(db); // Initialize the batch

        const messageRef = doc(db, `users/${userInfo.uid}/messages/${oppUser.uid}`);
        //const oppmessageRef = doc(db, `users/${oppUser.uid}/messages/${userInfo.uid}`);

        // Add the updates to the batch
        batch.delete(messageRef);
        //batch.delete(oppmessageRef);

        // Commit the batch
        try {
          await batch.commit();
          console.log('Batch update successful');
        } catch (error) {
          console.error('Error executing batch update:', error);
        }

        router.back();

      },[oppUser]);


      const handleCopyText = useCallback(async() => {
        await Clipboard.setStringAsync(selectedItem.message);

        setShowDialog(false)
      },[selectedItem])

  

     
    return (

      <GestureHandlerRootView>

        <View style={{flex:1}}>

        <Animated.FlatList
        bounces={true}
        ref={flatListRef}
        onEndReached={loadMoreChats} // Trigger on scroll up for more messages
        onEndReachedThreshold={0.1}
        keyExtractor={(post) => post.id}
        ListFooterComponent={headerComponent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        scrollEventThrottle={16} 
        inverted
        renderItem={({item,index}) =>(


          <ScalablePressable
            item={item} // Pass selected state
            onReplySelect={scrollToChatItem}
            currentuserid={userInfo.uid}
            
            onPress={() => handleItemPress(item)}
            prevItem={(index + 1) < chats.length ? chats[index + 1] : null}
            onLongPress={() => handleLongPress(item)}
          />

          
        )}
        data={chats}/>

          {  isReplying &&
            <View style={{alignItems:'center'}}>

              <View style={{width:'100%',height:1,backgroundColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,marginBottom:10}}/>



              <View style={{flexDirection:'row',width:'90%',justifyContent:'space-between'}}>

              <View>

                <Text style={{fontSize:13,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,marginBottom:5}}>{selectedItem.senderid === userInfo.uid ? userInfo.username:oppUser.username}</Text>

                { 
                  selectedItem.messageType === 'text' ?

                  (<Text numberOfLines={1} style={{fontSize:13,color:'gray',marginBottom:5}}>{selectedItem.message}</Text>)

                  :selectedItem.messageType === 'image'? (<Image
                    style={{width:25,height:25,borderRadius:3,marginBottom:5}}
                    source={{uri:selectedItem.images[0]}}

                  />):(
                    <View style={{flexDirection:'row'}}>

                      <Image
                        style={{width:25,height:25,borderRadius:3,marginBottom:5,tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}
                        source={require('@/assets/icons/pin.png')}/>


                      <Text numberOfLines={1} style={{fontSize:13,color:'gray',marginBottom:5,marginStart:5}}>{selectedItem.location.address}</Text>


                    </View>
                  )
                }

              </View>


              <TouchableOpacity onPress={handleReply}>
                <Image
                      style={{width:15,height:15,borderRadius:3,tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}
                      source={require('@/assets/icons/cancel.png')}
                    />
              </TouchableOpacity>

              </View>

            </View>
          }


          {!isBottomReached && (
              <FloatingButton isVisible={!isBottomReached} onPress={scrollToBottom} />
          )}


         {
          (isChatAccepted !== null && isChatAccepted && !isrequest  && !iscurrentUserBlocked) ? 
            <View style={[styles.container, {backgroundColor:colorScheme === 'dark' ? Colors.dark_gray: Colors.light_main }]}>

              

              <TextInput
              onChangeText={handleTyping} 
              
              placeholderTextColor='gray' 
              value={text}
              placeholder='Write something..' 
              style={[styles.textInput, {color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}/>

              {!isTyping ? (
                  <View style={styles.iconsView}>
                    <TouchableOpacity onPress={pickImageAsync}>

                      <Image
                        style={[styles.inputIcons, {tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}
                        source={require('@/assets/icons/gallery.png')}
                      />

                    </TouchableOpacity>
                    

                    <TouchableOpacity onPress={checkLocationPermission}>
                      <Image
                        style={[styles.inputIcons, {tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}
                        source={require('@/assets/icons/location.png')}
                      />

                    </TouchableOpacity>
                    
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => handleSendMessage('text')}>
                    <Image
                      style={[styles.sendIcon, {tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}
                      source={require('@/assets/icons/send.png')}
                    />
                  </TouchableOpacity>
                )}

            </View> :

            (isChatAccepted !== null && (isrequest !== null && !isrequest) || iscurrentUserBlocked) ?

            <View style={{height:60,width:'100%'}}>

              <View style={{width:'100%',height:0.8,backgroundColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}/>

              <Text style={{fontSize:20,color:'gray',alignSelf:'center',marginTop:10}}>{iscurrentUserBlocked ? "Account restricted" : 'Request sent!'}</Text>

              
            </View> :

            (isrequest !== null && isrequest) ?  <View style={styles.requestContainer}>

            <Text style={{fontSize:20,color:'white',fontWeight:'bold'}}>{oppUser.username} wants to chat with you</Text>

            <Text style={{fontSize:15,color:'gray',textAlign:'center',marginTop:5}}>
              Do you want to receive messages from {oppUser.username} ? This user will only get to send more messages if you accept</Text>
            

            <View style={styles.buttonsContainer}>

              <TouchableOpacity onPress={handleBlockUser} style={styles.buttonContainer}>

                <Text style={{fontSize:20,color:'red'}}>Block</Text>

              </TouchableOpacity>

              <TouchableOpacity onPress={handleDelete} style={styles.buttonContainer}>

                <Text style={{fontSize:20,color:'red'}}>Delete</Text>

              </TouchableOpacity>

              <TouchableOpacity onPress={handleAcceptRequest} style={styles.buttonContainer}>

                <Text style={{fontSize:20,color:'white'}}>Accept</Text>

              </TouchableOpacity>



            </View>
          </View>: null
         }

        


        <BottomSheet  
            enablePanDownToClose={true} 
            ref={bottomSheetRef}
            index={initialSnapIndex}
            backgroundStyle={{backgroundColor:'#141414'}}
            handleIndicatorStyle={{backgroundColor:'#fff'}}
            snapPoints={snapPoinst}>

              <View>

                {userLocation && <View  style={{ height: 200,width:'100%' ,overflow:'hidden',alignItems:'center'}}>



                  <View style={{width:'100%',height:'100%',marginHorizontal:15,overflow:'hidden',flex:1,borderRadius:10}}>

                    <MapView
                    style={{ width:'90%',height:200,alignSelf:'center',marginHorizontal:10}}
                    initialRegion={userLocation}
                    provider="google"
                    googleMapsApiKey="AIzaSyAPiEb105W4642ElH_5ZXX2Lrjx_H-UIqQ"
                    onRegionChangeComplete={handleRegionChangeComplete}
                  
                      >


                  
                      
                      </MapView>


                  </View>
              

                <View style={styles.markerFixed}>

                    <Image
                        style={{height:40,width:40}}
                        source={require('@/assets/icons/markerpin.png')}
                      />
                          
                  </View>


                </View> }

                <View style={{flexDirection:'row',alignItems:'center',marginStart:15,marginTop:15}}>

                    <Image
                          style={{height:50,width:50,tintColor:Colors.blue}}
                          source={require('@/assets/icons/pin.png')}
                      />

                      <TouchableOpacity onPress={handleOnSendLocationPress} style={{marginStart:10}}>

                        <Text style={{fontSize:15,color:'white'}}>Send selected location</Text>

                        { address &&  <Text numberOfLines={1} style={{fontSize:15,color:'gray',marginTop:5}}>{address.formattedAddress}</Text>}

                      </TouchableOpacity>




                </View>

                



              </View>

          </BottomSheet>



        <CustomDialog onclose={handleCloseDialog}  isVisible={showDialog}>


          {
            dialogType === 'popup'?
            <View style={styles.dialog}>

            <TouchableOpacity onPress={handleReply}>

              <View  style={styles.modalSelection}>

                <Text style={{color:'white',margin:5,fontSize:20}}>Reply</Text>

                <Image style={{width:30,height:30,tintColor:'white'}} source={require('@/assets/icons/reply.png')}/>

              </View>

            </TouchableOpacity>

            {(selectedItem && selectedItem.messageType === 'text') && <TouchableOpacity onPress={handleCopyText}>

            <View  style={styles.modalSelection}>

              <Text style={{color:'white',margin:5,fontSize:20}}>Copy</Text>

              <Image style={{width:30,height:30,tintColor:'white'}} source={require('@/assets/icons/copy.png')}/>

            </View>

            </TouchableOpacity>}


            <TouchableOpacity onPress={deleteChatItem}>

            <View  style={styles.modalSelection}>

              <Text style={{color:'red',margin:5,fontSize:20}}>{textdeleteStatus}</Text>

              <Image style={{width:30,height:30,tintColor:'red'}} source={require('@/assets/icons/delete.png')}/>

            </View>

            </TouchableOpacity>
 
            
            </View>:

            <ActivityIndicator  size="large" color="white" />


          }

          
        </CustomDialog>

        <ImageView
          images={selectedImages}
          imageIndex={0}
          visible={imageViewerVisible}
          onRequestClose={() => setimageViewerVisible(false)}
        />



        </View>

      </GestureHandlerRootView>
       
    )
}

export default chatglobal

  const styles = StyleSheet.create({
    floatingButton: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      backgroundColor: 'blue',
      borderRadius: 25,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonContainer:{backgroundColor:'gray',
    padding:5,borderRadius:5,
    justifyContent:'center',paddingHorizontal:20},
    modalSelection:{

      flexDirection:'row',
      width:"80%",
      alignItems:'center',
      justifyContent:'space-between'
      ,marginTop:10

    },
    dialog:{
      shadowColor: 'gray', // Shadow color
      shadowOffset: { width: 0, height: 10 }, // Shadow offset
      shadowOpacity: 0.15, // Shadow opacity
      shadowRadius: 5, // Shadow radius
      elevation: 5, 
      width:'60%',height:180,
          backgroundColor:Colors.dark_gray,alignSelf:'center',
          justifyContent:'center',borderRadius:30,alignItems:'center'

    },
    markerFixed: {
      position: 'absolute',
      alignSelf:'center',
      top:'50%',
      marginTop:-40,
     
  
       // Half of the marker's height
    },
    iconsView: {
      padding: 10,
      flexDirection:'row',
    
      borderRadius: 5,
    },
    textInput: {
    
      padding: 10,
      marginRight: 10,
      flex: 1,
      borderRadius: 10,
      borderColor: 'white',
      shadowColor: 'gray',
    },
    selectedItem: {
      backgroundColor: 'rgba(0, 150, 250, 0.3)', // Light blue background for selected items
    },
    sendIcon: {
      width: 20,
      marginEnd:15,
      height: 20,
    },
    inputIcons:{
      width: 20,
      height: 20,
      marginHorizontal:8

    },
    requestContainer: {
      backgroundColor: Colors.dark_gray, // Replace with Colors.dark_gray if it's defined
      alignItems: 'center',
    },
    buttonsContainer:{
      flexDirection:'row',width:'100%',
      justifyContent:'space-evenly',
      alignItems:'center',
      marginTop:10,
      marginBottom:10

    },
    container: {
      height: 50,
      flexDirection: 'row',
      alignSelf: 'flex-end',
  
      alignItems: 'center',
    },
    profileImage: {
        width: 30,
        height: 30,
        alignSelf:'center',
        borderWidth:2,
        overflow:'hidden',
       
        borderRadius: 15,
       
      }, 


      gradient: {
        width: 37,
        height: 37,
        
        flexDirection:'column',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
      },
      item:{
        margin:10
      }
})