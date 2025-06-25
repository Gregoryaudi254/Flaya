import { StyleSheet, Text, View,Image,TouchableOpacity,FlatList,Switch ,ActivityIndicator, TextInput } from 'react-native'
import React,{useLayoutEffect,useMemo,useRef,useState,useCallback,useEffect} from 'react'
import Animated from 'react-native-reanimated';

import Primarymessages from '@/components/Primarymessages';
import Requestsmessaging from '@/components/Requestsmessaging';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
const Tab = createMaterialTopTabNavigator();
import {useNavigation} from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { Colors } from '@/constants/Colors';
import { Data } from '@/constants/Data';

import ActiveUsersItem from '@/components/ActiveUsersItem';
import { doc, setDoc,GeoPoint,serverTimestamp, where , onSnapshot, collection, updateDoc, query} from 'firebase/firestore'; 

import { getData, storeData } from '@/constants/localstorage';
import { getDistance } from 'geolib';
import { db } from '@/constants/firebase';
import { getDataBackend, getLocation, storeUserLocation } from '@/constants/common';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import MemoizedBottomSheetMessageEdit from '@/components/MemoizedBottomSheetMessageEdit';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const CustomTabBar = React.memo(({ state, descriptors, navigation, counts, colorScheme }) => {
  const isDark = colorScheme === 'dark';

    return (
    <View style={[styles.modernTabBar, {
      backgroundColor: isDark ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
  
          const onPress = useCallback(() => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
  
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
        }, [isFocused, route.key, route.name]);
  
          const onLongPress = useCallback(() => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
        }, [route.key]);
  
          return (
          <Animated.View
              key={route.key}
              style={[
              styles.modernTabItem,
              {
                backgroundColor: isFocused ? Colors.red_orange : 'transparent',
                transform: [
                  {
                    scale: isFocused ? 1.02 : 1,
                  }
                ],
                elevation: isFocused ? 2 : 0,
                shadowColor: isFocused ? Colors.red_orange : 'transparent',
                shadowOffset: {
                  width: 0,
                  height: isFocused ? 2 : 0,
                },
                shadowOpacity: isFocused ? 0.25 : 0,
                shadowRadius: isFocused ? 3.84 : 0,
              }
            ]}
          >
            <TouchableOpacity
                onPress={onPress}
                onLongPress={onLongPress}
              style={styles.tabTouchable}
              activeOpacity={0.8}
            >
              <View style={styles.tabContent}>
                <Animated.Text style={[
                  styles.tabText,
                  {
                    color: isFocused ? 'white' : (isDark ? Colors.light_main : Colors.dark_main),
                    fontWeight: isFocused ? '700' : '600',
                    transform: [
                      {
                        scale: isFocused ? 1.05 : 1,
                      }
                    ],
                  }
                ]}>
                {route.name}
                </Animated.Text>

                {counts[route.name] > 0 && (
                  <Animated.View 
                    style={[
                      styles.modernBadge,
                      {
                        transform: [
                          {
                            scale: isFocused ? 1.1 : 1,
                          }
                        ],
                      }, {backgroundColor: isDark ? Colors.light_main : Colors.dark_main}
                    ]}
                  >
                    <Text style={[styles.badgeText, {color: isDark ? Colors.dark_main : Colors.light_main}]}>{counts[route.name]}</Text>
                  </Animated.View>
                )}
            </View>
            </TouchableOpacity>
          </Animated.View>
          );
        })}
      </View>
    );
  });

  const TabScreens = React.memo(({ searchQuery }) => {
    const [counts, setCounts] = useState({ Primary: 0, Requests: 0 });
    const [profileInfo, setProfileInfo] = useState(null);
  const colorScheme = useColorScheme();

  // Memoized query for better performance
  const unreadMessagesQuery = useMemo(() => {
    if (!profileInfo?.uid) return null;
    const messagesRef = collection(db, `users/${profileInfo.uid}/messages`);
    return query(messagesRef, where("isread", "==", false));
  }, [profileInfo?.uid]);

    useEffect(() => {
    if (!unreadMessagesQuery) return;
    
      const unsubscribe = onSnapshot(unreadMessagesQuery, (snapshot) => {
        let requestTrueCount = 0;
        let requestFalseCount = 0;
  
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isrequest === true) {
            requestTrueCount++;
          } else if (data.isrequest === false) {
            requestFalseCount++;
          }
        });
  
        setCounts({ Primary: requestFalseCount, Requests: requestTrueCount })
      });
  
      return () => unsubscribe();
  }, [unreadMessagesQuery]);

    useEffect(() => {
      const getInfo = async () => {
        const userInfo = await getData('@profile_info');
        setProfileInfo(userInfo);
      }
      getInfo();
  }, [])

  // Memoized tab bar component
  const customTabBar = useCallback((props) => 
    <CustomTabBar {...props} counts={counts} colorScheme={colorScheme} />, 
    [counts, colorScheme]
  );

  // Memoized screen components with proper props
  const primaryScreen = useCallback(() => 
    <Primarymessages searchQuery={searchQuery} />, 
    [searchQuery]
  );

  const requestsScreen = useCallback(() => 
    <Requestsmessaging searchQuery={searchQuery} />, 
    [searchQuery]
  );
  
      return (
        <Tab.Navigator
        screenOptions={{
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: 'transparent',
            elevation: 0,
          shadowOpacity: 0,
          },
          tabBarIndicatorStyle: {
            backgroundColor: 'transparent',
          },
        }}
      tabBar={customTabBar}
    >
      <Tab.Screen name="Primary" component={primaryScreen} />
      <Tab.Screen name="Requests" component={requestsScreen} />
        </Tab.Navigator>
      );
});

