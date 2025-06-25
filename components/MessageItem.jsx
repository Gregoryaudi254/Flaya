import { StyleSheet, Text, View, Image, TouchableWithoutFeedback, Animated } from 'react-native'
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react'
import { Colors } from '@/constants/Colors'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { timeAgo } from '@/constants/timeAgo'
import { useColorScheme } from '@/hooks/useColorScheme'
import { Ionicons } from '@expo/vector-icons'

const MessageItem = React.memo(forwardRef(({ 
  message: { photo, timestamp, username, stamp, message, senderid, isread, isoppread, hasstories, isrequestaccepted, unreadcount, id, isonline }, 
  page, 
  currentuserid, 
  onSwipeAction,
  onPress,
  onLongPress 
}, ref) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  // Optimize animation references with useMemo
  const animationRefs = useMemo(() => ({
    fadeAnim: new Animated.Value(1),
    scaleAnim: new Animated.Value(1),
    slideAnim: new Animated.Value(0),
    pressAnim: new Animated.Value(1),
  }), []);

  const { fadeAnim, scaleAnim, slideAnim, pressAnim } = animationRefs;

  // Memoize computed values to avoid recalculation
  const computedValues = useMemo(() => {
    const isSenderIdSame = senderid === currentuserid;
    const isDark = colorScheme === 'dark';
    const isUnread = !isread && !isSenderIdSame;
    
    return { isSenderIdSame, isDark, isUnread };
  }, [senderid, currentuserid, isread, colorScheme]);

  const { isSenderIdSame, isDark, isUnread } = computedValues;

  // Memoize expensive string operations
  const displayUsername = useMemo(() => {
    const maxLength = 20;
    const shortLength = 8;
  
    if (!isrequestaccepted) {
      return username.length > shortLength ? username.slice(0, shortLength) + '..' : username;
    }
    return username.length > maxLength ? username.slice(0, maxLength) + '..' : username;
  }, [username, isrequestaccepted]);

  const messagePreview = useMemo(() => {
    if (!message) return 'No message';
    return message.length > 50 ? `${message.substring(0, 50)}...` : message;
  }, [message]);

  const messageStatus = useMemo(() => {
    if (isSenderIdSame) {
      if (isoppread) {
        return { icon: 'checkmark-done', color: Colors.blue, label: 'Read' };
      } else {
        return { icon: 'checkmark', color: '#888', label: 'Delivered' };
      }
    }
    return null;
  }, [isSenderIdSame, isoppread]);

  const timeDisplay = useMemo(() => {
    return timeAgo(timestamp || stamp);
  }, [timestamp, stamp]);

  // Enhanced animation for new messages
  useEffect(() => {
    if (isUnread) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 5,
            duration: 400,
            useNativeDriver: true,
          }),
        Animated.timing(scaleAnim, {
          toValue: 1.02,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
            duration: 400,
          useNativeDriver: true,
        }),
        ]),
      ]).start();
    }
  }, [isUnread, slideAnim, scaleAnim]);

  // Optimize press handlers with useCallback
  const handlePressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [pressAnim]);

  const handleLongPressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  }, [pressAnim]);

  // Optimize callbacks passed to parent
  const optimizedOnPress = useCallback(() => {
    onPress();
  }, [onPress]);

  const optimizedOnLongPress = useCallback(() => {
    onLongPress();
  }, [onLongPress]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    handlePressIn,
    handlePressOut,
    handleLongPressIn,
  }), [handlePressIn, handlePressOut, handleLongPressIn]);

  // Memoize style objects to prevent recreation
  const containerStyle = useMemo(() => [
    styles.container,
    {
      transform: [
        { scale: Animated.multiply(scaleAnim, pressAnim) }, 
        { translateX: slideAnim }
      ],
      opacity: fadeAnim,
      backgroundColor: isUnread ? 
        (isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.03)') : 
        'transparent',
      borderLeftWidth: isUnread ? 3 : 0,
      borderLeftColor: Colors.blue,
    }
  ], [scaleAnim, pressAnim, slideAnim, fadeAnim, isUnread, isDark]);

  const profileImageWrapperStyle = useMemo(() => [
    styles.profileImageWrapper,
    {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
    }
  ], [isDark]);

  const onlineIndicatorStyle = useMemo(() => [
    styles.onlineIndicator,
    {
      backgroundColor: '#34D399',
      borderColor: isDark ? Colors.dark_background : Colors.light_background
    }
  ], [isDark]);

  const usernameStyle = useMemo(() => [
    styles.username,
    {
      color: isDark ? Colors.light_main : Colors.dark_main,
      fontWeight: isUnread ? '700' : '600',
    }
  ], [isDark, isUnread]);

  const requestBadgeStyle = useMemo(() => [
    styles.requestBadge,
    {
      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.1)',
    }
  ], [isDark]);

  const timeTextStyle = useMemo(() => [
    styles.timeText,
    {
      color: isDark ? '#888' : '#666',
      fontWeight: isUnread ? '600' : 'normal'
    }
  ], [isDark, isUnread]);

  const messageTextStyle = useMemo(() => [
    styles.messageText,
    {
      color: isUnread ? 
        (isDark ? Colors.light_main : Colors.dark_main) : 
        (isDark ? '#999' : '#666'),
      fontWeight: isUnread ? '500' : 'normal',
    }
  ], [isUnread, isDark]);

  return (
    <TouchableWithoutFeedback
      onPress={optimizedOnPress}
      onLongPress={optimizedOnLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={500}
    >
      <Animated.View style={containerStyle}>
        
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {hasstories ? (
      <LinearGradient
                colors={['#FF7F50', '#FF6347', '#FF4500']}
                style={styles.storyGradient}
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
      >
        <Image
        resizeMode="cover"
                  source={{ uri: photo }}
                  style={[styles.profileImage, styles.profileImageWithStory]}
        />
      </LinearGradient>
            ) : (
              <View style={profileImageWrapperStyle}>
              <Image 
                  resizeMode="cover"
                  source={{ uri: photo }}
                  style={styles.profileImage}
                />
              </View>
            )}
            
            {/* Online indicator */}
            {isonline === true && <View style={onlineIndicatorStyle} />}
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.userInfo}>
              <Text style={usernameStyle}>
                {displayUsername}
              </Text>
              
              {isrequestaccepted === false && (
                <View style={requestBadgeStyle}>
                  <Ionicons name="hourglass-outline" size={12} color="#F59E0B" />
                  <Text style={styles.requestText}>Pending</Text>
                </View>
              )}
            </View>

            <View style={styles.metaInfo}>
              {messageStatus && (
                <Ionicons 
                  name={messageStatus.icon}
                  size={16}
                  color={messageStatus.color}
                  style={styles.statusIcon}
                />
              )}
              <Text style={timeTextStyle}>
                {timeDisplay}
              </Text>
            </View>
          </View>

          {/* Message Row */}
          <View style={styles.messageRow}>
            <Text 
              numberOfLines={2} 
              style={messageTextStyle}
            >
              {messagePreview}
            </Text>

            {isUnread && page === 'primary' && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{unreadcount || 1}</Text>
              </View>
            )}
          </View>

          {/* Action Hints */}
          {isUnread && (
            <View style={styles.actionHints}>
              <View style={[styles.actionHint, { backgroundColor: '#34D399' }]}>
                <Ionicons name="hand-left-outline" size={12} color="white" />
                <Text style={styles.actionHintText}>Long press for options</Text>
              </View>
            </View>
          )}
        </View>

        {/* Chevron Indicator */}
        <View style={styles.chevronSection}>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={isDark ? '#666' : '#999'} 
          />
       </View>
    </Animated.View>
    </TouchableWithoutFeedback>
  )
}), (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  const message = nextProps.message;
  const prevMessage = prevProps.message;
  
  // Only re-render if critical props have changed
  return (
    prevMessage.id === message.id &&
    prevMessage.isread === message.isread &&
    prevMessage.isoppread === message.isoppread &&
    prevMessage.message === message.message &&
    prevMessage.timestamp === message.timestamp &&
    prevMessage.stamp === message.stamp &&
    prevMessage.isonline === message.isonline &&
    prevMessage.unreadcount === message.unreadcount &&
    prevProps.currentuserid === nextProps.currentuserid &&
    prevProps.page === nextProps.page
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 16,
    minHeight: 80,
  },
  profileSection: {
    marginRight: 16,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImageWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyGradient: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
      },
      profileImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  profileImageWithStory: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  contentSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  username: {
    fontSize: 17,
    marginRight: 8,
  },
  requestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  requestText: {
    fontSize: 11,
    color: '#F59E0B',
    marginLeft: 4,
    fontWeight: '600',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 4,
  },
  timeText: {
    fontSize: 13,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: Colors.blue,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  actionHints: {
    marginTop: 8,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionHintText: {
    fontSize: 11,
    color: 'white',
    marginLeft: 4,
    fontWeight: '500',
  },
  chevronSection: {
    marginLeft: 8,
    opacity: 0.5,
      },
})