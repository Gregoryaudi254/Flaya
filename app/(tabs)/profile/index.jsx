import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Image, Platform ,View, Text,TouchableOpacity,PanResponder,Animated,ActivityIndicator} from 'react-native';
import Gallery from '@/components/Gallery';
import Subscribers from '@/components/Subscribers';
import TagsComponent from '@/components/TagsComeponent';

import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient'
import { Linking } from 'react-native';

const Tab = createMaterialTopTabNavigator();

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import PullToRefresh from 'react-native-pull-to-refresh';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useSelector } from 'react-redux';


function TabScreens() {
  const colorScheme = useColorScheme();

  return (
    <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color }) => {
        let iconName;

        if (route.name === 'Gallery') {
          iconName = require('@/assets/icons/images.png');
        } else if (route.name === 'Subscribers') {
          iconName = require('@/assets/icons/subscribe.png');
        } else if (route.name === 'Tags') {
          iconName = require('@/assets/icons/user_tag.png');
        } 

        // You can return any component that you like here!
        return <Image source={iconName} style={{ width: 24, height: 24, tintColor: color }} />;
      },
      tabBarActiveTintColor: 'tomato',
      tabBarInactiveTintColor: 'gray',
      tabBarShowLabel:false,
      tabBarStyle: {
        backgroundColor: colorScheme === 'dark' ? 'black': 'white',
        elevation:0
      },
      tabBarIndicatorStyle: {
        backgroundColor: 'tomato',
      },
    })}
    >
      <Tab.Screen name="Gallery" component={Gallery} />
      <Tab.Screen name="Subscribers" component={Subscribers} />
      <Tab.Screen name="Tags" component={TagsComponent} />
    </Tab.Navigator>
  );
}

// Helper function to determine subscription status message
const getSubscriptionMessage = (userdata, monetizationInfo) => {
  // If the app is in free mode, return null (no message)
  if (monetizationInfo && monetizationInfo.isfree === true) {
    return null;
  }
  
  // If in grace period and user has no subscription
  if (monetizationInfo && monetizationInfo.isgraceperiod === true && !userdata.subscription) {
    return {
      message: `Subscription starting ${monetizationInfo.startDate} - Pay early`,
      type: "grace_period",
      color: "#4285F4"
    };
  }
  
  // Regular subscription alerts when monetization is active
  if (!userdata.subscription || (userdata.subscription.accountType === "normal" && userdata.isbusinessaccount === true)) {
    return {
      message: "Upgrade to a business subscription",
      type: "upgrade",
      color: "#FF6347"
    };
  }
  
  const now = new Date();
 
  const endDate = userdata.subscription.endDate?.toDate?.() || new Date(userdata.subscription.endDate) || new Date(0);

  // Get difference in milliseconds
  const diffMs = endDate - now;

  // Convert to days (rounded down)
  const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (daysLeft < 0) {
    // Subscription has ended
    return {
      message: "Your subscription has expired. Renew now",
      type: "expired",
      color: "#F44336"
    };
  } else if (daysLeft <= 5) {
    // 5 or fewer days remaining
    return {
      message: `${daysLeft} days left - Pay early`,
      type: "expiring_soon",
      color: "#FFA500"
    };
  }
  
  // Active subscription with more than 5 days left
  return null;
};


