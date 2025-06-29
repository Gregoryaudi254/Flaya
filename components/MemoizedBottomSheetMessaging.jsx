import React, { memo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { defaultProfileImage } from '@/constants/common';

const { width: screenWidth } = Dimensions.get('window');

const MemoizedBottomSheetMessaging = memo(({ 
  selectedMessage, 
  initialSnapIndex, 
  snapPoinst, 
  bottomSheetRef, 
  handleMarkAsRead, 
  handleDelete, 
  handleBlock,
  handleAcceptRequest,
  handleDeclineRequest,
  colorScheme,
  page = 'primary'
}) => {
  const isDark = colorScheme === 'dark';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Animate content when bottom sheet opens
  useEffect(() => {
    if (selectedMessage?.id) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [selectedMessage?.id]);

  const ActionButton = ({ icon, label, onPress, color = 'white', backgroundColor, destructive = false }) => (
    <TouchableOpacity
      style={[styles.actionButton, {
        backgroundColor: backgroundColor || (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
        borderColor: destructive ? '#EF4444' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
      }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIconContainer, {
        backgroundColor: destructive ? '#EF4444' : Colors.blue,
      }]}>
        <Ionicons name={icon} size={20} color="white" />
      </View>
      <Text style={[styles.actionLabel, {
        color: destructive ? '#EF4444' : (isDark ? Colors.light_main : Colors.dark_main),
      }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const RequestActionButton = ({ icon, label, onPress, primary = false }) => (
    <TouchableOpacity
      style={[styles.requestActionButton, {
        backgroundColor: primary ? Colors.blue : 'transparent',
        borderColor: primary ? Colors.blue : '#EF4444',
        borderWidth: 2,
      }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      activeOpacity={0.8}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={primary ? 'white' : '#EF4444'} 
        style={{ marginRight: 8 }}
      />
      <Text style={[styles.requestActionText, {
        color: primary ? 'white' : '#EF4444',
        fontWeight: primary ? '700' : '600',
      }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
  <BottomSheet  
    enablePanDownToClose={true} 
    ref={bottomSheetRef}
    index={initialSnapIndex}
      backgroundStyle={{
        backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? '#666' : '#CCC',
        width: 40,
        height: 4,
      }}
    snapPoints={snapPoinst}
  >
      <BottomSheetView style={styles.container}>
        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
          
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <Image
                source={{ uri: selectedMessage?.photo || defaultProfileImage }}
                style={[styles.profileImage, {
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                }]}
              />
              <View style={styles.userDetails}>
                <Text style={[styles.username, {
                  color: isDark ? Colors.light_main : Colors.dark_main,
                }]}>
        {selectedMessage?.username}
      </Text>
                <Text style={[styles.messagePreview, {
                  color: isDark ? '#888' : '#666',
                }]}>
                  {selectedMessage?.message?.length > 40 
                    ? `${selectedMessage.message.substring(0, 40)}...` 
                    : selectedMessage?.message}
                </Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }]} />

          {/* Request Actions (for requests page) */}
          {page === 'requests' && (
            <View style={styles.requestActions}>
              <Text style={[styles.sectionTitle, {
                color: isDark ? Colors.light_main : Colors.dark_main,
              }]}>
                Message Request
          </Text>
              <View style={styles.requestButtonsContainer}>
                <RequestActionButton
                  icon="checkmark-circle"
                  label="Accept"
                  onPress={handleAcceptRequest}
                  primary={true}
                />
                <RequestActionButton
                  icon="close-circle"
                  label="Decline"
                  onPress={handleDeclineRequest}
                />
              </View>
              
              {/* Divider */}
              <View style={[styles.divider, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                marginVertical: 20,
              }]} />
            </View>
          )}

          {/* Standard Actions */}
          <View style={styles.actions}>
            <Text style={[styles.sectionTitle, {
              color: isDark ? Colors.light_main : Colors.dark_main,
            }]}>
              Actions
        </Text>

            <View style={styles.actionsGrid}>
              {/* Mark as Read - only show if unread and not sender */}
              {(selectedMessage && !selectedMessage.isread && selectedMessage.senderid !== selectedMessage.currentuserid) && (
                <ActionButton
                  icon="checkmark-circle-outline"
                  label="Mark as Read"
                  onPress={handleMarkAsRead}
                />
              )}

              <ActionButton
                icon="trash-outline"
                label="Delete"
                onPress={handleDelete}
                destructive={true}
              />

              <ActionButton
                icon="ban-outline"
                label="Block User"
                onPress={handleBlock}
                destructive={true}
              />
            </View>
    </View>

        </Animated.View>
      </BottomSheetView>
  </BottomSheet>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 14,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  requestActions: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  requestButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  requestActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  requestActionText: {
    fontSize: 16,
  },
  actions: {
    flex: 1,
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});

export default MemoizedBottomSheetMessaging;
