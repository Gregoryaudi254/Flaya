import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const PulseLoader = ({ size = 30, color = '#3498db' }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current; // Initial scale value

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.loadingIndicator,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
});

export default PulseLoader;