export default function ProfileScreen() {

  const [isrefreshing, setrefreshing] = useState(false);
  const [hasstories,sethasstories] = useState(true);
  const [monetizationInfo, setMonetizationInfo] = useState(null);

  const router = useRouter();

  const handlePress = () =>{
    router.push({
      pathname: '/(tabs)/profile/profileedit'
    });
  }

  const handleMenuPress = () =>{
    router.push({
      pathname: '/(tabs)/profile/settings'
    });
  }


  const [userdata,setuserdata] = useState(null)


  const getUserInfo = async () =>{
    const userInfo = await getData('@profile_info');

    if (userInfo === null) {
      return null;
    }

    const ref = doc(db, `users/${userInfo.uid}`);
    const snap = await getDoc(ref);
    
    // Get monetization info
    const infoRef = doc(db, "information/info");
    const infoSnap = await getDoc(infoRef);
    const monetizationData = infoSnap.exists() ? infoSnap.data() : null;
    
    // Format monetization start date if it exists
    if (monetizationData && monetizationData.monetizationinfo.monetizationStartDate) {
      const startDate = monetizationData.monetizationinfo.monetizationStartDate.toDate ? 
        monetizationData.monetizationinfo.monetizationStartDate.toDate() : 
        new Date(monetizationData.monetizationinfo.monetizationStartDate);
      
      monetizationData.monetizationinfo.startDate = startDate.toLocaleDateString();
    }
    
    setMonetizationInfo(monetizationData.monetizationinfo);

    console.log("monetizationData", JSON.stringify(monetizationData))
    
    return snap.data();
  }


  const getDataInfo = useCallback(async() => {
    const data = await getUserInfo();
    console.log(JSON.stringify(data))
    setuserdata(data);
  });

  const handleRefresh = () => {

    console.log("refresh status "+isrefreshing)

    if (isrefreshing) return;
    setrefreshing(true);

    console.log("isrefreshing")

    return new Promise(async(resolve) => {
      const data = await getUserInfo();
      
      setuserdata(data);
      setrefreshing(false)
      resolve();
    });
  };


  useEffect(() => {
    getDataInfo();
  },[]);


  const getFormatedString = (number) => {
    return (number || 0) < 1000 
    ? `${number || 0}` 
    : `${(number / 1000).toFixed(1)}k`

  }


  const handleStoryPress = useCallback(() => {
 
    if (userdata !== null && userdata.hasstories) {
      const data = {
        currentuser:true
      }
  
      router.push({
        pathname: '/story',
        params: { data: JSON.stringify(data) }
      });

    }

  },[userdata])

  const colorScheme = useColorScheme();

  const { value } = useSelector(state => state.data);
  
  useEffect(() => {
    if (value !== null && (value.intent === "accountchange" || value.intent === 'categorychange' || value.intent === 'accountinfochange' || value.intent === 'subscriptionchange')) {
      handleRefresh();
    }

    
  },[value])

  const handleSubscriptionPress = () => {
    router.push({
      pathname: '/subscriptionPage'
    });
  };


  return (

    <SafeAreaView style={{flex:1}}>

      <View style={{flex:1, backgroundColor:colorScheme === 'dark' ? Colors.dark_main : Colors.light_main}}>
          
    
        <PullToRefresh
          style={{flex:1}}
          onRefresh={handleRefresh}
          
           >

          {userdata !== null ? <View style={{width:'100%'}}>

            <View style={{flexDirection:'row',justifyContent:'space-between', alignItems:'center'}}>

              <View style={{flexDirection:'row',alignItems:'center',}} >
                {userdata.isbusinessaccount && 
                  (() => {
                    const subscriptionAlert = getSubscriptionMessage(userdata, monetizationInfo);
                    if (subscriptionAlert) {
                      return (
                        <TouchableOpacity 
                          style={[styles.subscriptionAlert, {backgroundColor: subscriptionAlert.color}]}
                          onPress={handleSubscriptionPress}
                        >
                          <Ionicons 
                            name={
                              subscriptionAlert.type === "upgrade" ? "arrow-up-circle" : 
                              subscriptionAlert.type === "expired" ? "refresh-circle" : 
                              subscriptionAlert.type === "grace_period" ? "information-circle" : "alarm"
                            }
                            size={18} 
                            color="white" 
                            style={styles.alertIcon}
                          />
                          <Text style={styles.alertText}>{subscriptionAlert.message}</Text>
                          <Ionicons name="chevron-forward" size={16} color="white" />
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })()
                }
              </View>

              <TouchableOpacity style={{alignSelf:'center',marginBottom:20,marginTop:20, marginEnd:10}} onPress={handleMenuPress} >
              <Ionicons 
                name="settings-outline"
                size={18} 
                color={colorScheme === 'dark' ? 'white' : 'black'}
                style={styles.alertIcon}/>
            </TouchableOpacity>

            </View>

          


            <View style={{flexDirection:'row',width:'100%',justifyContent:'space-evenly',marginStart:5}}>


            {userdata && <LinearGradient
              colors={['#FF7F50', '#FF6347', '#FF4500']} // Define your gradient colors here
              style={!userdata.hasstories ?{width:96,height:96,borderRadius:48,marginBottom:5}:styles.gradient}
              start={{ x: 0, y: 0 }} // Gradient start point (top-left)
              end={{ x: 1, y: 1 }} // Gradient end point (bottom-right)
              >

                  <TouchableOpacity onPress={handleStoryPress}>

                    <Image
                    resizeMode="cover"
                    source={{uri: userdata.profilephoto}}
                    style={[styles.profileImage, !hasstories && {borderWidth:0}, {borderColor:colorScheme === 'dark' ? Colors.dark_main: Colors.light_main}] }
                    />


                  </TouchableOpacity>
                  
            </LinearGradient>}

             
              <View style={{flex:1}}>

                <View  style={{flex:1,flexDirection:'row',justifyContent:'space-evenly'}}>

                  <View style={{}}>

                    <Text style={{fontSize:20,color:colorScheme === 'dark' ? 'white' : 'black'}}>{userdata.radius }m</Text>

                    <Text style={{fontSize:15,color:'gray'}}>Distance</Text>

                  </View>

                  <View style={{}}>

                    <Text style={{fontSize:20,color:colorScheme === 'dark' ? 'white' : 'black'}}>{getFormatedString(userdata.likes)}</Text>

                    <Text style={{fontSize:15,color:'gray'}}>Likes</Text>

                  </View>

                </View>

                {!userdata.isbusinessaccount && <TouchableOpacity style={{
                    backgroundColor:'gray', // Background color
                    padding: 5,           // Padding around the text
                    borderRadius: 5,
                    marginTop:15,
                    marginHorizontal:30,
                    height:40
                          // Rounded corners
                    }} onPress={handlePress}>
                      <Text style={styles.buttonText}>Edit profile</Text>
                  </TouchableOpacity>}

              {userdata.isbusinessaccount &&  <View style={{width:'100%',alignItems:'center'}}>

                  <View style={{flexDirection:'row'}} >

                    
                  <TouchableOpacity style={{
                    backgroundColor:'gray', // Background color
                    padding: 5,           // Padding around the text
                    borderRadius: 5,
                    marginHorizontal:10,
                    height:40
                          // Rounded corners
                    }} onPress={handlePress}>
                      <Text style={styles.buttonText}>Edit profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{
                    backgroundColor:'#FF6347', // Background color
                    padding: 5,                // Padding around the text
                    borderRadius: 5,
                    marginHorizontal:10,
                    height:40
                          // Rounded corners
                  }} onPress={() => {
                    router.push({
                      pathname: '/businessOrders'
                    });
                  }}>
                      <Text style={styles.buttonText}>Bookings/Orders</Text>
                  </TouchableOpacity>
                    
                  </View>



               
              </View>}


                

            

              </View>

              

            </View>

            <View style={{flexDirection:"row",alignItems:"center",marginTop:10,marginLeft:15,marginTop:15, marginEnd:15}}> 
            
            
                <Text style={{fontSize:20,color:colorScheme === 'dark' ? 'white' : 'black'}}>{userdata.username}</Text>
    
                {(userdata.verified)&& <Image
                                    resizeMode="contain"
                                    source={require('@/assets/icons/verified.png')}
                                    style={{height:25, width:25}}
                                  />}
                 {userdata.isbusinessaccount && <View style={styles.businessBadge}>
                    <Text style={styles.businessBadgeText}>Business</Text>
                  </View>}
            </View>

            {userdata.caption && <Text style={{fontSize:15,color:'gray',marginLeft:15,marginBottom:10,marginEnd:15}}>{userdata.caption}</Text>}

            {/* Business Account Information */}
            {userdata.isbusinessaccount && userdata.business && (
              <View style={styles.businessContainer}>
                <View style={styles.businessHeader}>
                  <Text style={[styles.businessTitle, {color: colorScheme === 'dark' ? 'white' : 'black'}]}>
                    {userdata.business.name || userdata.username}
                  </Text>
                 
                </View>
                
                {userdata.business.category && (
                  <View style={styles.businessInfoRow}>
                    {userdata.business.category.icon ? (
                      <Text style={styles.categoryEmoji}>{userdata.business.category.icon}</Text>
                    ) : (
                      <Image 
                        source={require('@/assets/icons/category.png')} 
                        style={[styles.businessIcon, {tintColor: colorScheme === 'dark' ? '#ccc' : '#666'}]} 
                      />
                    )}
                    <Text style={[styles.businessInfoText, {color: colorScheme === 'dark' ? '#ccc' : '#666'}]}>
                      {userdata.business.category.name || userdata.business.category}
                    </Text>
                  </View>
                )}
                
                {userdata.business.address && (
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
                      {userdata.business.address}
                    </Text>
                  </View>
                )}
                
                <View style={styles.divider} />
                
                <View style={styles.businessActions}>
                  <TouchableOpacity 
                    style={styles.businessActionButton}
                    onPress={() => {
                      if (userdata.business.phonenumber || userdata.business.email) {
                        // Handle contact logic
                        router.push({
                          pathname: '/businessContact',
                          params: { businessId: userdata.uid }
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
                      if (userdata.business.coordinates) {
                        // Handle directions logic
                        const { latitude, longitude } = userdata.business.coordinates;
                        const url = Platform.select({
                          ios: `maps:0,0?q=${latitude},${longitude}`,
                          android: `geo:0,0?q=${latitude},${longitude}`
                        });
                        
                        // Open maps app
                        Linking.openURL(url);
                      }
                    }}
                   >
                    <Image 
                      source={require('@/assets/icons/pinview.png')} 
                      style={styles.actionIcon} 
                    />
                    <Text style={styles.businessActionText}>Location</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View> :

          <ActivityIndicator style={{marginTop:20}} size="large" color={colorScheme === 'dark' ? 'white' : 'black'}/>}



           </PullToRefresh>

        


        <View style={[styles.titleContainer, {backgroundColor:colorScheme === 'dark' ? Colors.dark_main : Colors.light_main}]}>
            <TabScreens />
        </View>




      </View>

    </SafeAreaView>

    
   
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  container: { flex: 0.5 ,width: 100,
    height: 100},
  animatedView: {
    width: '100%',
    height: '100%', // Ensure it covers the full screen
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'lightgray',
    position: 'absolute',
    top: 0,
  },
  titleContainer: {

    backgroundColor:'blue',
    flex:2,
    
    flexDirection: 'row',
    height:200,
    
    
  },buttonText: {
    color: 'white',             // Text color
    fontSize: 16,               // Font size
    textAlign: 'center',        // Center the text
  },
  profileImage: {
    width: 100,
    height: 100,
    alignSelf:'center',
    borderWidth:3,
    overflow:'hidden',
    
    borderRadius: 50,
   
  },  gradient: {
    width: 106,
    height: 106,
    
    flexDirection:'column',
    borderRadius: 53,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessContainer: {
    marginHorizontal: 15,
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
  subscriptionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 15,
  },
  alertText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 8,
  },
  alertIcon: {
    marginRight: 4,
  },
});
