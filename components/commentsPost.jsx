import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image, StyleSheet, Platform,FlatList,TextInput ,Text,ScrollView, View,Button,Dimensions,ImageBackground,ScrollViewTextInput,TouchableOpacity} from 'react-native';

import Modal from 'react-native-modal';

const { width } = Dimensions.get('window');

import {Data} from '@/constants/Data'

import CommentItem from '@/components/commentItem'
import { ResizeMode, Video } from 'expo-av';


import React, { useState, useRef, useEffect,useCallback } from 'react';

const commentsPost = ({ isVisible, onClose, origin }) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(origin.y);

    const videoRef = useRef(null);

  
  
    if (isVisible) {
      opacity.value = withTiming(1, { duration: 300, easing: Easing.ease });
      translateY.value = withTiming(30, { duration: 300, easing: Easing.ease });
    } else {
      opacity.value = withTiming(0, { duration: 300, easing: Easing.ease });
    }
  
    const animatedStyle = useAnimatedStyle(() => {

      
      return {
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
      };

    });
  
    return (

      <Modal isVisible={isVisible} onBackdropPress={onClose} style={styles.fullWidthModal}>

        <Animated.View style={[styles.fullWidthModalContent, animatedStyle]}>

        <View style={{flex:1,flexDirection:'column'}}>


            <TouchableOpacity onPress={onClose} style={{alignSelf:'flex-end'}}  >
              <Image style={{width:20,height:20}} source={require('@/assets/icons/cancel.png')}></Image>
            </TouchableOpacity>


            <FlatList
                data={Data.comments}
                showsVerticalScrollIndicator={false}
                style={{marginTop:10,flex:2}}
                keyExtractor={(story) => story.id}
                
                renderItem={({ item }) =>  
                <CommentItem replys={item.replys} profileImage={item.userProfileImage} username={item.username} comment={item.comment}/>} 
                />


            <View style={{height:40,flexDirection:'row'}}>

                <TextInput placeholderTextColor='gray' placeholder='Comment' style={{color:'white', padding:10,marginRight:10,flex:1,borderRadius:10,borderColor:'white',shadowColor:'gray'}}/>

                <TouchableOpacity style={styles.circularButton} >
                <Image style={{width:20,height:20}} source={require('@/assets/icons/send.png')}></Image>
                </TouchableOpacity>

            </View>

        </View>



        </Animated.View>
     
      </Modal>

      

    );
  };

  export default commentsPost;


  const styles = StyleSheet.create({
   
    
    modal: {
      justifyContent: 'flex-start',
      margin: 0,
    },
  
    fullWidthModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    fullWidthModalContent: {
      width: width,
      height: 800,
      backgroundColor: 'black',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
    },
    profileImage: {
      width: 50,
      height: 50,
      borderColor: 'white',
      borderWidth: 3,
      borderRadius: 25,
      marginEnd: 10,
    }, 
    menuIcon: {
      width: 20,
      height: 20,
      paddingRight:5
      
      
    },

    username: {
      color: 'white',
      fontSize: 17,
     
      
      fontWeight: 'bold',
    },
    description: {
      color: 'gray',
      fontSize: 14,
      
    },bottomIcons:{
     
      flexDirection:'row',
      marginTop:10,
      justifyContent:'space-between',
      marginEnd:10,
     
  },

  bottomIconsText:{
      color:'gray',
      fontSize:13,
      marginLeft:5
  },
  bottomIconsView:{
      flexDirection:'row',
      alignItems:'center',
      
  }
   
  });



