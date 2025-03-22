import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Image, Platform ,View, Text,TouchableOpacity,PanResponder,Animated,ActivityIndicator} from 'react-native';
import Gallery from '@/components/Gallery';
import Subscribers from '@/components/Subscribers';
import TagsComponent from '@/components/TagsComeponent';

import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient'

const Tab = createMaterialTopTabNavigator();

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import PullToRefresh from 'react-native-pull-to-refresh';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

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



export default function ProfileScreen() {

  const [isrefreshing, setrefreshing] = useState(false);
  const [hasstories,sethasstories] = useState(true);

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

    const ref = doc(db, `users/${userInfo.uid}`);

    const snap = await getDoc(ref);

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



  return (

    <SafeAreaView style={{flex:1}}>

      <View style={{flex:1}}>
          
    
        <PullToRefresh
          style={{flex:1}}
          onRefresh={handleRefresh}
          
           >

          {userdata !== null ? <View style={{width:'100%'}}>

          <TouchableOpacity style={{alignSelf:'flex-end',marginBottom:20,marginTop:20}} onPress={handleMenuPress} >
            <Image
                  resizeMode="contain"
                  source={require('@/assets/icons/menu.png')}
                  style={{height:30,marginEnd:20,tintColor:'gray'}}
                  
                  />
          </TouchableOpacity>


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


                <TouchableOpacity style={{
                  backgroundColor:'gray', // Background color
                  padding: 5,                // Padding around the text
                  borderRadius: 5,
                  marginHorizontal:20,
                  height:40
                        // Rounded corners
                }} onPress={handlePress}>
                    <Text style={styles.buttonText}>Edit profile</Text>
                </TouchableOpacity>

            

              </View>

              

            </View>

            <View style={{flexDirection:"row",alignItems:"center",marginTop:10,marginLeft:15,marginTop:5, marginEnd:15}}> 
            
            
                <Text style={{fontSize:20,color:colorScheme === 'dark' ? 'white' : 'black'}}>{userdata.username}</Text>
    
                {(userdata.verified)&& <Image
                                    resizeMode="contain"
                                    source={require('@/assets/icons/verified.png')}
                                    style={{height:25, width:25}}
                                  />}
    
            </View>

            


            {userdata.caption && <Text style={{fontSize:15,color:'gray',marginLeft:15,marginBottom:10,marginEnd:15}}>{userdata.caption}</Text>}

          </View> :
          <ActivityIndicator style={{marginTop:20}} size="large" color={colorScheme === 'dark' ? 'white' : 'black'}/>}



           </PullToRefresh>

        


        <View style={styles.titleContainer}>
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
});
