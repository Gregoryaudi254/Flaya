import { StyleSheet, Text, TouchableOpacity, View,Image } from 'react-native'
import React ,{useRef,useEffect,useState} from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useDispatch, useSelector } from 'react-redux';
import { login, logout } from '@/slices/authSlice';

import { auth } from '@/constants/firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";

import { useRouter } from 'expo-router';
import { useAuth } from '@/constants/AuthContext';

import LottieView from 'lottie-react-native';
import { Colors } from '@/constants/Colors';
import * as Font from 'expo-font';
import { useColorScheme } from '@/hooks/useColorScheme';


const index = () => {

  const colorScheme = useColorScheme();


  const animationRef = useRef(null);

  useEffect(() => {
    animationRef.current?.play();
  }, []);

    const router = useRouter();

    const {signUp} = useAuth();

    const handleSignUp = async () =>{
      router.push('/(auth)/signUp')
    }


    const [fontsLoaded, setFontsLoaded] = useState(false);

    const loadFonts = async () => {
      await Font.loadAsync({
        'Lato': require('@/assets/fonts/Lato.ttf'), // Make sure the path to the font file is correct
      });
      setFontsLoaded(true);
    };
  
    useEffect(() => {
      loadFonts();
    }, []);
  
    if (!fontsLoaded) {
      return null // Show a loading screen while the fonts are loading
    }

   

  return (
    
    <SafeAreaView>

        <View>


          <View>

            <Image style={{width:'80%',height:'40%',marginTop:50,alignSelf:'center'}}
            source={require('@/assets/images/nearby.png')} />

          

            <Text style={{color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,alignSelf:'center',fontWeight:'condensed',fontSize:35,textAlign:'center',marginTop:25,fontFamily:'Lato'}}>Discover new friends near you with
            {' '} <Text style={{color:'tomato',fontSize:40,fontWeight:'bold'}} >Flaya</Text> </Text>

            <Text style={{color:'gray',alignSelf:'center',fontSize:16,textAlign:'center',marginTop:15}}>See what your neigbours are upto and find new connections. Make new friends nearby with ease using Flaya.
            </Text>

            <TouchableOpacity style={{width:'70%',padding:10,backgroundColor:Colors.blue,borderRadius:10,alignSelf:'center',marginTop:30}} onPress={handleSignUp}>
              <Text style={{color:'white',alignSelf:'center',fontSize:15}}>Get started</Text>
            </TouchableOpacity>

          </View>

          

          


        </View>
     
    </SafeAreaView>
  )
}

export default index

const styles = StyleSheet.create({})