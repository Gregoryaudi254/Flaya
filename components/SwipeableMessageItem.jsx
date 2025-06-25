import React, { useRef } from 'react';
import { View, Animated, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import MessageItem from './MessageItem';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25;
const MAX_TRANSLATE = screenWidth * 0.4;

const SwipeableMessageItem = ({ 
  message, 
  currentuserid, 
  page, 
  onDelete, 
  onArchive, 
  onMarkAsRead,
  onPress,
  onLongPress
}) => {
  const colorScheme = useColorScheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const gestureRef = useRef(null);
  const isDark = colorScheme === 'dark';
  const isUnread = !message.isread && message.senderid !== currentuserid;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        const { translationX } = event.nativeEvent;
        // Clamp the translation to prevent over-swiping
        if (Math.abs(translationX) > MAX_TRANSLATE) {
          translateX.setValue(translationX > 0 ? MAX_TRANSLATE : -MAX_TRANSLATE);
        }
      }
    }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // Determine if we should trigger an action based on distance and velocity
      const shouldTriggerAction = Math.abs(translationX) > SWIPE_THRESHOLD || Math.abs(velocityX) > 1000;
      
      if (shouldTriggerAction) {
        if (translationX > 0) {
          // Swipe right - Mark as read
          if (isUnread && onMarkAsRead) {
            // Animate to completion and then reset
            Animated.timing(translateX, {
              toValue: MAX_TRANSLATE,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              onMarkAsRead();
              Animated.timing(translateX, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start();
            });
            return;
          }
        } else {
          // Swipe left - Archive/Delete
          if (onArchive) {
            Animated.timing(translateX, {
              toValue: -MAX_TRANSLATE,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              onArchive();
              Animated.timing(translateX, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start();
            });
            return;
          }
        }
      }
      
      // Reset position if no action triggered
      Animated.spring(translateX, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  };

  const leftActionScale = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD, MAX_TRANSLATE],
    outputRange: [0.8, 1, 1.2],
    extrapolate: 'clamp',
  });

  const rightActionScale = translateX.interpolate({
    inputRange: [-MAX_TRANSLATE, -SWIPE_THRESHOLD, 0],
    outputRange: [1.2, 1, 0.8],
    extrapolate: 'clamp',
  });

  const leftAction = () => (
    <Animated.View style={[
      styles.actionContainer,
      styles.leftAction,
      {
        backgroundColor: isUnread ? '#10B981' : '#6B7280',
        opacity: translateX.interpolate({
          inputRange: [0, SWIPE_THRESHOLD],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        }),
        transform: [{ scale: leftActionScale }],
      }
    ]}>
      <Ionicons 
        name={isUnread ? "checkmark-circle" : "checkmark"} 
        size={24} 
        color="white" 
      />
      <Text style={styles.actionText}>
        {isUnread ? "Mark Read" : "Read"}
      </Text>
    </Animated.View>
  );

  const rightAction = () => (
    <Animated.View style={[
      styles.actionContainer,
      styles.rightAction,
      {
        backgroundColor: '#EF4444',
        opacity: translateX.interpolate({
          inputRange: [-SWIPE_THRESHOLD, 0],
          outputRange: [1, 0],
          extrapolate: 'clamp',
        }),
        transform: [{ scale: rightActionScale }],
      }
    ]}>
      <Ionicons name="archive-outline" size={24} color="white" />
      <Text style={styles.actionText}>Archive</Text>
    </Animated.View>
  );

  return (
    <View style={[styles.container, {
      backgroundColor: isDark ? Colors.dark_background : Colors.light_background
    }]}>
      {leftAction()}
      {rightAction()}
      
      <PanGestureHandler
        ref={gestureRef}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-15, 15]}
        failOffsetY={[-30, 30]}
      >
        <Animated.View style={{
          transform: [{ translateX }],
        }}>
          <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.95}
            style={[styles.messageContainer, {
              backgroundColor: isDark ? Colors.dark_background : Colors.light_background,
              shadowColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
            }]}
          >
            <MessageItem 
              message={message} 
              currentuserid={currentuserid} 
              page={page}
            />
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  messageContainer: {
    borderRadius: 16,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD * 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
    flexDirection: 'column',
    paddingHorizontal: 20,
  },
  leftAction: {
    left: 0,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  rightAction: {
    right: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default SwipeableMessageItem; 