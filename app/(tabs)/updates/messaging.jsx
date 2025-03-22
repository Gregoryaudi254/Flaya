import { StyleSheet, Text, View,Image,TouchableOpacity,FlatList,Switch ,ActivityIndicator } from 'react-native'
import React,{useLayoutEffect,useMemo,useRef,useState,useCallback,useEffect} from 'react'

import Primarymessages from '@/components/Primarymessages';
import Requestsmessaging from '@/components/Requestsmessaging';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
const Tab = createMaterialTopTabNavigator();
import {useNavigation} from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { Colors } from '@/constants/Colors';
import { Data } from '@/constants/Data';



import ActiveUsersItem from '@/components/ActiveUsersItem';
import { doc, setDoc,GeoPoint,serverTimestamp, where , onSnapshot, collection, updateDoc, query} from 'firebase/firestore'; 


import { getData, storeData } from '@/constants/localstorage';

import { getDistance } from 'geolib';

import { db } from '@/constants/firebase';
import { getDataBackend, getLocation, storeUserLocation } from '@/constants/common';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/useColorScheme';
import MemoizedBottomSheetMessageEdit from '@/components/MemoizedBottomSheetMessageEdit';


const CustomTabBar = React.memo(({ state, descriptors, navigation,counts }) => {
    return (
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
  
          const onPress = useCallback(() => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
  
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          });
  
          const onLongPress = useCallback(() => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          });
  
          return (
            <View
              key={route.key}
              style={[
                styles.tabItem, 
              ]}
            >
              <Text
                onPress={onPress}
                onLongPress={onLongPress}
                style={{ color: isFocused ? 'tomato' : 'gray' }}
              >
                {route.name}
              </Text>

 
              {counts[route.name] > 0 &&<View style={styles.circle}>
                  <Text style={styles.text}>{counts[route.name]}</Text>
                </View>}
            </View>
          );
        })}
      </View>
    );
  });

  const TabScreens = React.memo(() => {

    console.log("tab screens");


    const [counts, setCounts] = useState({ Primary: 0, Requests: 0 });
    const [profileInfo, setProfileInfo] = useState(null);

    useEffect(() => {

      if (profileInfo === null) return;
      // Define the reference to the collection
      const messagesRef = collection(db, `users/${profileInfo.uid}/messages`);
      
      // Create a query to filter unread messages
      const unreadMessagesQuery = query(messagesRef, where("isread", "==", false));
  
      // Set up the real-time listener
      const unsubscribe = onSnapshot(unreadMessagesQuery, (snapshot) => {
          // Initialize counters
        let requestTrueCount = 0;
        let requestFalseCount = 0;
  
        // Iterate through the documents
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isrequest === true) {
            requestTrueCount++;
          } else if (data.isrequest === false) {
            requestFalseCount++;
          }
        });

        console.log("requests :"+requestTrueCount+ " primary "+requestFalseCount)
  
        setCounts({ Primary: requestFalseCount, Requests: requestTrueCount })
      });
  
      // Clean up the listener on unmount
      return () => unsubscribe();
    }, [profileInfo]);


    useEffect(() => {
      const getInfo = async () => {
        const userInfo = await getData('@profile_info');
        setProfileInfo(userInfo);
      }

      getInfo();

    },[])
  
  
      return (
        <Tab.Navigator
        
        screenOptions={{
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: 'transparent',
            elevation: 0,
          },
          tabBarIndicatorStyle: {
            backgroundColor: 'transparent',
          },
        }}
        tabBar={(props) => <CustomTabBar {...props} counts={counts} />}
      
        >
          <Tab.Screen name="Primary" component={Primarymessages} />
          <Tab.Screen name="Requests" component={Requestsmessaging} />
        </Tab.Navigator>
      );
    })
  
  