TabScreens.displayName = 'TabScreens';

const messaging = React.memo(() => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation();

  // State management with minimal re-renders
  const [showDistance,setShowDistance] = useState(false);
  const [showFlatList, setShowFlatList] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [profileInfo, setProfileInfo] = useState(null);
  const [isHorizontalFlatlistLoading,setHorizontalFlatlistLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setSearchVisible] = useState(false);
  const [location,setLocation] = useState();
  const [islocationaccepted,setlocationaccepted] = useState(null);

  // Refs
  const bottomSheetRef = useRef(null);

  // Memoized constants
  const initialSnapIndex = useMemo(() => -1, []);
  const snapPoinst = useMemo(() => ['80%','100%'],[]);

  // Optimized event handlers
  const handleHeaderRightPress = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleSearchPress = useCallback(() => {
    setSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      setSearchQuery('');
    }
  }, [isSearchVisible]);

  // Memoized header button component
  const headerRightComponent = useMemo(() => (
    <View style={{ flexDirection: 'row', alignItems: 'center'}}>
      <TouchableOpacity 
        onPress={handleHeaderRightPress}
        style={[styles.headerButton, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
        }]}
      >
        <Ionicons 
          name="settings-outline" 
          size={20} 
          color={isDark ? Colors.light_main : Colors.dark_main} 
        />
      </TouchableOpacity>
    </View>
  ), [handleHeaderRightPress, isDark]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => headerRightComponent,
    });
  }, [navigation, headerRightComponent]);

  // Optimized getUsersOnlineNearby with better performance
  const getUsersOnlineNearby = useCallback(async () => {
    let settings = await getData('@settings');
    const userInfo = await getData('@profile_info');
    setProfileInfo(userInfo);

    if (!settings) {
      settings = { onlinestatusarea:false }
    }

    setShowFlatList(settings.onlinestatusarea);
    await storeData('@settings', settings);

    if (!settings.onlinestatusarea) return;

    setHorizontalFlatlistLoading(true);
    const currentLocation = await getLocation();
    setLocation(currentLocation)

    if (currentLocation === null) {
      setlocationaccepted(false);
      setHorizontalFlatlistLoading(false);
      return;
    }

    setlocationaccepted(true);
    await storeUserLocation(currentLocation);
    const onlineUsers = await getDataBackend("getOnlineUsers", {id:userInfo.uid});
  
    if (onlineUsers.length > 0) {
      setActiveUsers(onlineUsers);
    } else {
      setActiveUsers([]);
    }

    setHorizontalFlatlistLoading(false);
  },[showDistance]) 

  useEffect(() => {
    getUsersOnlineNearby();
  }, [getUsersOnlineNearby]);

  const setOnlineAreaStatus = useCallback(async (status) => {
    const userInfo = await getData('@profile_info');
    const ref = doc(db,`users/${userInfo.uid}`);
    await updateDoc(ref,{isshowingonlinearea:status, isshowingdistance:showDistance});
  },[showDistance])

  const handleBottomPress = useCallback( async () =>{
    let settings = await getData('@settings');
    
    if (!settings) {
      settings = {} 
    }
    bottomSheetRef.current?.close();

    if (showFlatList) {
      settings.onlinestatusarea = false;
    }else {
      settings.onlinestatusarea = true;
    }
    await storeData('@settings', settings);
    getUsersOnlineNearby();
    setOnlineAreaStatus(settings.onlinestatusarea);
  },[showFlatList, getUsersOnlineNearby, setOnlineAreaStatus]);

  const handleOnActiveUserPress = useCallback((item) => {
    const oppUserInfo = {
      username:item.username,
      uid:item.id,
      requeststatus:null
    }

    router.push({
      pathname: '/chatglobal',
      params: { data: JSON.stringify(oppUserInfo) }
    });
  }, [router])

  const renderItem = useCallback(
    ({ item }) => (
      <ActiveUsersItem activeUser={item} currentuserlocation={location} onPress={handleOnActiveUserPress}/>
    ),[location, handleOnActiveUserPress]
  );

  // Memoized search input component
  const searchComponent = useMemo(() => {
    if (!isSearchVisible) return null;
    
    return (
      <View style={[styles.searchContainer, {
        backgroundColor: isDark ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      }]}>
        <View style={[styles.searchInputContainer, {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        }]}>
          <Ionicons 
            name="search" 
            size={20} 
            color={isDark ? '#888' : '#666'} 
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, {
              color: isDark ? Colors.light_main : Colors.dark_main,
            }]}
            placeholder="Search conversations..."
            placeholderTextColor={isDark ? '#888' : '#666'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons 
                name="close-circle" 
                size={20} 
                color={isDark ? '#888' : '#666'} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [isSearchVisible, isDark, searchQuery]);

  // Memoized FlatList props for ActiveUsers
  const activeUsersFlatListProps = useMemo(() => ({
    horizontal: true,
    showsHorizontalScrollIndicator: false,
    data: activeUsers,
    keyExtractor: (user) => user.id,
    renderItem: renderItem,
    contentContainerStyle: styles.onlineUsersList,
    removeClippedSubviews: true,
    maxToRenderPerBatch: 5,
    windowSize: 5,
    initialNumToRender: 5,
  }), [activeUsers, renderItem]);

  // Memoized TabScreens with proper props
  const tabScreensComponent = useMemo(() => 
    <TabScreens searchQuery={searchQuery} />, 
    [searchQuery]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, {
        backgroundColor: isDark ? Colors.dark_background : Colors.light_background
      }]}>

        {/* Enhanced Search Bar */}
        {searchComponent}

        {/* Enhanced Online Users Section */}
        {showFlatList && (
          <View style={[styles.onlineSection, {
            backgroundColor: isDark ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          }]}>
            <View style={styles.onlineHeader}>
              <View style={styles.onlineInfo}>
                <View style={styles.onlineIndicator} />
                <Text style={[styles.onlineText, {
                  color: isDark ? Colors.light_main : Colors.dark_main
                }]}>
                  People nearby
                </Text>
        </View>

              <TouchableOpacity 
                onPress={getUsersOnlineNearby}
                style={[styles.refreshButton, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                }]}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={isDark ? Colors.light_main : Colors.dark_main}
                />
          </TouchableOpacity>
            </View>

            {isHorizontalFlatlistLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.blue} />
                <Text style={[styles.loadingText, {
                  color: isDark ? '#888' : '#666'
                }]}>
                  Finding people nearby...
                </Text>
              </View>
            ) : (
              activeUsers.length > 0 ? (
                <FlatList {...activeUsersFlatListProps} />
              ) : (
                // Beautiful Redesigned No Users Found State
                <View style={[styles.noUsersContainer, {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                }]}>
                  
                  <View style={[styles.noUsersCard, {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  }]}>
                    
                    {/* Left Section - Icon */}
                    <View style={[styles.noUsersIconSection, {
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                    }]}>
                      <Ionicons name="people-outline" size={24} color={Colors.blue} />
                    </View>

                    {/* Center Section - Text Content */}
                    <View style={styles.noUsersContentSection}>
                      <Text style={[styles.noUsersMainText, {
                        color: isDark ? Colors.light_main : Colors.dark_main
                      }]}>
                        No one online
                      </Text>
                      <Text style={[styles.noUsersSubText, {
                        color: isDark ? '#888' : '#666'
                      }]}>
                        Check back in a moment
                      </Text>
                    </View>

                    {/* Right Section - Refresh Button */}
                    <TouchableOpacity 
                      onPress={getUsersOnlineNearby}
                      style={[styles.compactRefreshButton, {
                        backgroundColor: Colors.blue,
                      }]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="refresh" size={16} color="white" />
                    </TouchableOpacity>

            </View>

                </View>
              )
            )}
          </View>
        )}

        {/* Location Permission Section */}
        {islocationaccepted === false && showFlatList && (
          <View style={styles.locationPermissionContainer}>
            <View style={[styles.locationCard, {
              backgroundColor: isDark ? 'rgba(20, 20, 20, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            }]}>
              <Ionicons 
                name="location-outline" 
                size={48} 
                color={Colors.blue} 
                style={styles.locationIcon}
              />
              <Text style={[styles.locationTitle, {
                color: isDark ? Colors.light_main : Colors.dark_main
              }]}>
                Location Access Required
              </Text>
              <Text style={[styles.locationSubtitle, {
                color: isDark ? '#888' : '#666'
              }]}>
                We need your location to show people nearby
              </Text>
              <TouchableOpacity 
                onPress={getUsersOnlineNearby}
                style={styles.locationButton}
              >
                <LinearGradient
                  colors={[Colors.blue, '#0EA5E9']}
                  style={styles.locationButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="location" size={20} color="white" />
                  <Text style={styles.locationButtonText}>Enable Location</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
              </View>
            )}

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {tabScreensComponent}  
        </View>

        <MemoizedBottomSheetMessageEdit
          bottomSheetRef={bottomSheetRef}
          initialSnapIndex={initialSnapIndex}
          snapPoints={snapPoinst}
          colorScheme={colorScheme}
          Colors={Colors}
          showFlatList={showFlatList}
          showDistance={showDistance}
          setShowDistance={setShowDistance}
          handleBottomPress={handleBottomPress}
        />

      </View>
    </GestureHandlerRootView>
  )
});

messaging.displayName = 'messaging';

export default messaging

const styles = StyleSheet.create({
    container: {
    flex: 1,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  modernTabBar: {
        flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  modernTabItem: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
    height: 50,
  },
  tabTouchable: {
        flex: 1,
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modernBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  onlineSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  onlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  onlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: 8,
  },
  onlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
      },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
  },
  onlineUsersList: {
    paddingHorizontal: 16,
  },
  locationPermissionContainer: {
    padding: 20,
  },
  locationCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  locationIcon: {
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  locationSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  locationButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  locationButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  contentContainer: {
    flex: 1,
  },
  noUsersContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 80,
    paddingHorizontal: 20,
  },
  noUsersCard: {
        flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    maxHeight: 80,
  },
  noUsersIconSection: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noUsersContentSection: {
    flex: 1,
    justifyContent: 'center',
  },
  noUsersMainText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  noUsersSubText: {
    fontSize: 12,
    opacity: 0.7,
  },
  compactRefreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
        },
})