import { auth, db } from '@/constants/firebase';

import { onAuthStateChanged } from 'firebase/auth';
import { useRouter ,useSegments} from 'expo-router';
import { useEffect, useState,useRef } from 'react';

import { useAuth } from '@/constants/AuthContext';
import { View ,Text} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Page = () => {
    const router = useRouter();

    const {user,isAuthenticated} = useAuth();
   

    const hasNavigated = useRef(false);

  


    useEffect(() => {


      if(isAuthenticated !== undefined && !hasNavigated.current){
        
        if(user){
          hasNavigated.current = true;
          if(isAuthenticated){
            router.replace('/(tabs)')
          }else{
            router.replace('/(profile)');
          }
         }else{
          router.replace('/(auth)')
         }
      }

   
    }, [user,isAuthenticated]);

    return (
      <SafeAreaView style={{flex:1}}>

        <View style={{justifyContent:'center',alignItems:'center',flex:1}}>

        <Text style={{fontSize:30,color:'tomato',fontWeight:'bold'}}>Flaya</Text>

        </View>

      </SafeAreaView>
      
    )
  };


  
  export default Page;