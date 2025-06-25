import { StyleSheet, Text, View ,Image} from 'react-native'
import React, { useEffect } from 'react'
import { getDistance } from 'geolib'

import { LinearGradient } from 'expo-linear-gradient'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler'
import { useColorScheme } from '@/hooks/useColorScheme'
import { Colors } from '@/constants/Colors'
import { Ionicons } from '@expo/vector-icons'

const ActiveUsersItem = ({activeUser:{hasstories,coordinates,isshowingdistance,username,profilephoto,id},currentuserlocation, onPress}) => {

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const distance = getDistance(
    { latitude: currentuserlocation.coords.latitude, longitude: currentuserlocation.coords.longitude },
    { latitude: coordinates._latitude, longitude: coordinates._longitude }
  );

  const formatDistance = (distanceInMeters) => {
    if (distanceInMeters < 1000) {
      return `${distanceInMeters}m`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)}km`;
    }
  };

  return (

    <View style={[styles.modernContainer, {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    }]}>

        <TouchableWithoutFeedback 
          onPress={() => onPress({id:id, username:username})}
          style={styles.touchableArea}
        >

          <View style={styles.profileSection}>
            {/* Enhanced Profile Image */}
            <View style={styles.profileImageContainer}>
              <LinearGradient
                colors={hasstories ? ['#FF7F50', '#FF6347', '#FF4500'] : ['transparent', 'transparent']} 
                style={[styles.modernGradient, {
                  padding: hasstories ? 3 : 0,
                }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                  <Image
                  resizeMode="cover"
                  source={{uri:profilephoto}}
                  style={[styles.modernProfileImage, {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.8)',
                    borderWidth: hasstories ? 0 : 2,
                  }]}
                  />

              </LinearGradient>

              {/* Online Indicator */}
              <View style={[styles.onlineIndicator, {
                backgroundColor: '#22C55E',
                borderColor: isDark ? Colors.dark_background : Colors.light_background,
              }]} />
            </View>

          
          </View>

          {/* Enhanced Username */}
          <View style={styles.userInfo}>
            <Text style={[styles.modernUsername, {
              color: isDark ? Colors.light_main : Colors.dark_main
            }]} numberOfLines={1}>
              {username}
            </Text>
            
           {/* Distance Badge */}
           {isshowingdistance && (
              <View style={[styles.distanceBadge, {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                borderColor: Colors.blue,
              }]}>
                <Ionicons name="location" size={8} color={Colors.blue} />
                <Text style={[styles.distanceText, { color: Colors.blue }]}>
                  {formatDistance(distance)}
                </Text>
              </View>
            )}
          </View>

        </TouchableWithoutFeedback>

    </View>
  )
}

export default ActiveUsersItem

const styles = StyleSheet.create({
    profileImage: {
        width: 65,
        height: 65,
        alignSelf:'center',
        borderWidth:3,
        overflow:'hidden',
       
        borderRadius: 32.5,
       
      }, 
      gradient: {
        width: 72,
        height: 72,
        
        flexDirection:'column',
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
      },
      modernContainer: {
        borderWidth: 1,
        marginRight: 10,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 10,
        padding: 10,
      },
      touchableArea: {
       
        alignItems: 'center',
      },
      profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      profileImageContainer: {
        position: 'relative',
      },
      modernGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
      },
      modernProfileImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
      },
      onlineIndicator: {
        width: 12,
        height: 12,
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 6,
        position: 'absolute',
        bottom: 0,
        right: 0,
      },
      distanceBadge: {
       flexDirection:'row',
       alignItems:'center',
       marginTop: 5,
        top: 0,
        right: 0,
        padding: 2,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 5,
      },
      distanceText: {
        fontSize: 10,
        marginLeft: 5,
        fontWeight: 'bold',
      },
      userInfo: {
        marginLeft: 10,
      },
      modernUsername: {
        fontSize: 16,
        fontWeight: 'bold',
      },
      statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
      },
      onlineStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22C55E',
        marginRight: 5,
      },
      onlineStatusText: {
        fontSize: 12,
      },
})