import {
    Image,
   
    Text,
    View,
    
    TouchableOpacity,
    Dimensions,
   
  } from 'react-native';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Modal from 'react-native-modal';

const CustomModal = React.memo(({ isVisible, onClose, buttonPosition }) => {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0);
  
  
    const {user} = useAuth()
  
    useEffect(() => {
      if (isVisible) {
        opacity.value = withTiming(1, { duration: 300, easing: Easing.ease });
        scale.value = withTiming(1, { duration: 300, easing: Easing.bounce });
      } else {
        opacity.value = withTiming(0, { duration: 300, easing: Easing.ease });
        scale.value = withTiming(0, { duration: 300, easing: Easing.ease });
      }
    }, [isVisible]);
  
    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
      };
    });
  
    const { width, height } = Dimensions.get('window');
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

  export default CustomModal;