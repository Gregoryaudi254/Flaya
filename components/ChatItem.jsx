import { StyleSheet, Text, View ,Image, TouchableOpacity} from 'react-native'
import React from 'react'
import { Colors } from '@/constants/Colors'
import moment from 'moment'
import { timeAgo } from '@/constants/timeAgo'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from '@/hooks/useColorScheme'


const ChatItem = ({chat:{senderid,message,messageType,images,status,mainmessage,location,timestamp,isdeleted,receiverid},onReplySelect,showDate,currentuserid}) => {

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const isSenderCurrentUser = senderid === currentuserid;

   // console.log("current "+status)

    const formatTimestamp = (timestamp, isDateFormat) => {
        const date = timestamp && timestamp.toDate ? moment(timestamp.toDate()) : moment(); // use current date if timestamp is null
        return !isDateFormat ? date.format('hh:mm A') : date.format('MMMM DD, YYYY hh:mm A') // e.g., "November 03, 2024 10:30 AM"
        ;
    };

  
  return (

    isdeleted ? 

    (<View style={[styles.deletedMessageContainer, {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      alignSelf: isSenderCurrentUser ? 'flex-end' : 'flex-start',
    }]}>
        <Ionicons name="ban" size={16} color={isDark ? '#666' : '#AAA'} />
        <Text style={[styles.deletedMessageText, {
          color: isDark ? '#666' : '#AAA'
        }]}>
          Message deleted
        </Text>
    </View>):

    (<View style={styles.messageContainer}>

        {showDate && (
            <View style={[styles.modernDateContainer, {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }]}>
              <Text style={[styles.modernDateText, {
                color: isDark ? '#AAA' : '#666'
              }]}>
            {formatTimestamp(timestamp,true)}
            </Text>
            </View>
        )}

        

        <View 
        style={{alignSelf:isSenderCurrentUser? 'flex-end':'flex-start',
       
        maxWidth:'75%',flexDirection:'row',marginVertical: 2}}>

            {isSenderCurrentUser && status === 'sending' && 
              <View style={styles.sendingIndicator}>
                <Ionicons name="time" size={14} color={isDark ? '#666' : '#AAA'} />
              </View>
            }


            <View style={[styles.modernMessageBubble,
                {
                  backgroundColor: isSenderCurrentUser 
                    ? Colors.blue 
                    : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'),
                  
                  borderTopLeftRadius: isSenderCurrentUser ? 20 : 4,
                  borderTopRightRadius: isSenderCurrentUser ? 4 : 20,
                  borderBottomLeftRadius: 20,
                  borderBottomRightRadius: 20,
                  
                  shadowColor: isSenderCurrentUser ? Colors.blue : '#000',
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: isSenderCurrentUser ? 0.3 : 0.1,
                  shadowRadius: 1,
                 
                },
                messageType === 'image' ? styles.imageBubblePadding : styles.textBubblePadding
              ]}>

                { mainmessage && 
                  <TouchableOpacity onPress={()=> onReplySelect(mainmessage.id)}>
                    <View style={[styles.modernReplyContainer, {
                      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                      borderLeftColor: isSenderCurrentUser ? 'rgba(255, 255, 255, 0.5)' : Colors.blue,
                    }]}>

                    <Text style={[styles.replyAuthorText, {
                      color: isSenderCurrentUser ? 'rgba(255, 255, 255, 0.8)' : Colors.blue
                    }]}>
                      {mainmessage.sendername}
                    </Text>


                    {mainmessage.messageType === 'text' ? (
                        <Text style={[styles.replyContentText, {
                          color: isSenderCurrentUser ? 'rgba(255, 255, 255, 0.7)' : (isDark ? '#AAA' : '#666')
                        }]}>
                          {mainmessage.message}
                        </Text>

                    ): mainmessage.messageType === 'image' ?
                    ( 
                        <View style={styles.replyImageContainer}>
                          <Image style={styles.replyImage} source={{uri:mainmessage.image}} />
                          <Text style={[styles.replyContentText, {
                            color: isSenderCurrentUser ? 'rgba(255, 255, 255, 0.7)' : (isDark ? '#AAA' : '#666')
                          }]}>
                            Photo
                          </Text>
                        </View>
                    ):( 
                        <View style={styles.replyLocationContainer}>
                          <Ionicons
                            name="location"
                            size={14}
                            color={isSenderCurrentUser ? 'rgba(255, 255, 255, 0.7)' : (isDark ? '#AAA' : '#666')}
                          />
                          <Text numberOfLines={1} style={[styles.replyContentText, {
                            color: isSenderCurrentUser ? 'rgba(255, 255, 255, 0.7)' : (isDark ? '#AAA' : '#666'),
                            marginLeft: 4,
                          }]}>
                            {mainmessage.location.address}
                          </Text>
                    </View>
                    )}
                        
                  </View>

                </TouchableOpacity>
                
                }

                {/* Message Content */}
                {messageType === 'text' && (
                    <Text style={[styles.modernMessageText, {
                      color: isSenderCurrentUser ? 'white' : (isDark ? Colors.light_main : Colors.dark_main)
                    }]}>
                        {message}
                    </Text>
                )}

                {messageType === 'image' && (
                        <Image
                        style={styles.modernMessageImage} 
                        source={{uri: Array.isArray(images) ? images[0] : images}} 
                        resizeMode="cover"
                    />
                )}

                {messageType === 'location' && (
                    <View style={styles.modernLocationContainer}>
                        
                        <View style={[styles.locationHeader, {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        }]}>
                          <Ionicons 
                            name="location" 
                            size={18} 
                            color="white" 
                          />
                          <Text style={styles.locationTitle}>
                            Shared Location
                          </Text>
                        </View>

                        <Text style={styles.modernLocationText}>
                            {location.address}
                        </Text>

                        <View style={[styles.locationPreview, {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        }]}>
                          <Ionicons name="map" size={20} color="rgba(255, 255, 255, 0.7)" />
                          <Text style={styles.viewMapText}>
                            Tap to view on map
                          </Text>
                        </View>

                    </View>
                )}

                {/* Timestamp */}
                <View style={styles.modernTimestampContainer}>
                  <Text style={[styles.modernTimestampText, {
                    color: isSenderCurrentUser 
                      ? 'rgba(255, 255, 255, 0.7)' 
                      : (isDark ? '#666' : '#AAA')
                  }]}>
                    {formatTimestamp(timestamp,false)}
                  </Text>
                  
                  {isSenderCurrentUser && (
                    <Ionicons 
                      name={status === 'sent' ? 'checkmark' : 'checkmark-done'} 
                      size={12} 
                      color={status === 'read' ? '#22C55E' : 'rgba(255, 255, 255, 0.7)'} 
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>

            </View>

        </View>
      
    </View>)
  )
}

export default ChatItem

const styles = StyleSheet.create({
  messageContainer: {
    flex: 1,
    paddingVertical: 2,
  },
  
  // Deleted message styles
  deletedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    maxWidth: '70%',
    marginVertical: 2,
  },
  deletedMessageText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 8,
  },

  // Date display styles
  modernDateContainer: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginVertical: 8,
  },
  modernDateText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Sending indicator
  sendingIndicator: {
    alignSelf: 'flex-end',
    marginRight: 8,
    marginBottom: 4,
  },

  // Modern message bubble
  modernMessageBubble: {
    minWidth: 80,
    maxWidth: '100%',
  },
  textBubblePadding: {
    padding: 12,
  },
  imageBubblePadding: {
    padding: 4,
  },

  // Reply container styles
  modernReplyContainer: {
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  replyAuthorText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyContentText: {
    fontSize: 12,
    lineHeight: 16,
  },
  replyImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 8,
  },
  replyLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  // Message content styles
  modernMessageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  modernMessageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },

  // Location message styles
  modernLocationContainer: {
    width: 240,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
  modernLocationText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 18,
    marginBottom: 8,
  },
  locationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  viewMapText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 6,
  },

  // Timestamp styles
  modernTimestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  modernTimestampText: {
    fontSize: 11,
    fontWeight: '400',
  },
})