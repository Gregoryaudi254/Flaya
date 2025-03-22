import { StyleSheet, Text, View ,Image,TouchableOpacity, TouchableWithoutFeedback} from 'react-native'
import React,{useState} from 'react'
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

  const handleButtonPress = async () =>{
      
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
  }

  const currentItemWeek = moment(timestamp, 'YYYY-MM-DD HH:mm:ss').week();

  // Parse the timestamp of the previous item, if it exists
  const prevItemWeek = prevItem !== null
    ? moment(prevItem.timestamp, 'YYYY-MM-DD HH:mm:ss').week()
    : null;


  const timestampDate = timestamp.toDate();
  const currentDate = moment(); // Current time
  const itemDate = moment(timestampDate); // Item time
  
  // Calculate days difference
  const days = currentDate.diff(itemDate, 'days');
  
  const daysPrev = prevItem !== null
    ? currentDate.diff(moment(prevItem.timestamp.toDate()), 'days')
    : 0;

  


  function stampInfo (days,daysPrev){

 

    if(days < 7 && prevItem === null){
      return 'Recent'
    }

    if(days > 7 && daysPrev < 7){
      return  'Last month'
    }

    if(days > 32 && daysPrev < 32){
      return  'Older'
    }

    return null;

  }

  const stamContentInfo = stampInfo(days,daysPrev)

  // Check if the current item's date is different from the previous item's date
  const showStamp = currentItemWeek !== prevItemWeek;

  const numberOfInteractions = count || 0; 
  let messageInteraction = null;

  if (numberOfInteractions > 1 ){
    messageInteraction = `and ${numberOfInteractions} others `
  }





return (


  <View style={{flex:1}}>

    { stamContentInfo && 
      <Text style={{fontSize:20,fontWeight:'bold',color:colorScheme === 'dark' ? Colors.light_main: Colors.dark_main}}>
        {stamContentInfo}
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