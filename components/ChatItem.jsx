import { StyleSheet, Text, View ,Image, TouchableOpacity} from 'react-native'
import React from 'react'
import { Colors } from '@/constants/Colors'
import moment from 'moment'
import { timeAgo } from '@/constants/timeAgo'


const ChatItem = ({chat:{senderid,message,messageType,images,status,mainmessage,location,timestamp,isdeleted,receiverid},onReplySelect,showDate,currentuserid}) => {


    const isSenderCurrentUser = senderid === currentuserid;

   // console.log("current "+status)

    const formatTimestamp = (timestamp, isDateFormat) => {
        const date = timestamp && timestamp.toDate ? moment(timestamp.toDate()) : moment(); // use current date if timestamp is null
        return !isDateFormat ? date.format('hh:mm A') : date.format('MMMM DD, YYYY hh:mm A') // e.g., "November 03, 2024 10:30 AM"
        ;
    };

  
  return (

    isdeleted ? 

    (<View style={{backgroundColor:'gray',padding:10,alignSelf:isSenderCurrentUser? 'flex-end':'flex-start',borderRadius:10}}>

        <Text style={{fontSize:15,color:'black',fontStyle:'italic'}}>Message deleted</Text>

    </View>):

    (<View style={{flex:1}}>

        {showDate && (
            <Text style={styles.dateText}>
            {formatTimestamp(timestamp,true)}
            </Text>
        )}

        

        <View 
        style={{alignSelf:isSenderCurrentUser? 'flex-end':'flex-start',
       
        maxWidth:'60%',flexDirection:'row',}}>

            {isSenderCurrentUser && status === 'sending' && <Image
                
                source={require('@/assets/icons/loading.png')}
                style={[
                { width: 15, height: 15,tintColor:'gray' ,alignSelf:'flex-end',marginEnd:5}
                ]}

            />
            }


            <View style={[styles.mainView,messageType !== 'location' ?
                 {backgroundColor:isSenderCurrentUser?'white':Colors.blue}:{backgroundColor:'green'}
                 ,{padding:messageType === 'image'? 3 :10}]}>

                { mainmessage && <TouchableOpacity onPress={()=> onReplySelect(mainmessage.id)}>
                    <View style={{padding:5,backgroundColor:'gray',borderRadius:10,marginBottom:3}}>

                    <Text 
                    style={{color:'white',fontSize:15,fontWeight:'bold'}}>
                    {mainmessage.sendername}</Text>


                    {mainmessage.messageType === 'text' ? (
                        <Text 
                        style={{color:'white',fontSize:15}}>
                        {mainmessage.message}</Text>

                    ): mainmessage.messageType === 'image' ?
                    ( 
                        <Image style={{width:30,height:30,borderRadius:5}} source={{uri:mainmessage.image}} />
                    ):( 
                        <View style={{flexDirection:'row',alignItems:'center',marginEnd:10,width:'70%'}}>

                        <Image
                        style={styles.locationIcons}
                        source={require('@/assets/icons/location.png')}
                        />

                        <View style={{height:40,width:1,backgroundColor:'white',marginStart:5}}/>


                        <Text numberOfLines={2}
                        style={{fontSize:15,color:'white',marginStart:5}}>
                        {mainmessage.location.address}</Text>



                    </View>

                    )
                    }

                    
                        
                  </View>

                </TouchableOpacity>
                
                }

                {
                    messageType === 'image'? 

                    <View
                    style={{width:200,height:200,justifyContent:'center',alignItems:'center'}}>

                        <View style={{flex:1,flexDirection:'row'}}>

                        <Image
                                
                                source={{ uri: images[0] }}
                                style={[
                                styles.photo,
                                { width: images.length > 1 ? '50%' : '100%',
                                 height: (images.length === 1 || images.length === 2 )? 200:'100%' }
                                ]}
                            />


                            {images.length > 1 && <Image
                            
                                source={{ uri: images[1] }}
                                style={[
                                styles.photo,
                                { width: '50%', height: images.length === 2 ? 200:'100%' }
                                ]}
                            />}


                        </View>


                        <View style={{flex:1,flexDirection:'row'}}>

                            {images.length > 2 && <Image
                                
                                source={{ uri: images[2] }}
                                style={[
                                styles.photo,
                                { width:images.length === 3 ?  '100%':'50%', height: '100%' }
                                ]}
                            />}


                            {images.length > 3 && <Image
                            
                                source={{ uri: images[3] }}
                                style={[
                                styles.photo,
                                { width: '50%', height: '100%' }
                                ]}
                            />}


                        </View>


                        { images.length > 4 &&
                            <View 
                            style={{width:40,height:40,
                                elevation:10,
                                shadowColor: 'black',
                                shadowOffset: { width: 0, height: 5 },
                                shadowOpacity: 3,
                                shadowRadius: 5,
                                borderRadius:20,position:'absolute',
                                justifyContent:'center',alignItems:'center',
                                backgroundColor:'white',}}>

                                <Text style={{fontSize:20,color:'black',fontWeight:'bold'}}>{images.length}</Text>

                            </View>
                        }






                    </View>

                    

                    :messageType === 'text' ?
                    
                    (<Text 
                    style={{alignSelf:isSenderCurrentUser? 'flex-end':'flex-start'}}>
                    {message}</Text>):

                    (<View style={{flexDirection:'row',alignItems:'center',marginEnd:10}}>

                        <Image
                        style={styles.locationIcons}
                        source={require('@/assets/icons/location.png')}
                        />

                        <View style={{height:40,width:1,backgroundColor:'white',marginStart:5}}/>


                        <Text numberOfLines={2}
                        style={{fontSize:15,color:'white',marginStart:5}}>
                        {location.address}</Text>



                    </View>)
                   
                }

                <Text numberOfLines={1}
                style={{fontSize:10,color:isSenderCurrentUser?'gray':'white',marginStart:5,alignSelf: 'flex-end'}}>
                {formatTimestamp(timestamp,false)}</Text>




            </View>



        
           

          

        </View>


       


      
    </View>)
  )
}

export default ChatItem

const styles = StyleSheet.create({photo: {
   borderRadius:5
    
  },
  locationIcons:{
    width: 25,
    height: 25,
   tintColor:'white',
    marginHorizontal:5

  },
  mainView:{ 
  borderRadius:5,
  marginEnd:5
  },
  dateText: {
    textAlign: 'center',
    color: 'gray',
    alignSelf:'center',
    marginVertical: 10,
    fontSize: 14,
  },
  
    
})