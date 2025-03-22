import { Animated, Pressable, StyleSheet ,View,Text} from 'react-native';
import React, { useRef } from 'react';
import ChatItem from '@/components/ChatItem';

import moment from 'moment';

const ScalablePressable = ({ item, onPress, onLongPress ,onReplySelect,prevItem, currentuserid}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

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
    <Pressable
      onLongPress={handleLongPress}
      onPress={() => onPress()}
      onPressOut={handlePressOut}
      style={({ pressed }) => [
        styles.item,
        pressed && { opacity: 1 }, // Maintain opacity during press
      ]}
    > 
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <ChatItem onReplySelect={onReplySelect} showDate={showDate} chat={item} currentuserid={currentuserid} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({

  item: {
    margin:10
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
});

export default ScalablePressable;