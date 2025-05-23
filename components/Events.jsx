import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageBackground
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const ITEM_WIDTH = screenWidth * 0.33; // 1/3 of screen width
const ITEM_HEIGHT = ITEM_WIDTH * 1.7; // Rectangle shape with 1.7:1 aspect ratio
const ITEM_SPACING = 10;

const EventItem = memo(({ event, onPress }) => {
  const colorScheme = useColorScheme();
  
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(event)}
      style={styles.eventItemContainer}
    >
      <ImageBackground
        source={{ uri: event.poster }}
        style={styles.eventImage}
        imageStyle={{ borderRadius: 12 }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        >
          <View style={styles.eventInfo}>
            <View style={[styles.categoryBadge, { backgroundColor: event.categoryColor || '#FF6347' }]}>
              <Text style={styles.categoryText}>{event.category}</Text>
            </View>
            <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
});

const Events = ({ events, onEventPress }) => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  
  const handleEventPress = useCallback((event) => {
    if (onEventPress) {
      onEventPress(event);
    } else {
      router.push({
        pathname: '/eventdetails',
        params: { 
          id: event.id,
          data: encodeURIComponent(JSON.stringify(event))
        }
      });
    }
  }, [onEventPress, router]);

  const handleSeeAllPress = useCallback(() => {
    router.push('/events');
  }, [router]);

  const renderEventItem = useCallback(({ item }) => (
    <EventItem 
      event={item} 
      onPress={handleEventPress}
    />
  ), [handleEventPress]);
  
  const keyExtractor = useCallback((item) => item.id, []);
  
  if (!events || events.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerText, { color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main }]}>
          Happening soon
        </Text>
        <TouchableOpacity onPress={handleSeeAllPress}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={ITEM_WIDTH + ITEM_SPACING}
        decelerationRate="fast"
        ItemSeparatorComponent={() => <View style={{ width: ITEM_SPACING }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF6347',
  },
  listContent: {
    paddingHorizontal: 10,
  },
  eventItemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  eventInfo: {
    position: 'absolute',
    bottom: 10,
    left: 8,
    right: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  categoryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventName: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default memo(Events);
