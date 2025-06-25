import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

const BusinessOrderItem = ({ 
  item, 
  isDark, 
  onStatusChange, 
  formatDate 
}) => {
  const isPending = item.status === 'pending';
  const router = useRouter();

  const handleCallPress = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleDirectionsPress = (coordinates) => {
    if (!coordinates) return;
    
    const { latitude, longitude } = coordinates;
    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}`
    });
    
    Linking.openURL(url);
  };

  const handleProfilePress = ()=> {
    router.push({
      pathname:'/oppuserprofile',
      params:{uid:item.userId}
    })
  }

  return (
    <View style={[
      styles.orderCard, 
      { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }
    ]}>
      <View style={styles.orderHeaderRow}>
        <View style={styles.userInfoContainer}>

          <TouchableOpacity onPress={handleProfilePress}>
            <Image 
              source={{ uri: item.userPhoto }} 
              style={styles.profilePhoto} 
            />
          </TouchableOpacity>
          
          <View style={styles.userTextContainer}>
            <Text style={[styles.username, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {item.userName}
            </Text>
            <Text style={styles.orderTime}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
        
        <View style={[
          styles.statusBadge, 
          { backgroundColor: isPending ? Colors.orange : Colors.green }
        ]}>
          <Text style={styles.statusText}>
            {item.status}
          </Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.orderDetailsContainer}>
        <View style={styles.sectionHeader}>
          <Ionicons name="receipt-outline" size={18} color={isDark ? Colors.light_main : Colors.dark_main} />
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Order Details
          </Text>
        </View>
        
        <View style={[styles.descriptionCard, { backgroundColor: isDark ? '#2A2A2A' : '#F8F9FA' }]}>
          <Text style={[styles.description, { color: isDark ? '#DDDDDD' : '#333333' }]}>
            {item.description}
          </Text>
        </View>
      </View>
      
      <View style={styles.contactContainer}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={18} color={isDark ? Colors.light_main : Colors.dark_main} />
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Contact Information
          </Text>
        </View>
        
        <View style={[styles.contactCard, { backgroundColor: isDark ? '#2A2A2A' : '#F8F9FA' }]}>
          <TouchableOpacity 
            style={styles.phoneRow}
            onPress={() => handleCallPress(item.phoneNumber)}
          >
            <View style={styles.contactRowContent}>
              <View style={[styles.iconContainer, { backgroundColor: Colors.green + '20' }]}>
                <Ionicons name="call" size={16} color={Colors.green} />
              </View>
              <Text style={[styles.phoneNumber, { color: Colors.green }]}>
                {item.phoneNumber}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={isDark ? '#AAAAAA' : '#666666'} />
          </TouchableOpacity>
          
          {item.address && (
            <View style={styles.addressRow}>
              <View style={styles.contactRowContent}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.blue + '20' }]}>
                  <Ionicons name="location" size={16} color={Colors.blue} />
                </View>
                <Text 
                  style={[styles.addressText, { color: isDark ? '#DDDDDD' : '#333333' }]}
                  numberOfLines={2}
                >
                  {item.address}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.actionsContainer}>
        {item.coordinates && (
          <TouchableOpacity 
            style={styles.directionButton}
            onPress={() => handleDirectionsPress(item.coordinates)}
          >
            <Ionicons name="navigate" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Directions</Text>
          </TouchableOpacity>
        )}
        
        {isPending ? (
          <TouchableOpacity 
            style={styles.completeButton}
            onPress={() => onStatusChange(item.id, 'completed')}
          >
            <Ionicons name="checkmark-circle" size={20} color={isDark ? Colors.light_main : Colors.dark_main} />
            <Text style={[styles.buttonText, {color:isDark ? Colors.light_main : Colors.dark_main}]}>Mark as Completed</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.pendingButton}
            onPress={() => onStatusChange(item.id, 'removed')}
          >
            <Ionicons name="trash-outline" size={20} color={isDark ? Colors.light_main : Colors.dark_main} />
            <Text style={[styles.buttonText, {color: isDark ? Colors.light_main : Colors.dark_main}]}>Remove order</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userTextContainer: {
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderTime: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.2)',
    marginVertical: 14,
  },
  orderDetailsContainer: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  descriptionCard: {
    padding: 12,
    borderRadius: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
  },
  contactContainer: {
    marginBottom: 16,
  },
  contactCard: {
    padding: 12,
    borderRadius: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneNumber: {
    fontSize: 14,
    marginLeft: 8,
  },
  addressRow: {
    marginTop: 8,
  },
  addressText: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  directionButton: {
    backgroundColor: Colors.blue,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  completeButton: {
    backgroundColor: Colors.green,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pendingButton: {
    backgroundColor: Colors.orange,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default BusinessOrderItem; 