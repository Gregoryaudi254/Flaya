import { StyleSheet, Text, View ,Image,TouchableOpacity, TouchableWithoutFeedback} from 'react-native'
import React,{useCallback, useState} from 'react'
import { Colors } from '@/constants/Colors'
import moment from 'moment'

import { timeAgo } from '@/constants/timeAgo'
import { setDoc, deleteDoc, serverTimestamp, doc, WriteBatch, writeBatch } from 'firebase/firestore'
import { db } from '@/constants/firebase'
import { getData } from '@/constants/localstorage'
import { useColorScheme } from '@/hooks/useColorScheme'
import { defaultProfileImage } from '@/constants/common'

const UpdateItem = React.memo(({update:{mutual,profilephoto,postphoto,iscollection,message,username,postType,timestamp,extramessage,count,senderid, postcreatorid, postid, id,postcoordinates},prevItem, onItemPress}) => {

  const [isMutual,setMutual] =  useState(mutual)

  const colorScheme = useColorScheme()

  const handleButtonPress = useCallback(async () =>{
      
    const currentUserInfo = await getData('@profile_info')
    //check if is opp user is subscribed
    const ref = doc(db, `users/${senderid}/subscribers/${currentUserInfo.uid}`);

    const updateRef = doc(db, `users/${currentUserInfo.uid}/updates/${id}`);

    const batch = writeBatch(db);
    batch.update(updateRef, {mutual:!isMutual})

    if (!isMutual) {

      const currentuserinfo = {
        profilephoto:currentUserInfo.profilephoto,
        username:currentUserInfo.username,
        id:currentUserInfo.uid,
        createdAt:serverTimestamp()
      }

      batch.set(ref, currentuserinfo);

    }else {
      batch.delete(ref);
    }

    // Step 3: Commit the batch
    try {
      await batch.commit();
      console.log("Batch operations committed successfully!");
    } catch (error) {
      console.log("Error committing batch operations:", error);
    }

    setMutual(!isMutual)
}, []
)
  const getItemMoment = useCallback((ts) => {
    if (typeof ts === 'string') {
      return moment(ts, 'YYYY-MM-DD HH:mm:ss');
    } else if (ts && typeof ts.toDate === 'function') {
      // Firestore timestamp
      return moment(ts.toDate());
    } else {
      return moment(ts);
    }
  }, []);

  const currentDate = moment();
  const itemDate = getItemMoment(timestamp);
  const prevItemDate = prevItem ? getItemMoment(prevItem.timestamp) : null;
  
  // Calculate days difference
  const days = currentDate.diff(itemDate, 'days');
  const daysPrev = prevItemDate ? currentDate.diff(prevItemDate, 'days') : null;
  
  const getStampInfo = useCallback((days, daysPrev) => {
    // Determine current item's category
    let currentCategory;
    if (days <= 7) {
      currentCategory = 'Recent';
    } else if (days <= 30) {
      currentCategory = 'Old';
    } else if (days <= 60) {
      currentCategory = 'Last Month';
    } else {
      currentCategory = 'Older';
    }
    
    // If there's no previous item, show the current category
    if (prevItem === null) {
      return currentCategory;
    }
    
    // Determine previous item's category
    let prevCategory;
    if (daysPrev <= 7) {
      prevCategory = 'Recent';
    } else if (daysPrev <= 30) {
      prevCategory = 'Old';
    } else if (daysPrev <= 60) {
      prevCategory = 'Last Month';
    } else {
      prevCategory = 'Older';
    }
    
    // Only show section header if category changed
    return currentCategory !== prevCategory ? currentCategory : null;
  },[])
  
  const stampContentInfo = getStampInfo(days, daysPrev);

 

  const numberOfInteractions = count || 0; 
  let messageInteraction = null;

  if (numberOfInteractions > 1 ){
    messageInteraction = `and ${numberOfInteractions} others `
  }





return (


  <View style={{flex:1}}>

    { stampContentInfo && 
      <Text style={{fontSize:20,fontWeight:'bold',color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}>
        {stampContentInfo}
      </Text>
    }

    <View style={{flexDirection:'row',flex:1,alignItems:'center',marginVertical:5}}>


    <TouchableWithoutFeedback onPress={() => onItemPress('profile', {uid:senderid})}>

        <Image
        resizeMode="cover"
        source={{uri:profilephoto || defaultProfileImage}}
        style={styles.profileImage}
        />
         
    </TouchableWithoutFeedback>


    <TouchableWithoutFeedback onPress={() => onItemPress(postType === "subscription" ? 'profile' : iscollection ? "collection" : 'post', postType === 'subscription' ? {uid:senderid}: iscollection ? {id:id, coordinate:postcoordinates} : {postcreatorid:postcreatorid,postid:postid})}>

      <View style={{flex:1}}>
        <View style={{flexDirection:'row'}}>

          <Text style={{fontSize:15,color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main,fontWeight:'bold'}}>{username}</Text>

          {(iscollection || extramessage) && <Text style={{fontSize:15,color:'gray'}}> {messageInteraction !== null ? messageInteraction: extramessage}</Text>}

        </View>


        <View style={{flexDirection:'row',alignItems:'center'}}>
          <Text style={{fontSize:15,color:'gray'}}>{message}</Text>


          <Text style={{fontSize:12,color:'gray'}}> {timeAgo(timestamp)}</Text>

        </View>
        

      </View>

    </TouchableWithoutFeedback>

    

    

    {
      postType === 'subscription' ?

      <TouchableOpacity style={[styles.buttonSubscribe, !isMutual ? {backgroundColor:Colors.blue} :{borderWidth:2,borderColor:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]} onPress={handleButtonPress}>
          <Text style={[styles.buttonText, {color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}]}>{isMutual ? 'Friends':'Subscribe Back'}</Text>
      </TouchableOpacity>
      :

      <TouchableWithoutFeedback onPress={() => onItemPress("post", {postcreatorid:postcreatorid,postid:postid})}>

          {postphoto && <Image
          resizeMode="cover"
          source={{uri:postphoto}}
          style={styles.postImage}
          />}

          

          

      </TouchableWithoutFeedback>
      

    }


    </View>

  </View>
  
)
})


export default UpdateItem

const styles = StyleSheet.create({
    buttonText:{
       
        fontSize:15

    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginEnd: 10,
      },
      postImage:{
        width: 60,
        height: 60,
        borderRadius:10
      },
      buttonSubscribe:{
        padding: 5, 
        paddingHorizontal:10,               // Padding around the text
        borderRadius: 5,
        height:40,
        flexDirection:'row',
        alignItems:'center'
      }
})