const messaging = () => {
  const router = useRouter();

  const colorScheme = useColorScheme();

  const [showDistance,setShowDistance] = useState(false);
  const [showFlatList, setShowFlatList] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [profileInfo, setProfileInfo] = useState(null);
  const [isHorizontalFlatlistLoading,setHorizontalFlatlistLoading] = useState(false);
  //const [counts, setCounts] = useState({ Primary: 0, Requests: 0 });

  const navigation = useNavigation();

  const bottomSheetRef = useRef(null);
  const initialSnapIndex = -1;

  const handleHeaderRightPress = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  // useEffect(() => {

  //   if (profileInfo === null) return;
  //   // Define the reference to the collection
  //   const messagesRef = collection(db, `users/${profileInfo.uid}/messages`);
    
  //   // Create a query to filter unread messages
  //   const unreadMessagesQuery = query(messagesRef, where("isread", "==", false));

  //   // Set up the real-time listener
  //   const unsubscribe = onSnapshot(unreadMessagesQuery, (snapshot) => {
  //       // Initialize counters
  //     let requestTrueCount = 0;
  //     let requestFalseCount = 0;

  //     // Iterate through the documents
  //     snapshot.forEach((doc) => {
  //       const data = doc.data();
  //       if (data.isrequest === true) {
  //         requestTrueCount++;
  //       } else if (data.isrequest === false) {
  //         requestFalseCount++;
  //       }
  //     });

  //     setCounts({ Primary: requestFalseCount, Requests: requestTrueCount })
  //   });

  //   // Clean up the listener on unmount
  //   return () => unsubscribe();
  // }, [profileInfo]);


  

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
       
        <TouchableOpacity style={{ alignSelf: 'flex-end' }} onPress={handleHeaderRightPress}>

          <Image
            resizeMode="contain"
            source={require('@/assets/icons/control.png')}
            style={{ height: 20, tintColor: Colors.light_green, alignSelf: 'flex-end' }}
          />

      </TouchableOpacity>
      ),
    });
  }, [navigation]);


  const snapPoinst = useMemo(() => ['40%'],[]);
   
  


  const [location,setLocation] = useState();

  const [islocationaccepted,setlocationaccepted] = useState(null);


  
  const getUsersOnlineNearby = useCallback(async () => {

    let settings = await getData('@settings');
    const userInfo = await getData('@profile_info');
    setProfileInfo(userInfo);

    if (!settings) {
      settings = {
        onlinestatusarea:false
      }
    }

    setShowFlatList(settings.onlinestatusarea);

    await storeData('@settings', settings);

    console.log("getting users online nearby")
    if (!settings.onlinestatusarea) return;

    console.log("settings is on to show online users")

    setHorizontalFlatlistLoading(true);

    const currentLocation = await getLocation();
    setLocation(currentLocation)
    console.log("am here")

    if (currentLocation === null) {
      setlocationaccepted(false);
      setHorizontalFlatlistLoading(false);
      return;
    }

    setlocationaccepted(true);
    
    await storeUserLocation(currentLocation);

    const onlineUsers = await getDataBackend("getOnlineUsers", {id:userInfo.uid});

  
    if (onlineUsers.length > 0) {
      console.log('found users online')
      console.log(onlineUsers);
      setActiveUsers(onlineUsers);
    }

    setHorizontalFlatlistLoading(false);
  },[showDistance]) 
  

  useEffect(() => {
    getUsersOnlineNearby();
  }, []);


  const setOnlineAreaStatus = useCallback(async (status) => {

    const userInfo = await getData('@profile_info');
    const ref = doc(db,`users/${userInfo.uid}`);

    await updateDoc(ref,{isshowingonlinearea:status, isshowingdistance:showDistance});

  },[showDistance])
   


  const handleBottomPress = useCallback( async () =>{

    let settings = await getData('@settings');
    

    if (!settings) {
      settings = {} 
    }

    bottomSheetRef.current?.close();

  
    if (showFlatList) {
      settings.onlinestatusarea = false;
    }else {
      settings.onlinestatusarea = true;
    }

   
    await storeData('@settings', settings);

    getUsersOnlineNearby();

    setOnlineAreaStatus(settings.onlinestatusarea);

  },[showFlatList])
  

  const handleOnActiveUserPress = useCallback((item) => {
    const oppUserInfo = {
      username:item.username,
      uid:item.id,
      requeststatus:null
    }

    router.push({
      pathname: '/chatglobal',
      params: { data: JSON.stringify(oppUserInfo) }
    });
  })
   

  const renderItem = useCallback(
    ({ item }) => (

      <ActiveUsersItem activeUser={item} currentuserlocation={location} onPress={handleOnActiveUserPress}/>
     
    ),[location]
  );

 



  return (

    <GestureHandlerRootView>
      <View style={{flex:1,marginTop:10}}>


      {showFlatList && <View style={{alignItems:'center',flexDirection:'row', justifyContent:'space-between',marginHorizontal:10,marginBottom:10}}>
       
        <View style={{flexDirection:'row',alignItems:'center'}}>
          <Image style={{tintColor:Colors.light_green, width:25, height:25}} source={require('@/assets/icons/dot.png')}/>
          <Text style={{fontSize:15,color:'green',marginStart:3}}>Online</Text>
        </View>


        <TouchableOpacity style={{ alignSelf: 'flex-end' }} onPress={getUsersOnlineNearby}>

            <Image
              resizeMode="contain"
              source={require('@/assets/icons/exchange.png')}
              style={{ height: 20, tintColor: colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}
            />

          </TouchableOpacity>

      </View> }



      {
        islocationaccepted || (showFlatList!== null && !showFlatList) ? 


        showFlatList ? (
          isHorizontalFlatlistLoading ? (
            <ActivityIndicator size="large" color={colorScheme === 'dark' ? Colors.light_main: Colors.dark_main} />
          ) : (
            <View>

              <FlatList
                  bounces={true}
                  keyExtractor={(user) => user.id}
                
                  horizontal
                  renderItem={renderItem}
                  data={activeUsers}/>

            </View>

          )
        ) : null 


        : (showFlatList !== null && islocationaccepted !== null) && (<View style={{alignItems:'center'}}>

          <Text style={{color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main, fontSize:20}}>Location is required</Text>

          <TouchableOpacity onPress={getUsersOnlineNearby}>
            <View style={{flexDirection:'row', padding:10, borderRadius:10, backgroundColor:Colors.blue, alignItems:"center", marginTop:10}} >

              <Image style={{width:15, height:15, tintColor:'white'}} source={require('@/assets/icons/locationpermission.png')}/>
              <Text style={{color:"white", fontSize:15, marginStart:5}}>Give permission</Text>

            </View>
          </TouchableOpacity>


        </View>)
      }


        <View style={styles.tabContainer}>
            <TabScreens />  
        </View>


        <MemoizedBottomSheetMessageEdit
          bottomSheetRef={bottomSheetRef}
          initialSnapIndex={initialSnapIndex}
          snapPoints={snapPoinst}
          colorScheme={colorScheme}
          Colors={Colors}
          showFlatList={showFlatList}
          showDistance={showDistance}
          setShowDistance={setShowDistance}
          handleBottomPress={handleBottomPress}
        />


        {/* <BottomSheet  
            enablePanDownToClose={true} 
            ref={bottomSheetRef}
            index={initialSnapIndex}
            backgroundStyle={{backgroundColor:colorScheme === 'dark' ? '#141414' : Colors.light_main}}
            handleIndicatorStyle={{backgroundColor:colorScheme === 'dark' ? Colors.light_main: '#141414'}}
            snapPoints={snapPoinst}>

                <View style={{marginHorizontal:10,alignItems:'center',flex:1}}>

                   <Text 
                   style={{fontSize:20,fontWeight:'bold',color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}>
                    {
                    showFlatList ? 'Going offline?':
                    'See active users?'
                   }</Text>


                   <View style={{width:'100%',height:0.7,backgroundColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,marginTop:15,alignItems:'center'}} />


                   <Text 
                   style={[{fontSize:15,color:'gray',maxWidth:'70%',textAlign:'center',marginTop:15}, showFlatList && {flex:1}]}> {
                    showFlatList ? ' You will no longer see active users, and your profile will also be removed from the list of active users':
                    `You'll see active users in your area and also be visible to others. For privacy reasons, the displayed distance will never go below 100 meters.`
                   }
                   
                    </Text>



                     { !showFlatList && <View 
                    style={{width:'90%',justifyContent:'space-between',
                    flexDirection:'row',marginTop:15,flex:1,
                    alignItems:'center'}}>


                      

                      <Text 
                      style={{fontSize:15,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}>
                        Show your distance</Text>

                        <Switch  trackColor={{ false: 'gray', true: '#3897f0' }}
                          thumbColor={showDistance ? '#f4f3f4' : '#f4f3f4'}
                          value={showDistance} onValueChange={() => setShowDistance((previousState) => !previousState)}/>


                    </View>}

                    


                                
                    <TouchableOpacity
                         onPress={handleBottomPress}
                        
                        style={{
                            width: '100%',
                            height: 40,
                            marginBottom:5,
                           
                            alignSelf:'flex-end',
                            alignItems:'center',
                            borderRadius:5,
                            
                            backgroundColor:Colors.blue,
                            
                        }}
                      >
                
                        <View style={{flexDirection:'row',height:'100%'}}>
                
                          <Text style={{
                              color: 'white',
                              alignSelf:'center',
                              fontSize: 15
                          }}>  {showFlatList ? 'GO OFFLINE' : 'GO ONLINE'}
                          </Text>
                
                        </View>
                        
                    </TouchableOpacity>


                    

                   


                </View>

            </BottomSheet> */}


      </View>

    </GestureHandlerRootView>

    
  )
}

export default messaging

const styles = StyleSheet.create({

    container: {
      backgroundColor:'orange',
    
        marginTop:20,
        marginHorizontal:3
      },
    tabContainer:{
        flexDirection: 'row',
        flex:1
       
      
    }, screen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
      tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
       
        borderRadius: 25,
        marginHorizontal: 20,
        marginVertical: 10,
      },
      tabItem: {
        padding: 10,
        borderRadius: 5,
        backgroundColor: 'white',
        shadowColor: '#000',
        flexDirection:'row',
        alignItems:'center',
        paddingHorizontal:40,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        borderRadius: 5,
        shadowRadius: 2,
        elevation: 5,
      },
      tabItemFocused: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        borderRadius: 5,
        shadowRadius: 2,
        elevation: 5,
      },  
      circle: {
          width: 20, // Width of the circle
          height: 20,
          marginStart:3, // Height of the circle
          borderRadius: 5, // Half of the width/height to make it circular
          backgroundColor: 'tomato', // Background color
          justifyContent: 'center', // Center the text horizontally
          alignItems: 'center', // Center the text vertically
        },text: {
          color: 'white', // Text color
          fontSize: 10, // Text size
        },
})