import { StyleSheet, Text, View,FlatList,TouchableOpacity ,Image,Dimensions, ActivityIndicator, RefreshControl, Platform, Linking} from 'react-native'
import React,{useCallback, useEffect, useMemo,useRef, useState} from 'react'

import { Data } from '@/constants/Data'
import ProfilePostItem from '@/components/ProfilePostItem'
import { SafeAreaView } from 'react-native-safe-area-context';
const numColumns = 2;

import { Colors } from '@/constants/Colors';


import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { doc, setDoc,GeoPoint,serverTimestamp, getDoc ,getDocs, query, orderBy, limit, collection, startAfter, deleteDoc, writeBatch} from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
const reports = ['Nudity or sexual activity','Scam or Fraud','Violence or self injury','False information','Child abuse']

import { useSelector } from 'react-redux';
import { useColorScheme } from '@/hooks/useColorScheme';
import ReportBottomSheet from '@/components/ReportBottomSheet';
import MemoizedBottomSheetUser from '@/components/MemoizedBottomSheetUser';
import OrderBookingBottomSheet from '@/components/OrderBookingBottomSheet';
import { useAuth } from '@/constants/AuthContext';

const oppuserprofile = () => {

  const { value } = useSelector(state => state.data);

  const colorScheme = useColorScheme();

    const router = useRouter();



    const bottomSheetRef = useRef(null);
    const reportbottomSheetRef = useRef(null);
    const orderBottomSheetRef = useRef(null);

    const initialSnapIndex = -1;

    const {uid} = useLocalSearchParams();

    const [isblocked,setblocked] = useState();

    const {user} = useAuth()

    const isUserAuthenticated = useCallback(async () => {
      const userinfo = await getData('@profile_info');
      console.log("Checking authenication")
      if (user.isAnonymous) {
        router.push('/signUp')
        return false;
      }
  
      if (!userinfo) {
        router.push('/usernameinput')
        return false;
      }
  
  
      return true;
    },[user])
  


    useEffect(() => {
      if (value !== null && value.intent === "blockuser") {
          if (value.id == uid) {
            setblocked(true)
          }
      }
    },[value])

    const [userInfo, setUserInfo] = useState(null);
    const [issubscribed,setsubscribed] = useState(null);
    const [isReportLoading,setReportLoading] = useState(false);

    const [isaccountprivate, setacountprivate] = useState(false);

    const [isoppuserblockedcurrentUser,setoppuserblockedcurrentUser] = useState(false);

    const [refreshing, setRefreshing] = useState(true);
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
    

    const getUserInfo = async () => {

        const ref = doc(db,`users/${uid}`);
        const userInfoSnap = await getDoc(ref);

        // Get view profile status of opp user
        const settings = userInfoSnap.data().settings;
        let profileviewstatus;

        if (settings) {
          profileviewstatus = settings.profileview;
        }


        if (profileviewstatus === "friends") {
          // check if opp use has subscribed

          const subscribeRef = doc(db, `users/${user.uid}/subsrcibers/${uid}`);
          const snap = await getDoc(subscribeRef);

          if (!snap.exists()) {
            setacountprivate(true);
          }

        }

        if (profileviewstatus === "no one") {
          setacountprivate(true);
        }

         // check if opp user has blocked this user
         const blockedUsers = userInfoSnap.data().blockedusers;

         if (blockedUsers) {
          const isCurrentUserBlocked = blockedUsers.some(blocked => blocked === user.uid);
          setoppuserblockedcurrentUser(isCurrentUserBlocked)
         }




        // check if current user has blocked this opp user
        const blockers = userInfoSnap.data().blockers;

        if (blockers) {
          const blockedTheUser = blockers.some(blockerid => blockerid === user.uid);
          setblocked(blockedTheUser);
        }

        setUserInfo(userInfoSnap.data());

        
        console.log("here "+userInfoSnap.data())

        setRefreshing(false);
    }

    const getSubscription = async () => {

      const ref = doc(db,`users/${uid}/subscribers/${user.uid}`);
      const snap = await getDoc(ref);

      console.log("getting subscribed "+snap.exists())

      setsubscribed(snap.exists());


    }

    useEffect(() => {
        getUserInfo();
        getSubscription();
    },[user])
  
    const handleMenuPress = async () =>{
        const authentication = await isUserAuthenticated();
        if (!authentication) return;
        bottomSheetRef.current?.snapToIndex(0);
    }

    // add to subscription
    const handleSuPbscribePress = async () =>{

      const authentication = await isUserAuthenticated();
      if (!authentication) return;

      const currentUserInfo = await getData('@profile_info')
      //check if is opp user is subscribed
      const ref = doc(db, `users/${uid}/subscribers/${currentUserInfo.uid}`);

      if (!issubscribed) {

        const currentuserinfo = {
          profilephoto:currentUserInfo.profilephoto,
          username:currentUserInfo.username,
          id:currentUserInfo.uid,
          createdAt:serverTimestamp()
        }
  
        await setDoc(ref, currentuserinfo);

      }else {
        await deleteDoc(ref);

      }
  
      setsubscribed(!issubscribed);

    }

    const [loading,setLoading] = useState(false)

    const handleBlockPress = async () =>{

          bottomSheetRef.current?.close();

 
          setLoading(true);

          const batch = writeBatch(db);

          const oppuserinfo = {
            username:userInfo.username,
            uid:userInfo.uid,
            profilephoto:userInfo.profilephoto
          }

          const currentuserprofile = await getData('@profile_info')
          const currentUserRef = doc(db, `users/${currentuserprofile.uid}/blockedusers/${userInfo.uid}`);
          batch.set(currentUserRef, oppuserinfo);

        
          const oppUserRef = doc(db, `users/${userInfo.uid}/blockers/${currentuserprofile.uid}`);
          batch.set(oppUserRef, currentuserprofile);

          try {
            batch.commit();
            setblocked(true)
          }catch(e){}

          setLoading(false);
    }


    const handleUnblockUser = async () => {

      if (isaccountprivate) return;

      setLoading(true);

      const batch = writeBatch(db);

      const currentuserprofile = await getData('@profile_info')
      const currentUserRef = doc(db, `users/${currentuserprofile.uid}/blockedusers/${userInfo.uid}`);
      batch.delete(currentUserRef);

    
      const oppUserRef = doc(db, `users/${userInfo.uid}/blockers/${currentuserprofile.uid}`);
      batch.delete(oppUserRef);

      try {
        batch.commit();
        setblocked(false)
      }catch(e){}

      setLoading(false);

    }


    console.log("opp user");


    const handleReportPress = () =>{
      setIsBottomSheetOpen(true)
      bottomSheetRef.current?.close();
    }


    const handleCLOSE = () =>{
        router.back()
    }


    const goToMessaging = async () => {

      const authentication = await isUserAuthenticated();
      if (!authentication) return;

      if (userInfo === null) return;
      
        router.push({
            pathname: '/chatglobal',
            params: { data:JSON.stringify({requeststatus:null,...userInfo}) }
          });
  
    }

    const getFormatedString = (number) => {
        return (number || 0) < 1000 
        ? `${number || 0}` 
        : `${(number / 1000).toFixed(1)}k`
    
      }

    const [lastVisiblePost,setLastVisible] = useState(null);
    const [posts,setPosts] = useState([]);

    const [postsLoaded, setPostsLoaded] = useState(false)

    const getPosts = useCallback(async () => {
     
      const postsRef = collection(db, `users/${uid}/posts`);
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

      setPostsLoaded(true);
    })


    useEffect(() => {
        getPosts();
    },[]);
    
    const handleMoveTags = () => {
      router.push({
        pathname:'/tagscomponent',
        params:{uid:uid}
      })
    }


     useEffect(() => {
        console.log("is opened "+isBottomSheetOpen)
        if (isBottomSheetOpen) {
          setTimeout(() => {
            reportbottomSheetRef.current?.snapToIndex(0)
          }, 600); // delay it by 100ms or adjust as needed
          reportbottomSheetRef.current?.snapToIndex(0)
         
        }
      }, [isBottomSheetOpen]);

       // Add new function to handle order/book button press
    const handleOrderBookPress = async () => {
      const authentication = await isUserAuthenticated();
      if (!authentication) return;
      if (userInfo && userInfo.isbusinessaccount) {
        orderBottomSheetRef.current?.snapToIndex(0);
      }
    };

    const listHeaderComponent = useMemo(
        () => (
          <View style={{ flexDirection: 'column', marginBottom: 10 ,flex:1}}>


            <View style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginStart:10}}>

                  <TouchableOpacity onPress={handleCLOSE} >
                   <Image style={{width:20,height:20,tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}} source={require('@/assets/icons/arrow.png')}></Image>
                  </TouchableOpacity>

                  <View style={{flexDirection:'row',alignItems:"center"}}>

                    <TouchableOpacity onPress={handleMoveTags} >
                      <Image style={{width:30,height:30,tintColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,marginEnd:10}} source={require('@/assets/icons/user_tag.png')}></Image>
                    </TouchableOpacity>

                    {(!isblocked && !isaccountprivate && !isoppuserblockedcurrentUser) && <TouchableOpacity style={{alignSelf:'flex-end',marginBottom:20,marginTop:20}} onPress={handleMenuPress} >
                          <Image
                              resizeMode="contain"
                              source={require('@/assets/icons/menu.png')}
                              style={{height:30,marginEnd:30, tintColor:'gray'}}
                              
                              />
                      </TouchableOpacity>}

                  </View>

                  

            </View>
            

          


            <View style={{flexDirection:'row',width:'100%',justifyContent:'space-evenly'}}>

                {userInfo !== null && <Image source={{uri:userInfo.profilephoto}} 
                style={{width:100,height:100,borderColor:'white',borderWidth:3,borderRadius:50,marginEnd:10,marginStart:20}} />}


                <View style={{flex:1}}>

                    <View  style={{flex:1,flexDirection:'row',justifyContent:'space-evenly'}}>

                        <View style={{}}>

                        <Text style={{fontSize:20,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}>{userInfo ? userInfo.radius : ""} m</Text>

                        <Text style={{fontSize:15,color:'gray'}}>Distance</Text>

                        </View>

                        <View style={{}}>

                        <Text style={{fontSize:20,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}>{userInfo ? getFormatedString(userInfo.likes) : 0}</Text>

                        <Text style={{fontSize:15,color:'gray'}}>Likes</Text>

                        </View>

                    </View>


                    {(isblocked !== null && !isblocked && !isaccountprivate && !isoppuserblockedcurrentUser) ?<View style={{flexDirection:'row',justifyContent:'space-evenly', marginHorizontal:30}}>

                      {issubscribed !== null && <TouchableOpacity style={{
                          backgroundColor:issubscribed ? Colors.dark_gray : Colors.blue, // Background color
                          padding: 5,                // Padding around the text
                          borderRadius: 5,
                          
                          height:40
                              // Rounded corners
                      }} onPress={handleSuPbscribePress}>
                          <Text style={styles.buttonText}>{issubscribed ? "subscribed" : "subscribe"}</Text>
                      </TouchableOpacity>}

                        <TouchableOpacity style={{
                            backgroundColor:'gray', // Background color
                            padding: 5,    
                            paddingHorizontal:20,
                            flexDirection:'row' ,           // Padding around the text
                            borderRadius: 5,
                            
                            height:40
                                // Rounded corners
                        }} onPress={goToMessaging}>
                            <Image source={require('@/assets/icons/sendM.png')} style={{width:20,height:20,tintColor:'white',alignSelf:'center'}}/>
                        </TouchableOpacity>


                    </View> : <TouchableOpacity  onPress={handleUnblockUser}>

                          <View style={{
                            backgroundColor:Colors.dark_gray,
                            padding: 5,                // Padding around the text
                            borderRadius: 5,
                            flexDirection:'row',
                            marginTop:10,
                            
                            alignSelf:'center',
                            width:150,
                            alignItems:'center'
                                // Rounded corners
                            }}>

                            <Image style={{tintColor:'red', width:20, height:20}} source={require('@/assets/icons/blocked.png')} />

                            <Text style={styles.buttonText}>{isaccountprivate ? 'This account is private' :isblocked ? 'Unblock user': 'account restricted'}</Text>

                          </View>

                          
                      </TouchableOpacity> }


                    

            

                </View>

                

            </View>

             <View style={{flexDirection:"row",alignItems:"center",marginTop:10}}> 
            
            
                        <Text style={{fontSize:20,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,marginLeft:20}}>{userInfo ? userInfo.username : ""}</Text>
            
                        {(userInfo && userInfo.verified )&& <Image
                                            resizeMode="contain"
                                            source={require('@/assets/icons/verified.png')}
                                            style={{height:20, width:20}}
                                          />}
            
             </View>

            {userInfo !== null && userInfo.caption && <Text style={{fontSize:15,color:'gray',marginLeft:15,marginBottom:10}}>{userInfo.caption}</Text>}

            {/* Business Account Information */}
            {userInfo && userInfo.isbusinessaccount && userInfo.business && (
              <View style={styles.businessContainer}>
                <View style={styles.businessHeader}>
                  <Text style={[styles.businessTitle, {color: colorScheme === 'dark' ? 'white' : 'black'}]}>
                    {userInfo.business.name || userInfo.username}
                  </Text>
                  <View style={styles.businessBadge}>
                    <Text style={styles.businessBadgeText}>Business</Text>
                  </View>
                </View>
                
                {userInfo.business.category && (
                  <View style={styles.businessInfoRow}>
                    {userInfo.business.category.icon ? (
                      <Text style={styles.categoryEmoji}>{userInfo.business.category.icon}</Text>
                    ) : (
                      <Image 
                        source={require('@/assets/icons/category.png')} 
                        style={[styles.businessIcon, {tintColor: colorScheme === 'dark' ? '#ccc' : '#666'}]} 
                      />
                    )}
                    <Text style={[styles.businessInfoText, {color: colorScheme === 'dark' ? '#ccc' : '#666'}]}>
                      {userInfo.business.category.name || userInfo.business.category}
                    </Text>
                  </View>
                )}
                
                {userInfo.business.address && (
                  <View style={styles.businessInfoRow}>
                    <Image 
                      source={require('@/assets/icons/location_outline.png')} 
                      style={[styles.businessIcon, {tintColor: colorScheme === 'dark' ? '#ccc' : '#666'}]} 
                    />
                    <Text 
                      style={[styles.businessInfoText, styles.addressText, {color: colorScheme === 'dark' ? '#ccc' : '#666'}]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {userInfo.business.address}
                    </Text>
                  </View>
                )}
                
                <View style={styles.divider} />
                
                <View style={styles.businessActions}>
                  <TouchableOpacity 
                    style={styles.businessActionButton}
                    onPress={() => {
                      if (userInfo.uid) {
                        router.push({
                          pathname: '/businessContact',
                          params: { businessId: userInfo.uid }
                        });
                      }
                    }}
                  >
                    <Image 
                      source={require('@/assets/icons/call.png')} 
                      style={styles.actionIcon} 
                    />
                    <Text style={styles.businessActionText}>Contact</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.businessActionButton}
                    onPress={() => {
                      if (userInfo.business.coordinates) {
                        const { latitude, longitude } = userInfo.business.coordinates;
                        const url = Platform.select({
                          ios: `maps:0,0?q=${latitude},${longitude}`,
                          android: `geo:0,0?q=${latitude},${longitude}`
                        });
                        
                        Linking.openURL(url);
                      }
                    }}
                  >
                    <Image 
                      source={require('@/assets/icons/pinview.png')} 
                      style={styles.actionIcon} 
                    />
                    <Text style={styles.businessActionText}>Directions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.businessActionButton}
                    onPress={handleOrderBookPress}
                  >
                    <Image 
                      source={require('@/assets/icons/order-food.png')} 
                      style={styles.actionIcon} 
                    />
                    <Text style={styles.businessActionText}>Order/Book </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        ),[userInfo,issubscribed, isblocked]
      );



      const snapPoins = useMemo(() => ['15%'],[]);

      const [loadingmore,setLoadingMore] = useState(false);

      const getMorePosts = useCallback(async () => {
        console.log("started loading")
        if (loadingmore || !lastVisiblePost || posts.length < 2) return;
        console.log("loading more")
        setLoadingMore(true);
      
        const chatRef = collection(db, `users/${uid}/posts`);
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
            <ActivityIndicator size="large" color={colorScheme === 'dark' ? Colors.light_main: Colors.dark_main} />
          </View>
        ) : null;
      }, [loadingmore]);

      const snapPoinst = useMemo(() => ['40%'],[]);


      const onReportPressed = useCallback(async(report) => {

        const profileinfo = await getData('@profile_info');
    
        setReportLoading(true);
    
        await setDoc(doc(db, `users/${uid}/reports`, profileinfo.uid), {
          report:report,
          reporterid:profileinfo.uid,
          createdAt: serverTimestamp() // Add a timestamp or any other required fields
        });
    
        setReportLoading(false);
    
        reportbottomSheetRef.current?.close();
      });


      const getNewInfo = () => {

        setRefreshing(true);

        getUserInfo();
        getSubscription();

        getPosts();
      }


      const handleBottomChanges = useCallback((index) => {
        console.log("changed bottomsheet");
        setIsBottomSheetOpen(index !== -1);
      }) 
    



  return (

    <SafeAreaView style={{flex:1}}>


        <GestureHandlerRootView>

        <View style={{flex:1}}>


            {userInfo === null || loading ?
             <ActivityIndicator style={{alignSelf:"center",marginTop:70}} size="large" color={colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}/>
             : userInfo !== null && <FlatList
              bounces={true}
              keyExtractor={(post) => post.id}
              numColumns={2}
              refreshControl={<RefreshControl
                refreshing={refreshing}
                onRefresh={getNewInfo}
              />}
              style={styles.container}
              ListHeaderComponent={listHeaderComponent}
              ListFooterComponent={footerComponent}
              onEndReachedThreshold={0.5}
              onEndReached={getMorePosts}
              renderItem={({item}) =>(
                <ProfilePostItem post={item} userinfo={userInfo} currentuserid={user.uid}/>  
              )}
              data={isblocked || isoppuserblockedcurrentUser || isaccountprivate ? [] : posts}/>
           }

           {(posts.length < 1 && !refreshing && !isblocked && !isoppuserblockedcurrentUser && !isaccountprivate && postsLoaded) &&
            <Text style={{color:colorScheme === 'dark' ? Colors.light_main : Colors.dark_main,position:'absolute',alignSelf:'center',marginTop:'70%'}}>No posts yet</Text>}


          {/* <BottomSheet  
            enablePanDownToClose={true} 
            ref={bottomSheetRef}
            index={initialSnapIndex}
            backgroundStyle={{backgroundColor:'gray'}}
            handleIndicatorStyle={{backgroundColor:'#fff'}}
            snapPoints={snapPoins}>

                <View style={{marginHorizontal:10}}>


                    <TouchableOpacity onPress={handleBlockPress} style={{flexDirection:'row'}} >
                        
                        <View style={styles.touchableView} >

                            <Image style={styles.icons} source={require('@/assets/icons/block.png')}/>

                           <Text style={styles.text}>Block</Text>

                        </View>

                    </TouchableOpacity>

                    <TouchableOpacity style={{flexDirection:'row'}} onPress={handleReportPress}>
                        <View style={styles.touchableView} >

                            <Image style={styles.icons} source={require('@/assets/icons/report.png')}/>

                           <Text style={styles.text}>Report</Text>

                        </View>

                    </TouchableOpacity>

                   


                </View>

            </BottomSheet> */}


            <MemoizedBottomSheetUser 
              bottomSheetRef={bottomSheetRef}
              initialSnapIndex={initialSnapIndex}
              snapPoins={snapPoins}
              handleBlockPress={handleBlockPress}
              handleReportPress={handleReportPress}
            />




            {isBottomSheetOpen && <ReportBottomSheet bottomSheetRef={reportbottomSheetRef}
              initialSnapIndex={initialSnapIndex} 
              snapPoints={snapPoinst}
              reports={reports}
              handleSheetChanges={handleBottomChanges}
              isReportLoading={isReportLoading} 
              onReportPressed={onReportPressed}  />}



            {/* <BottomSheet  
              enablePanDownToClose={true} 
              ref={reportbottomSheetRef}
              index={initialSnapIndex}
              backgroundStyle={{backgroundColor:'#141414'}}
              handleIndicatorStyle={{backgroundColor:'#fff'}}
              snapPoints={snapPoinst}>

              <BottomSheetView style={{flexDirection:'column'}}>

                <Text style={{fontSize:15,fontWeight:'bold',alignSelf:'center',color:'white'}}>Why are you reporting?</Text>
                {

                  isReportLoading ? <ActivityIndicator style={{alignSelf:'center',marginTop:20}} size="small" color="white"/>

                  :
                  reports.map((str, index) => (

                    <TouchableOpacity onPress={() => onReportPressed(str)}>

                      <Text key={index} style={{fontSize:14,color:'white',marginTop:15,marginStart:10}}>
                        {str}
                      </Text>

                    </TouchableOpacity>
                  ))
                }

              </BottomSheetView>


            </BottomSheet> */}

            {/* Order/Booking Bottom Sheet */}
            <OrderBookingBottomSheet 
              ref={orderBottomSheetRef}
              businessId={uid}
              businessName={userInfo?.business?.name || userInfo?.username}
            />

        </View>

        </GestureHandlerRootView>




        


        

    </SafeAreaView>
  )
    
}

