import { StyleSheet, Text, TextInput, View ,TouchableOpacity,Image} from 'react-native'
import React,{useState,useRef} from 'react'
import {CountryPicker} from "react-native-country-codes-picker";
import { useAuth } from '@/constants/AuthContext';




const phoneAuth = () => {


  const {getPhoneCredentials,user} = useAuth();
 
  

  const [show,setShow] = useState(false);
  const [countryCode, setCountryCode] = useState('+254');
  const [countryInitial, setCountryInitial] = useState('KE');

  const handleSendcode = async () => {
    getPhoneCredentials()
  }



  return (
    
    <View style={{flex:1,marginHorizontal:10}}>

      <Text style={{color:'white',fontSize:20,fontWeight:'bold',marginTop:20}}>Enter phone number</Text>

      <Text style={{color:'gray',fontSize:15,fontWeight:'bold',marginTop:10}}>You will receive a verification code via SMS. Charges may apply</Text>


      <View style={{flexDirection:'row',marginTop:20,alignItems:'center'}}>


      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{
           
            height: 40,
            alignItems:'center',
            flexDirection:'row'
            
           
        }}
      >

        <Text style={{
            color: 'white',
            fontSize: 15
        }}>
            {countryInitial}
        </Text>
        <Text style={{
            color: 'white',
            marginStart:5,
            fontSize: 15
        }}>
            {countryCode}
        </Text>

        <Image style={{height:15,width:15,tintColor:'gray',marginStart:5}} source={require('@/assets/icons/down-arrow.png')}/>
      </TouchableOpacity>

        

        <TextInput 
          style={{marginStart:10,
            color:'white',borderColor:'gray',
            borderWidth:1,borderRadius:5,padding:5,
            flex:1,fontSize:16,paddingHorizontal:10}}
        
          
          placeholder='Enter phone numbe'
          placeholderTextColor='gray'
        />

      </View>


      

      <TouchableOpacity onPress={handleSendcode}
        
        style={{
            width: '100%',
            height: 40,
            marginTop:20,
            alignItems:'center',
           
            borderRadius:5,
            backgroundColor: 'gray',
            
        }}
      >

        <View style={{flexDirection:'row',height:'100%'}}>

          <Text style={{
              color: 'orange',
              alignSelf:'center',
              fontSize: 15
          }}>Send code
          </Text>

        </View>
        
      </TouchableOpacity>

      <CountryPicker
          show={show}
          style={{modal:{
            height:500
          }}}

          onBackdropPress={()=>{
            setShow(false)
          }}
         
          // when picker button press you will get the country object with dial code
          pickerButtonOnPress={(item) => {
            setCountryCode(item.dial_code);
            setCountryInitial(item.code)
            setShow(false);
          }}
        />

     


    </View>
  )
}

export default phoneAuth

const styles = StyleSheet.create({})