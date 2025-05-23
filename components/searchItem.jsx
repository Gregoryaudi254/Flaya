import React, { useCallback, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions
} from 'react-native';

import { timeAgo } from '@/constants/timeAgo';
import { getData, storeData } from '@/constants/localstorage';
import { getDistance } from 'geolib';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useColorScheme } from '@/hooks/useColorScheme';
import SearchBusinesses from './SearchBusinesses';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

const SearchResultItem = ({ item, onPress, onItemRemoved }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const bgColor = isDark ? '#1E1E1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#AAAAAA' : '#666666';

    const [businesses, setBusinesses] = useState(item.stores || []);
    console.log("businesses", JSON.stringify(businesses));

    const router = useRouter();
    const userinfo = getData('@profile_info');
    const userlocation = userinfo?.coordinates;
    const [distanceString, setDistanceString] = useState(null);
    const { coordinates } = useSelector(state => state.location);

    const setLocation = useCallback((coordinates) => {
        if (!item.coordinates) return;

        try {
            const usergeopoint = { latitude: coordinates.latitude, longitude: coordinates.longitude };
            const postgeopoint = { latitude: item.coordinates._latitude, longitude: item.coordinates._longitude };
            const distance = getDistance(usergeopoint, postgeopoint);
            
            const distanceString = distance < 1000 
                ? `${distance} m` 
                : `${(distance / 1000).toFixed(1)} km`;
        
            setDistanceString(distanceString);
        } catch(e) {
            console.log(e);
        }
    }, [item.coordinates]);

    useEffect(() => {
        try {
            if (coordinates.coords) {
                setLocation({latitude: coordinates.coords.latitude, longitude: coordinates.coords.longitude});
            } else if (userlocation) {
                setLocation(userlocation);
            }
        } catch(e) {
            console.log("Error setting location:", e);
        }
    }, [coordinates, userlocation, setLocation]);

    const removeFromRecent = useCallback(async (business) => {
        // remove from recent
        const savedSearches = await getData('@recent_searches');
        let stores = Array.isArray(savedSearches.stores) ? savedSearches.stores : [];

        // Filter out the item by ID (or another unique property)
        const filtered = stores.filter(p => p.id !== business.id);

        savedSearches.stores = filtered.slice(0, 10);
        // Save trimmed (up to 10) items back
        await storeData('@recent_searches', savedSearches);

        if (businesses.length === 1) {
            onItemRemoved(item.id);
            return;
        }
        
        setBusinesses((previous) => {
            return previous.filter(b => b.id !== business.id);
        });
    }, [businesses, item.id, onItemRemoved]);

    const removeFromRecentSearches = useCallback(async () => {
        const savedSearches = (await getData('@recent_searches')) || { products: [] };
        // Ensure it's an array
        let products = Array.isArray(savedSearches.products) ? savedSearches.products : [];

        // Filter out the item by ID (or another unique property)
        const filtered = products.filter(p => p.id !== item.id);
        savedSearches.products = filtered.slice(0, 10);

        // Save trimmed (up to 10) items back
        await storeData('@recent_searches', savedSearches);

        onItemRemoved(item.id);
    }, [item.id, onItemRemoved]);

    if (item.contentType === "stores") {
        return (
            <View style={[styles.businessesContainer, { backgroundColor: isDark ? 'transparent' : 'transparent' }]}>
                <SearchBusinesses 
                    businesses={businesses} 
                    onDeleteFromRecent={removeFromRecent}
                    onBusinessPress={async (business) => {
                        // save to recent searches
                        // Load from storage
                        const savedSearches = (await getData('@recent_searches')) || { stores: [] };
                        console.log("savedSearches", JSON.stringify(savedSearches.stores));

                        // Ensure products is always an array
                        const stores = Array.isArray(savedSearches.stores) ? savedSearches.stores : [];
                        // Add the new item to the start
                        const newstores = [{...business, saved: true}, ...stores];
                        console.log("newstores", JSON.stringify(newstores));
                        // Optional: Remove duplicates based on `id`
                        const uniqueStores = newstores.filter(
                            (p, index, self) => self.findIndex(x => x.id === p.id) === index
                        );

                        // Limit to 10 most recent
                        const limitedStores = uniqueStores.slice(0, 10);
                        savedSearches.stores = limitedStores;

                        // Save back to storage
                        await storeData('@recent_searches', savedSearches);

                        console.log("businessInfo", JSON.stringify(limitedStores));

                        router.push({
                            pathname: '/oppuserprofile',
                            params: { 
                                uid: business.id, 
                            }
                        });
                    }}
                />
            </View>
        );
    }

    return (
        <TouchableOpacity 
            style={[styles.container, { backgroundColor: bgColor }]} 
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            {/* Poster Image - Left Side */}
            <View style={styles.imageContainer}>
                <Image 
                    source={{ uri: item.contentType === "image" ? item.content[0] : item.thumbnail}} 
                    style={styles.posterImage} 
                    resizeMode="cover"
                />

                {item.contentType !== "image" && (
                    <View style={styles.videoIndicator}>
                        <Ionicons name="play" size={16} color="#FFFFFF" />
                    </View>
                )}

                {item.saved && (
                    <TouchableOpacity 
                        onPress={removeFromRecentSearches} 
                        style={styles.removeButton}
                    >
                        <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Content Container - Right Side */}
            <View style={styles.contentContainer}>
                {/* Store Owner Section */}
                <View style={styles.ownerSection}>
                    <Image 
                        source={{ uri: item.business?.photo || 'https://cdn.shopify.com/s/files/1/0070/7032/files/diy-product-photography.jpg?v=1599161908' }} 
                        style={styles.ownerAvatar} 
                    />
                    <View style={styles.nameContainer}>
                        <Text style={[styles.storeName, { color: textColor }]} numberOfLines={1}>
                            {item.business?.name || 'Unknown Store'}
                        </Text>
                        
                        {item.business?.verified && (
                            <Ionicons name="checkmark-circle" size={16} color={Colors.blue} style={styles.verifiedIcon} />
                        )}
                    </View>
                </View>

                {/* Product Description */}
                <Text 
                    style={[styles.productDescription, { color: isDark ? '#DDDDDD' : '#333333' }]} 
                    numberOfLines={2}
                >
                    {item.description || 'No description available'}
                </Text>

                {/* Distance and Timestamp */}
                <View style={styles.metaInfoContainer}>
                    {distanceString && (
                        <View style={styles.infoItem}>
                            <Ionicons 
                                name="location-outline" 
                                size={14} 
                                color={subtextColor} 
                                style={styles.infoIcon}
                            />
                            <Text style={[styles.infoText, { color: subtextColor }]}>
                                {distanceString}
                            </Text>
                        </View>
                    )}

                    {item.business?.category && (
                        <View style={styles.infoItem}>
                            <Ionicons 
                                name="apps-outline" 
                                size={14} 
                                color={subtextColor} 
                                style={styles.infoIcon}
                            />
                            <Text style={[styles.infoText, { color: subtextColor }]}>
                                {item.business.category}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 120,
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    businessesContainer: {
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '30%',
        height: '100%',
        position: 'relative',
    },
    posterImage: {
        width: '100%',
        height: '100%',
    },
    videoIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    ownerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    ownerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    storeName: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    verifiedIcon: {
        marginLeft: 4,
    },
    productDescription: {
        fontSize: 14,
        lineHeight: 18,
        marginBottom: 6,
    },
    metaInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    infoIcon: {
        marginRight: 4,
    },
    infoText: {
        fontSize: 12,
    },
});

export default SearchResultItem;