export default oppuserprofile

const styles = StyleSheet.create({
    buttonText: {
        color: 'white',             // Text color
        fontSize: 16,  
        paddingHorizontal:10,             // Font size
        textAlign: 'center',        // Center the text
      },
      container: {
        flex: 1,
        marginTop:10,
       
      
        marginHorizontal:3
      },

      item: {
    
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        margin: 1,
        height: Dimensions.get('window').width / numColumns, // approximate a square
      },
      icons:{
        tintColor:'white',
        height:15,
        padding:5,
        width:15
    },
    text:{
        color:'#FF0000',fontSize:15,marginStart:10
      },
      touchableView:{
        flex:1,
        alignItems:'center',
        
       
        flexDirection:'row',
        marginVertical:10
      },
      businessContainer: {
        marginHorizontal: 10,
        marginTop: 10,
        marginBottom: 15,
        padding: 15,
        borderRadius: 8,
        backgroundColor: 'transparent',
      },
      businessHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
      },
      businessTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
      },
      businessBadge: {
        backgroundColor: Colors.blue,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
      },
      businessBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
      },
      businessInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
      },
      businessIcon: {
        width: 16,
        height: 16,
        marginRight: 8,
      },
      businessInfoText: {
        fontSize: 14,
        lineHeight: 20,
      },
      businessActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
      },
      businessActionButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.blue,
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginHorizontal: 4,
      },
      businessActionText: {
        color: Colors.blue,
        fontSize: 14,
        fontWeight: '600',
      },
      divider: {
        height: 0.5,
        backgroundColor: 'rgba(150, 150, 150, 0.2)',
        marginVertical: 10,
      },
      categoryEmoji: {
        fontSize: 18,
        marginRight: 8,
      },
      actionIcon: {
        width: 16,
        height: 16,
        marginRight: 6,
        tintColor: Colors.blue,
      },
      addressText: {
        flex: 1,
      },
})