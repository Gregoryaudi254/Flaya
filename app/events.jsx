import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { functions } from '@/constants/firebase';
import { httpsCallable } from 'firebase/functions';
import { getData } from '@/constants/localstorage';
import { useToast } from 'react-native-toast-notifications';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 30) / 2; // 2 columns with padding
const ITEM_HEIGHT = ITEM_WIDTH * 1.5; // Rectangle shape

const EventsScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Event categories with icons
  const categories = useMemo(() => [
    { id: 'all', name: 'All', icon: 'apps-outline' },
    { id: 'parties', name: 'Parties', icon: 'sparkles' },
    { id: 'music', name: 'Music', icon: 'musical-notes-outline' },
    { id: 'sports', name: 'Sports', icon: 'basketball-outline' },
    { id: 'concerts', name: 'Concerts', icon: 'mic-outline' },
    { id: 'food', name: 'Food', icon: 'restaurant-outline' },
    { id: 'art', name: 'Art', icon: 'color-palette-outline' },
    { id: 'tech', name: 'Tech', icon: 'code-outline' },
    { id: 'education', name: 'Education', icon: 'school-outline' },
    { id: 'community', name: 'Community', icon: 'people-outline' }
  ], []);

  // Category colors
  const categoryColors = useMemo(() => ({
    'Music': '#FF6347',
    'Sports': '#4682B4',
    'Concerts': '#9370DB',
    'Food': '#3CB371',
    'Art': '#FFD700',
    'Tech': '#1E90FF',
    'Education': '#FF8C00',
    'Community': '#20B2AA',
    'Parties': '#20B2AA',
    'All': '#8A2BE2'
  }), []);

  const [isLoadingMore, setLoadingMore] = useState(false);

  const [shouldLoadMore, setShouldLoadMore] = useState(true);

  const fetchEvents = useCallback(async (isRefreshing = false, events = [], isLoadingMore = false) => {
    try {
      if (!isLoadingMore) {
        if (isRefreshing) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }
      }else {
        setLoadingMore(true)
      }  
      
      const userInfo = await getData('@profile_info');
      
      if (!userInfo || !userInfo.uid) {
        showToast("User information not found");
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      // Call the Firebase function with simplified parameters
      const getEvents = httpsCallable(functions, 'getEventsNearby');
      const response = await getEvents({ 
        userId: userInfo.uid,
        category: selectedCategory !== 'All' ? selectedCategory : null,
        events:events,
        limit: 5
      });

      console.log(JSON.stringify(response))

      if (response.data && response.data.events.length > 0) {
        // Add color information to events
        const eventsWithColors = response.data.events.map(event => ({
          ...event,
          categoryColor: categoryColors[event.category] || categoryColors.All
        }));

        console.log(JSON.stringify(eventsWithColors));

        setShouldLoadMore(true);

        setEvents((previousEvents) => {
            if (isLoadingMore) {
                return [...previousEvents,...eventsWithColors]
            }

            return eventsWithColors
        })
      } else {

        setShouldLoadMore(false);

        if(!isLoadingMore) {
            setEvents([])
        }
        
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      showToast("Couldn't load events");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, categoryColors]);

  useEffect(() => {
    fetchEvents(false, []);
  }, [selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents(true, []);
  }, [fetchEvents]);

  const showToast = (message) => {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  };

  const handleEventPress = useCallback((event) => {
    router.push({
      pathname: '/eventdetails',
      params: { 
        id: event.id,
        data: encodeURIComponent(JSON.stringify(event))
      }
    });
  }, [router]);

  const renderCategoryItem = useCallback(({ item }) => {
    const isSelected = selectedCategory === item.name;
    const categoryColor = categoryColors[item.name] || categoryColors.All;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryButton,
          {
            backgroundColor: isSelected 
              ? categoryColor 
              : isDark ? '#333333' : '#F0F0F0',
            borderWidth: isSelected ? 0 : 1,
            borderColor: 'rgba(150,150,150,0.3)'
          }
        ]}
        onPress={() => setSelectedCategory(item.name)}
      >
        <Ionicons 
          name={item.icon} 
          size={16} 
          color={isSelected ? '#FFFFFF' : (isDark ? '#DDDDDD' : '#666666')} 
        />
        <Text 
          style={[
            styles.categoryText, 
            { 
              color: isSelected 
                ? '#FFFFFF' 
                : (isDark ? '#DDDDDD' : '#666666'),
              marginLeft: 5
            }
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedCategory, isDark, categoryColors]);

  const onButtonPress = useCallback(()=>{
    fetchEvents(false, [])
  })

  const renderEventItem = useCallback(({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handleEventPress(item)}
      style={styles.eventItem}
    >
      <ImageBackground
        source={{ uri: item.poster }}
        style={styles.eventImage}
        imageStyle={{ borderRadius: 12 }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        >
          <View style={styles.eventInfoOverlay}>
            <View style={[styles.categoryBadge, { backgroundColor: item.categoryColor }]}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
            
            {item.distance && (
              <View style={styles.distanceContainer}>
                <Ionicons name="location-outline" size={12} color="#FFFFFF" />
                <Text style={styles.distanceText}>{item.distance}</Text>
              </View>
            )}
            
            <Text style={styles.eventTitle} numberOfLines={2}>{item.name}</Text>
            
            {item.startTime && (
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
                <Text style={styles.dateText}>
                  {item.startDate}
                </Text>
              </View>
            )}
            
            {item.attendees > 0 && (
              <View style={styles.attendeesRow}>
                <View style={styles.attendeeIcon}>
                  <Text style={styles.attendeeCount}>{item.attendees}</Text>
                </View>
                <Text style={styles.attendeesText}>Going</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  ), [handleEventPress]);


  const footerComponent = useCallback(() => {
    return isLoadingMore ? (
      <View style={{margin: 20, paddingBottom: 20, alignSelf: 'center'}}>
        <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
      </View>
    ) : (
      <View style={{height: 40}} />
    );
  }, [isLoadingMore, isDark]);

  const getMoreEvents = useCallback(() => {
    if (!isLoadingMore && events.length > 0 && shouldLoadMore) {
      setLoadingMore(true);
      fetchEvents(false, events, true);
    }
  }, [events, isLoadingMore, fetchEvents, shouldLoadMore]);

  

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <Stack.Screen
        options={{
          headerTitle: "Happening around you",
          headerTitleStyle: { 
            color: isDark ? '#FFFFFF' : '#000000',
            fontWeight: 'bold',
          },
          headerStyle: { 
            backgroundColor: isDark ? '#121212' : '#F5F5F5',
            
          },
          headerShadowVisible: false,
        }}
      />


      <View style={{flex: 1}}>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        style={{ maxHeight:70}}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.categoriesContainer}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
          <Text style={[styles.loadingText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            Finding events near you...
          </Text>
        </View>
      ) : events.length > 0 ? (
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
         
          columnWrapperStyle={styles.eventRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.eventsContainer}
          ListFooterComponent={footerComponent}
          onEndReachedThreshold={0.5}
          onEndReached={getMoreEvents}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.dark_main]}
              tintColor={isDark ? '#FFFFFF' : Colors.dark_main}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name="calendar-outline" 
            size={80} 
            color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} 
          />
          <Text style={[styles.emptyText, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
            No {selectedCategory !== 'All' ? selectedCategory : ''} events found nearby
          </Text>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: Colors.blue, height:40 }]}
            onPress={onButtonPress}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      </View>
      
    
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoriesContainer: {
    paddingBottom:15,
    paddingHorizontal: 10,
  
    
    maxHeight:70
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventsContainer: {
    padding: 10,
   
  },
  eventRow: {
    justifyContent: 'space-between',
  },
  eventItem: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  eventInfoOverlay: {
    padding: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  attendeeCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  attendeesText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default EventsScreen; 