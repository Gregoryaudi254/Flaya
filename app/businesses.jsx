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
import { useAuth } from '@/constants/AuthContext';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 30) / 2; // 2 columns with padding
const ITEM_HEIGHT = ITEM_WIDTH * 1.5; // Rectangle shape

const BusinessesScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const toast = useToast();

  const {user} = useAuth()

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Business categories with icons
  const categories = useMemo(() => [
    { id: 'all', name: 'All', icon: 'apps-outline' },
    { id: 'food', name: 'Food', icon: 'restaurant-outline' },
    { id: 'fashion', name: 'Fashion', icon: 'shirt-outline' },
    { id: 'groceries', name: 'Groceries', icon: 'cart-outline' },
    { id: 'services', name: 'Services', icon: 'construct-outline' },
    { id: 'health', name: 'Health', icon: 'fitness-outline' },
    { id: 'beauty', name: 'Beauty', icon: 'cut-outline' },
    { id: 'electronics', name: 'Electronics', icon: 'hardware-chip-outline' },
    { id: 'home accesories', name: 'Home Accesories', icon: 'bed-outline' },
    { id: 'drinks & beverages', name: 'Drinks & Beverages', icon: 'wine-outline' },
    { id: 'entertainment', name: 'Entertainment', icon: 'musical-notes-outline' },
    { id: 'other', name: 'Other', icon: 'ellipsis-horizontal-outline' }
  ], []);

  // Category colors
  const categoryColors = useMemo(() => ({
    'Restaurant': '#FF6347',
    'Fashion': '#4682B4',
    'Services': '#9370DB',
    'Groceries': Colors.green,
    'Health': '#3CB371',
    'Beauty': '#FFD700',
    'Electronics': '#1E90FF',
    'Home Accesories': '#FF8C00',
    'Drinks & Beverages': '#20B2AA',
    'Entertainment': '#DA70D6',
    'All': '#8A2BE2'
  }), []);

  const [isLoadingMore, setLoadingMore] = useState(false);
  const [shouldLoadMore, setShouldLoadMore] = useState(true);

  const fetchBusinesses = useCallback(async (isRefreshing = false, businesses = [], isLoadingMore = false) => {
    try {
      if (!isLoadingMore) {
        if (isRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }  
      
     
      
      if (!user.uid) {
        showToast("User information not found");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Call the Firebase function with simplified parameters
      const getBusinesses = httpsCallable(functions, 'getBusinessesNearby');
      const response = await getBusinesses({ 
        userId: user.uid,
        category: selectedCategory !== 'All' ? selectedCategory : null,
        businesses: businesses,
        limit: 5
      });

      if (response.data && response.data.businesses.length > 0) {
        // Add color information to businesses
        const businessesWithColors = response.data.businesses.map(business => ({
          ...business,
          categoryColor: business.category === "Natural Medicine" ? Colors.green : (categoryColors[business.category] || categoryColors.All)
        }));

        setShouldLoadMore(true);

        setBusinesses((previousBusinesses) => {
          if (isLoadingMore) {
            return [...previousBusinesses, ...businessesWithColors];
          }
          return businessesWithColors;
        });
      } else {
        setShouldLoadMore(false);

        if (!isLoadingMore) {
          setBusinesses([]);
        }
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
      showToast("Couldn't load businesses");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, categoryColors]);

  useEffect(() => {
    fetchBusinesses(false, []);
  }, [selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBusinesses(true, []);
  }, [fetchBusinesses]);

  const showToast = (message) => {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  };

  const handleBusinessPress = useCallback((business) => {
    router.push({
      pathname: '/oppuserprofile',
      params: { 
        uid: business.ownerid,
      }
    });
  }, [router]);

  const renderCategoryItem = useCallback(({ item }) => {
    const isSelected = selectedCategory === item.name;
    let categoryColor = categoryColors[item.name] || categoryColors.All;

    if (item.category === "Natural Medicine") {
        categoryColor = Colors.green;
    }

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

  const onButtonPress = useCallback(() => {
    fetchBusinesses(false, []);
  }, [fetchBusinesses]);

  const renderBusinessItem = useCallback(({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handleBusinessPress(item)}
      style={styles.businessItem}
    >
      <ImageBackground
        source={{ uri: item.poster }}
        style={styles.businessImage}
        imageStyle={{ borderRadius: 12 }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        >
          <View style={styles.businessInfoOverlay}>
            <View style={[styles.categoryBadge, { backgroundColor: item.categoryColor }]}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
            
            {item.distance && (
              <View style={styles.distanceContainer}>
                <Ionicons name="location-outline" size={12} color="#FFFFFF" />
                <Text style={styles.distanceText}>{item.distance}</Text>
              </View>
            )}
            
            <Text style={styles.businessTitle} numberOfLines={2}>{item.businessname}</Text>
            
            {item.address && (
              <View style={styles.addressRow}>
                <Ionicons name="map-outline" size={12} color="#FFFFFF" />
                <Text style={styles.addressText} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  ), [handleBusinessPress]);

  const footerComponent = useCallback(() => {
    return isLoadingMore ? (
      <View style={{margin: 20, paddingBottom: 20, alignSelf: 'center'}}>
        <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
      </View>
    ) : (
      <View style={{height: 40}} />
    );
  }, [isLoadingMore, isDark]);

  const getMoreBusinesses = useCallback(() => {
    if (!isLoadingMore && businesses.length > 0 && shouldLoadMore) {
      setLoadingMore(true);
      fetchBusinesses(false, businesses, true);
    }
  }, [businesses, isLoadingMore, fetchBusinesses, shouldLoadMore]);

  const goToSearch = useCallback(()=>{
    router.push({
      pathname: '/search',
    });

  },[router])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <Stack.Screen
        options={{
          headerRight:() => (
            <TouchableOpacity onPress={goToSearch}>
              <Ionicons
                name="search"
                size={24}
                color={isDark ? '#FFFFFF' : '#000000'}
                style={{ marginRight: 16 }}
              />
            </TouchableOpacity>
          ),
          headerTitle: "Local Marketplace",
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
          style={{ maxHeight: 70 }}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoriesContainer}
        />
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
            <Text style={[styles.loadingText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
              Finding businesses near you...
            </Text>
          </View>
        ) : businesses.length > 0 ? (
          <FlatList
            data={businesses}
            renderItem={renderBusinessItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.businessRow}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.businessesContainer}
            ListFooterComponent={footerComponent}
            onEndReachedThreshold={0.5}
            onEndReached={getMoreBusinesses}
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
              name="business-outline" 
              size={80} 
              color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} 
            />
            <Text style={[styles.emptyText, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
              No {selectedCategory !== 'All' ? selectedCategory : ''} businesses found nearby
            </Text>
            <TouchableOpacity 
              style={[styles.refreshButton, { backgroundColor: Colors.blue, height: 40 }]}
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
    paddingBottom: 15,
    paddingHorizontal: 10,
    maxHeight: 70
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
  businessesContainer: {
    padding: 10,
  },
  businessRow: {
    justifyContent: 'space-between',
  },
  businessItem: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  businessImage: {
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
  businessInfoOverlay: {
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
  businessTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
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

export default BusinessesScreen; 