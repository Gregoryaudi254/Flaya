import React,{useEffect} from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Or any other icon library you prefer

const FloatingButton = ({ onPress, isVisible, isHomePage = false }) => {
  const scaleValue = new Animated.Value(isVisible ? 1 : 0);

  useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: isVisible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleValue }]} ,isHomePage ? {top:50} : {bottom:50}]}>
      <TouchableOpacity style={styles.button} onPress={onPress}>
        <Ionicons name={isHomePage ? "arrow-up-circle" : "arrow-down-circle"} size={40} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 30,
    
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FloatingButton;
