import React from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width } = Dimensions.get('window');

const SearchBusinesses = ({ businesses, onBusinessPress, onDeleteFromRecent = () => {} }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#AAAAAA' : '#666666';
    const cardBgColor = isDark ? '#1E1E1E' : '#FFFFFF';
    const cardBorderColor = isDark ? '#333333' : '#EEEEEE';
    
    if (!businesses || businesses.length === 0) {
        return null;
    }

    console.log('businesses: '+JSON.stringify(businesses));

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={[styles.header, { color: textColor }]}>
                    Popular Stores
                </Text>
            </View>
            
            <View style={styles.gridContainer}>
                {businesses.map((business, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.businessCard, 
                            { 
                                backgroundColor: cardBgColor,
                                borderColor: cardBorderColor
                            }
                        ]}
                        onPress={() => onBusinessPress(business)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.businessImageContainer}>
                            <Image
                                source={{ uri: business.poster || 'https://cdn.shopify.com/s/files/1/0070/7032/files/diy-product-photography.jpg?v=1599161908' }}
                                style={styles.businessImage}
                                resizeMode="cover"
                            />
                            
                            {business.saved && (
                                <TouchableOpacity 
                                    style={styles.removeButton}
                                    onPress={() => onDeleteFromRecent(business)}
                                >
                                    <Ionicons name="close" size={14} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        <View style={styles.businessInfo}>
                            <View style={styles.nameRow}>
                                <Text 
                                    style={[styles.businessName, { color: textColor }]} 
                                    numberOfLines={1}
                                >
                                    {business.businessname}
                                </Text>
                                
                                {business.verified && (
                                    <Ionicons name="checkmark-circle" size={14} color={Colors.blue} />
                                )}
                            </View>
                            
                            {business.category && (
                                <View style={styles.categoryContainer}>
                                    <Ionicons 
                                        name="apps-outline" 
                                        size={12} 
                                        color={subtextColor} 
                                        style={styles.categoryIcon} 
                                    />
                                    <Text 
                                        style={[styles.categoryText, { color: subtextColor }]} 
                                        numberOfLines={1}
                                    >
                                        {business.category}
                                    </Text>
                                </View>
                            )}

                           
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    header: {
        fontSize: 16,
        fontWeight: '600',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    businessCard: {
        width: (width - 48) / 2,
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    businessImageContainer: {
        position: 'relative',
        height: 120,
    },
    businessImage: {
        width: '100%',
        height: '100%',
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    businessInfo: {
        padding: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    businessName: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        marginRight: 4,
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryIcon: {
        marginRight: 4,
    },
    categoryText: {
        fontSize: 12,
        flex: 1,
    },
    followersText: {
        fontSize: 12,
    },
});

export default SearchBusinesses; 