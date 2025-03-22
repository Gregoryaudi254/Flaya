import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Modal from 'react-native-modal';

const { width, height } = Dimensions.get('window');

import {
    Image,
    StyleSheet,
    Platform,
    FlatList,
    Text,
    View,
    Button,
    TouchableOpacity,
    Dimensions,
    RefreshControl
  } from 'react-native';
  

const CustomDialogRepost = React.memo(({ isVisible, onClose, buttonPosition }) => {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0);
  
    useEffect(() => {
      if (isVisible) {
        opacity.value = withTiming(1, { duration: 600, easing: Easing.ease });
        scale.value = withTiming(1, { duration: 600, easing: Easing.bounce });
      } else {
        opacity.value = withTiming(0, { duration: 900, easing: Easing.ease });
        scale.value = withTiming(0, { duration: 900, easing: Easing.bounce });
      }
    }, [isVisible]);
  
    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
      };
    });
  
    
    let modalLeftPosition = buttonPosition.left - width / 2 + 10;
    if (modalLeftPosition < 0) {
      modalLeftPosition = 10;
    }
  
    const modalStyle = {
      position: 'absolute',
      left: modalLeftPosition,
      top: buttonPosition.top + 10,
    };
  
    if (buttonPosition.top + 200 > height) {
      modalStyle.top = buttonPosition.top - 210;
    }
  
    return (
      <Modal isVisible={isVisible} onBackdropPress={onClose} style={styles.modal}>
        <Animated.View style={[styles.dialog, animatedStyle, modalStyle]}>
          <Text style={{ fontSize: 20 }}>Repost?</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, width: '90%' }}>
            <TouchableOpacity onPress={onClose} style={styles.circularButton}>
              <Image style={{ width: 20, height: 20 }} source={require('@/assets/icons/cancel.png')} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.circularButton}>
              <Image style={{ width: 20, height: 20 }} source={require('@/assets/icons/tick.png')} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    );
  });

  export default CustomDialogRepost;

  const styles = StyleSheet.create({
  
 
    modal: {
      justifyContent: 'flex-start',
      margin: 0,
    },
    dialog: {
      position: 'absolute',
      width: 150,
      alignItems: 'center',
      flexDirection: 'column',
      padding: 10,
      backgroundColor: 'gray',
      borderRadius: 10,
    },
    fullWidthModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    fullWidthModalContent: {
      width,
      height: 700,
      backgroundColor: '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
    },
  });