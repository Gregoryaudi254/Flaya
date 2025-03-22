import {  StyleSheet, Text, TextInput, View ,TouchableOpacity} from 'react-native'
import React from 'react'

const EmailAuth = () => {



    return (
    
        <View style={{flex:1,marginHorizontal:10}}>
    
          <Text style={{color:'white',fontSize:20,fontWeight:'bold',marginTop:20}}>Enter your email</Text>
    
          <Text style={{color:'gray',fontSize:15,fontWeight:'bold',marginTop:10}}>You will receive a verification code in your email</Text>
    
    
          <TextInput 
              style={{color:'white',marginTop:20,borderColor:'gray',borderWidth:1,borderRadius:5,padding:10,fontSize:16}}
              placeholder='Enter email'
              placeholderTextColor='gray'
            />
    
    
          
    
          <TouchableOpacity
            
            style={{
                width: '100%',
                height: 40,
                marginTop:40,
                alignItems:'center',
                borderRadius:5,
                backgroundColor: 'gray',
                
            }}
          >
    
            <View style={{flexDirection:'row',height:'100%'}}>
    
              <Text style={{
                  color: 'white',
                  alignSelf:'center',
                  fontSize: 15
              }}>Verify
              </Text>
    
            </View>
            
          </TouchableOpacity>
    
          
    
    
        </View>
      )
}

export default EmailAuth

const styles = StyleSheet.create({})