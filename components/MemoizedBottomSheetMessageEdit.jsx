import React, { memo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet, Animated } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const MemoizedBottomSheetMessageEdit = memo(({
  bottomSheetRef,
  initialSnapIndex,
  snapPoints,
  colorScheme,
  Colors,
  showFlatList,
  showDistance,
  setShowDistance,
  handleBottomPress,
}) => {
  const isDark = colorScheme === 'dark';
  const fadeAnim = useRef(new Animated.Value(1)).current; // Start visible
  const slideAnim = useRef(new Animated.Value(0)).current; // Start in position

  // Animate content when bottom sheet opens
  useEffect(() => {
    if (initialSnapIndex >= 0) {
      // Animate in when opening
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
    }
  }, [initialSnapIndex, fadeAnim, slideAnim]);

  const handleSwitchToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDistance((prev) => !prev);
  };

  const handleActionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleBottomPress();
  };

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
      snapPoints={snapPoints}
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
            <View style={[styles.iconContainer, {
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
            }]}>
              <Ionicons 
                name={showFlatList ? "eye-off" : "eye"} 
                size={24} 
                color={Colors.blue} 
              />
            </View>
            
            <Text style={[styles.title, {
              color: isDark ? Colors.light_main : Colors.dark_main,
            }]}>
              {showFlatList ? 'Going offline?' : 'See active users?'}
            </Text>

            <Text style={[styles.subtitle, {
              color: isDark ? '#888' : '#666',
            }]}>
              {showFlatList
                ? 'You will no longer see active users, and your profile will also be removed from the list of active users'
                : "You'll see active users in your area and also be visible to others. For privacy reasons, the displayed distance will never go below 100 meters."}
            </Text>
          </View>

          {/* Divider */}
          <View style={[styles.divider, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }]} />

          {/* Distance Settings */}
          {!showFlatList && (
            <>
              <View style={styles.settingsSection}>
                <Text style={[styles.sectionTitle, {
                  color: isDark ? Colors.light_main : Colors.dark_main,
                }]}>
                  Privacy Settings
                </Text>

                <View style={[styles.settingItem, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                }]}>
                  <View style={styles.settingInfo}>
                    <View style={[styles.settingIcon, {
                      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                    }]}>
                      <Ionicons name="location" size={16} color="#22C55E" />
                    </View>
                    <Text style={[styles.settingLabel, {
                      color: isDark ? Colors.light_main : Colors.dark_main,
                    }]}>
                      Show your distance
                    </Text>
                  </View>

                  <Switch
                    trackColor={{ false: isDark ? '#444' : '#E5E5E5', true: Colors.blue }}
                    thumbColor={'#FFFFFF'}
                    ios_backgroundColor={isDark ? '#444' : '#E5E5E5'}
                    value={showDistance}
                    onValueChange={handleSwitchToggle}
                  />
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.divider, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }]} />
            </>
          )}

          {/* Action Button */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              onPress={handleActionPress}
              style={[styles.actionButton, {
                backgroundColor: showFlatList ? '#EF4444' : Colors.blue,
              }]}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={showFlatList ? "eye-off" : "eye"} 
                size={20} 
                color="white" 
                style={styles.actionIcon}
              />
              <Text style={styles.actionText}>
                {showFlatList ? 'GO OFFLINE' : 'GO ONLINE'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.actionHint, {
              color: isDark ? '#666' : '#999',
            }]}>
              {showFlatList 
                ? 'This will remove you from the active users list'
                : 'This will make you visible to other users nearby'
              }
            </Text>
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
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: '85%',
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  settingsSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionSection: {
    flex: 1,
  
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
   
    borderRadius: 16,
    marginBottom: 12,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  actionHint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default MemoizedBottomSheetMessageEdit;
