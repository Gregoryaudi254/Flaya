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
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');
const ITEM_WIDTH = screenWidth * 0.33; // 1/3 of screen width
const ITEM_HEIGHT = ITEM_WIDTH * 1.7; // Rectangle shape with 1.7:1 aspect ratio
const ITEM_SPACING = 10;

const BusinessItem = memo(({ business, onPress, onDeleteBusiness }) => {
  const colorScheme = useColorScheme();
  
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(business)}
      style={styles.businessItemContainer}
    >  
      
      <ImageBackground
        source={{ uri: business.poster }}
        style={styles.businessImage}
        imageStyle={{ borderRadius: 12 }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        >
          <View style={styles.businessInfo}>
            <View style={[styles.categoryBadge, { backgroundColor: business.category === "Natural Medicine" ? Colors.green : (business.categoryColor || '#1E90FF') }]}>
              <Text style={styles.categoryText}>{business.category}</Text>
            </View>
            <Text style={styles.businessName} numberOfLines={2}>{business.businessname}</Text>
            
            {business.distance && (
              <View style={styles.distanceContainer}>
                <Ionicons name="location-outline" size={10} color="#FFFFFF" />
                <Text style={styles.distanceText}>{business.distance}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </ImageBackground>

      {business.saved && <TouchableOpacity onPress={onDeleteBusiness} style={{ position: 'absolute', width: 30, height: 30, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 10 , margin:10}}>
          <View >
          <Ionicons
            name="close-outline"
            size={18}
            color={'#DDDDDD'}
          />
          </View>

        </TouchableOpacity>
       }

    </TouchableOpacity>
  );
});

const Businesses = ({ businesses, type, onBusinessPress, onDeleteFromRecent }) => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  
  const handleBusinessPress = useCallback((business) => {
    if (onBusinessPress) {
      onBusinessPress(business);
    } else {
      router.push({
        pathname: '/businessdetails',
        params: { 
          id: business.id,
          data: encodeURIComponent(JSON.stringify(business))
        }
      });
    }
  }, [onBusinessPress, router]);

  const handleSeeAllPress = useCallback(() => {
    router.push('/businesses');
  }, [router]);

  const renderBusinessItem = useCallback(({ item }) => (
    <BusinessItem 
      business={item} 
      onDeleteBusiness={() => onDeleteFromRecent(item) }
      onPress={handleBusinessPress}
    />
  ), [handleBusinessPress,type]);
  
  const keyExtractor = useCallback((item) => item.id, []);
  
  if (!businesses || businesses.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        {<Text style={[styles.headerText, { color: colorScheme === 'dark' ? Colors.light_main : Colors.dark_main }]}>
         {'Local marketplace'}
        </Text>}
       { type !== 'search' && <TouchableOpacity onPress={handleSeeAllPress}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>}
      </View>
      
      <FlatList
        data={businesses}
        renderItem={renderBusinessItem}
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
    color: '#1E90FF',
  },
  listContent: {
    paddingHorizontal: 10,
  },
  businessItemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  businessImage: {
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
  businessInfo: {
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
  businessName: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginLeft: 3,
  },
});

export default memo(Businesses); 