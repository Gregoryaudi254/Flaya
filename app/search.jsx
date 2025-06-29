import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  FlatList, 
  Text, 
  StyleSheet, 
  Image,
  TouchableOpacity, 
  ActivityIndicator,
  Animated,
  Keyboard,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { debounce } from 'lodash';
import { Ionicons } from '@expo/vector-icons';

// Initialize Algolia client
const productsIndex = ""
const storesIndex = ""
import SearchItem from '@/components/searchItem'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/constants/firebase';
import { getData, storeData } from '@/constants/localstorage';
import { router } from 'expo-router';
import { useAuth } from '@/constants/AuthContext';

const { width } = Dimensions.get('window');

const SearchScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? '#121212' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const placeholderColor = isDark ? '#777777' : '#999999';
  const borderColor = isDark ? '#333333' : '#EEEEEE';

  const {user} = useAuth()

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState('all');
  const [recentSearches, setRecentSearches] = useState([]);
  
  const [isRecentLoaded, setRecentLoaded] = useState(false);
  const [isQueryLoaded, setQueryLoaded] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const searchInputRef = React.useRef(null);

  // Category filters
  const categories = [
    { id: 'all', name: 'All', icon: 'grid-outline' },
    { id: 'products', name: 'Products', icon: 'cube-outline' },
    { id: 'stores', name: 'Stores', icon: 'storefront-outline' },
  ];
  
  useEffect(() => {
    // Fade in animation when component mounts
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Focus the search input
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
    
    // Load recent searches on mount
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const savedSearches = await getData('@recent_searches');
      if (savedSearches) {
        setRecentSearches(getSearchList(savedSearches));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const getSearchList = useCallback((data) => {
    const storesOBJ = {
      stores: data.stores || [],
      id: "idnew",
      contentType: "stores",
    };

    const result = [...(data.products || [])]; // Clone the products array

    if (result.length >= 2) {
      // Insert after the 2nd element (at index 2)
      result.splice(2, 0, storesOBJ);
    } else if (storesOBJ.stores.length > 0) {
      // Only push if there are stores
      result.push(storesOBJ);
    }

    return result;
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (query.trim() === '') {
        setRecentLoaded(true);
        setQueryLoaded(false);
        const savedSearches = await getData('@recent_searches');

        if (savedSearches) {
          setSearchResults(getSearchList(savedSearches));
        } else {
          setSearchResults([]);
        }
        setIsLoading(false);
        return;
      }

      setRecentLoaded(false);
      setIsLoading(true);

      try {
        // Prepare the callable function
        const callbackFunction = httpsCallable(functions, 'searchAlgolia');

        
        const info = {
          userid: user.uid,
          query: query,
          type: searchType !== 'all' ? searchType : undefined
        };

        // Call the function with the user ID
        const response = await callbackFunction(info);

        const data = response.data;
        const result = getSearchList(data.data);

        setQueryLoaded(true);
        setSearchResults(result);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500), // Faster response time
    [searchType]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, searchType]);

  const handlePress = async (item) => {
    const profileInfo = await getData('@profile_info');
    const origin = item.user === user.uid ? 'currentuserprofile' : 'notcurrentuserprofile';

    const updatedPost = {...item, userinfo: profileInfo, origin: origin};
    router.push({
      pathname: '/postpage',
      params: { data: encodeURIComponent(JSON.stringify(updatedPost)) }
    });

    // Load from storage
    const savedSearches = (await getData('@recent_searches')) || { products: [] };

    // Ensure products is always an array
    const products = Array.isArray(savedSearches.products) ? savedSearches.products : [];
    // Add the new item to the start
    const newproducts = [{...item, saved: true}, ...products];
    // Optional: Remove duplicates based on `id`
    const uniqueProducts = newproducts.filter(
      (p, index, self) => self.findIndex(x => x.id === p.id) === index
    );

    // Limit to 10 most recent
    const limitedProducts = uniqueProducts.slice(0, 10);
    savedSearches.products = limitedProducts;

    // Save back to storage
    await storeData('@recent_searches', savedSearches);
  };

  const removeItem = useCallback((id) => {
    setSearchResults((previous) => {
      return previous.filter(business => business.id !== id);
    });
  }, []);

  const renderItem = useCallback(({ item }) => (
    <SearchItem item={item} onPress={() => handlePress(item)} onItemRemoved={removeItem} />
  ), [handlePress, removeItem]);

  const handleBackPress = useCallback(() => {
    Keyboard.dismiss();
    // Animate out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      router.back();
    });
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleCategoryPress = useCallback((categoryId) => {
    setSearchType(categoryId);
    // Re-run search with new category filter
    debouncedSearch(searchQuery);
  }, [searchQuery]);

  const clearRecentSearches = async () => {
    try {
      await storeData('@recent_searches', { products: [], stores: [] });
      setSearchResults([]);
      setRecentSearches([]);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>

            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#333333' : '#F5F5F5', borderColor }]}>
              <Ionicons name="search" size={20} color={placeholderColor} style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search products, stores, and more..."
                placeholderTextColor={placeholderColor}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color={placeholderColor} />
                </TouchableOpacity>
              )}
            </View>
          </View>

         
        </View>

        {/* Recent searches header */}
        {isRecentLoaded && searchResults.length > 0 && (
          <View style={styles.recentHeaderContainer}>
            <Text style={[styles.recentHeader, { color: textColor }]}>
              Recent Searches
            </Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={styles.clearRecentText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Results */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.blue} />
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.objectID || item.id}
            contentContainerStyle={styles.resultsList}
            ListEmptyComponent={
              searchQuery.trim() !== '' && isQueryLoaded ? (
                <View style={styles.emptyResultContainer}>
                  <Ionicons name="search-outline" size={50} color={isDark ? '#444444' : '#DDDDDD'} />
                  <Text style={[styles.emptyResultText, { color: isDark ? '#AAAAAA' : '#888888' }]}>
                    No results found for "{searchQuery}"
                  </Text>
                  <Text style={[styles.emptyResultSubtext, { color: isDark ? '#777777' : '#999999' }]}>
                    Try different keywords or check for typos
                  </Text>
                </View>
              ) : isRecentLoaded && searchResults.length === 0 ? (
                <View style={styles.emptyResultContainer}>
                  <Ionicons name="time-outline" size={50} color={isDark ? '#444444' : '#DDDDDD'} />
                  <Text style={[styles.emptyResultText, { color: isDark ? '#AAAAAA' : '#888888' }]}>
                    No recent searches
                  </Text>
                  <Text style={[styles.emptyResultSubtext, { color: isDark ? '#777777' : '#999999' }]}>
                    Your search history will appear here
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  activeFilter: {
    backgroundColor: Colors.blue,
  },
  recentHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentHeader: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearRecentText: {
    fontSize: 14,
    color: Colors.blue,
    fontWeight: '500',
  },
  resultsList: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyResultContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    padding: 16,
  },
  emptyResultText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyResultSubtext: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: width * 0.7,
  },
});

export default SearchScreen;