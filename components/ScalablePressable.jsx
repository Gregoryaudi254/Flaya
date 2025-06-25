import { Animated, Pressable, StyleSheet ,View,Text} from 'react-native';
import React, { useRef } from 'react';
import ChatItem from '@/components/ChatItem';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

import moment from 'moment';

const ScalablePressable = ({ item, onPress, onLongPress ,onReplySelect,prevItem, currentuserid, onSwipeReply}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLongPress = () => {
    Animated.spring(scaleValue, {
      toValue: 0.9, // Scale inwards
      friction: 3,
      useNativeDriver: true,
    }).start();

    onLongPress && onLongPress(item.id);
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1, // Reset scale
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  // Swipe gesture handler
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      
      // If swiped right more than 80 pixels, trigger reply
      if (translationX > 80) {
        (onSwipeReply && !item.isdeleted) && onSwipeReply(item);
        
        // Quick animation to show action completed
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: 100,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Reset position if swipe wasn't far enough
        Animated.spring(translateX, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const replyIconOpacity = translateX.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const replyIconScale = translateX.interpolate({
    inputRange: [0, 80],
    outputRange: [0.5, 1],
    extrapolate: 'clamp',
  });

  const replyHintOpacity = translateX.interpolate({
    inputRange: [0, 20, 40],
    outputRange: [0.3, 0.6, 0],
    extrapolate: 'clamp',
  });

  let showDate = false;
  try{

    const date = item.timestamp && item.timestamp.toDate ? moment(item.timestamp.toDate()) : moment();

    const datePrevious = prevItem ? prevItem.timestamp.toDate ? moment(prevItem.timestamp.toDate()) : moment() :null;

    const currentItemDate = date.format('YYYY-MM-DD');
    const prevItemDate = datePrevious ? datePrevious.format('YYYY-MM-DD') : null;

    showDate = currentItemDate !== prevItemDate;

  }catch(e) {
    console.log("error "+e)
  }
 

  


  // Parse Firestore timestamps into dates
  

  // Check if the current item's date is different from the previous item's date
  

  //console.log('current '+currentItemDate +' Previ' + prevItemDate)

  //console.log('status ' + showDate)




  

  return (
    <View style={styles.swipeContainer}>
      
      {/* Reply Icon Background */}
      <Animated.View style={[
        styles.replyIconContainer,
        {
          opacity: replyIconOpacity,
          transform: [{ scale: replyIconScale }],
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        }
      ]}>
        <Ionicons name="return-up-forward" size={24} color={Colors.blue} />
      </Animated.View>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={10}
        failOffsetX={-10}
      >
        <Animated.View style={[
          styles.messageWrapper,
          {
            transform: [
              { scale: scaleValue },
              { translateX }
            ]
          }
        ]}>
          <Pressable
            onLongPress={handleLongPress}
            onPress={() => onPress()}
            onPressOut={handlePressOut}
            style={({ pressed }) => [
              styles.item,
              pressed && { opacity: 1 }, // Maintain opacity during press
            ]}
          > 
            <ChatItem onReplySelect={onReplySelect} showDate={showDate} chat={item} currentuserid={currentuserid} />
          </Pressable>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    marginVertical: 5,
    marginHorizontal: 10,
  },
  selectedItem: {
    // Your selected item styles
  },
  dateText: {
    textAlign: 'center',
    color: 'gray',
    alignSelf:'center',
    marginVertical: 10,
    fontSize: 14,
  },
  swipeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  replyIconContainer: {
    position: 'absolute',
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  messageWrapper: {
    flex: 1,
    zIndex: 2,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeHint: {
    position: 'absolute',
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  swipeHintText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ScalablePressable;