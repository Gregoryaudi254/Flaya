import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, getDocs, updateDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter, Stack } from 'expo-router';
import { useToast } from 'react-native-toast-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import BusinessOrderItem from '@/components/BusinessOrderItem';

const { width } = Dimensions.get('window');

const BusinessOrdersScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // pending, completed, all

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const [status, setStatus] = useState([]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userInfo = await getData('@profile_info');
      
      if (!userInfo || !userInfo.uid) {
        showToast("User information not found");
        setLoading(false);
        return;
      }
      
      // Reference to orders collection
      const ordersRef = collection(db, `users/${userInfo.uid}/orders`);
      const q = query(ordersRef, orderBy('createdAt', 'desc') , where('status', '!=' , "removed"));
      const querySnapshot = await getDocs(q);

      setStatus(querySnapshot.docs.map((snap) => snap.data().status));
      
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to JS Date
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date(),
      }));
      
      // Filter based on active tab
      let filteredOrders = ordersData;
      if (activeTab === 'pending') {
        filteredOrders = ordersData.filter(order => order.status === 'pending');
      } else if (activeTab === 'completed') {
        filteredOrders = ordersData.filter(order => order.status === 'completed');
      }
      
      setOrders(filteredOrders);
      
      // Mark unseen orders as seen
      const unseenOrders = ordersData.filter(order => order.seen === false);
      unseenOrders.forEach(async (order) => {
        const orderRef = doc(db, `users/${userInfo.uid}/orders`, order.id);
        await updateDoc(orderRef, { 
          seen: true,
          seenAt: serverTimestamp()
        });
      });
      
    } catch (error) {
      console.error("Error fetching orders:", error);
      showToast("Couldn't load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const showToast = (message) => {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  };

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

  const updateOrderStatus = async (orderId, status) => {
    try {
      const userInfo = await getData('@profile_info');
      const orderRef = doc(db, `users/${userInfo.uid}/orders`, orderId);

      await updateDoc(orderRef, { 
        status: status,
        updatedAt: serverTimestamp()
      });
      
      setOrders(prevOrders => {
        if (status === "removed") { // Condition to remove
          return prevOrders.filter(order => order.id !== orderId);
        } else { // Condition to update status
          return prevOrders.map(order => 
            order.id === orderId ? { ...order, status: status } : order
          );
        }
      });
      
      showToast(`Order ${status}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      showToast("Couldn't update order status");
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const orderDate = new Date(date);
    
    // Check if it's today
    if (
      orderDate.getDate() === now.getDate() &&
      orderDate.getMonth() === now.getMonth() &&
      orderDate.getFullYear() === now.getFullYear()
    ) {
      return `Today, ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (
      orderDate.getDate() === yesterday.getDate() &&
      orderDate.getMonth() === yesterday.getMonth() &&
      orderDate.getFullYear() === yesterday.getFullYear()
    ) {
      return `Yesterday, ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise, return the full date
    return orderDate.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEmptyList = () => {
    const emptyMessages = {
      all: "No orders found",
      pending: "No pending orders",
      completed: "No completed orders"
    };
    
    const emptyIcons = {
      all: "receipt-outline",
      pending: "time-outline", 
      completed: "checkmark-circle-outline"
    };
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons 
          name={emptyIcons[activeTab]} 
          size={80} 
          color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} 
        />
        <Text style={[styles.emptyText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
          {emptyMessages[activeTab]}
        </Text>
        <Text style={[styles.emptySubtext, { color: isDark ? '#888888' : '#999999' }]}>
          {activeTab === 'all' ? 'Your business orders will appear here' : 
           activeTab === 'pending' ? 'New orders requiring attention will appear here' :
           'Completed orders will be shown here'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <Stack.Screen
        options={{
          headerTitle: "Orders & Bookings",
          headerShadowVisible:false,
          headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
          headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5',elavation:0},
        }}
      />
      
      <View style={[styles.tabContainer, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>

      <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'all' && styles.activeTab,
            activeTab === 'all' && { borderBottomColor: Colors.blue }
          ]}
          onPress={() => setActiveTab('all')}
        >
          <View style={styles.tabContent}>
            <Ionicons 
              name="list-outline" 
              size={18} 
              color={activeTab === 'all' ? Colors.blue : '#888888'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'all' && styles.activeTabText,
              { color: activeTab === 'all' ? Colors.blue : '#888888' }
            ]}>
              All Orders
            </Text>

            {status.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: Colors.blue }]}>
              <Text style={styles.countText}>{status.length}</Text>
            </View>
          )}
          </View>
         
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'pending' && styles.activeTab,
            activeTab === 'pending' && { borderBottomColor: Colors.orange }
          ]}
          onPress={() => setActiveTab('pending')}
        >
          <View style={styles.tabContent}>
            <Ionicons 
              name="time-outline" 
              size={18} 
              color={activeTab === 'pending' ? Colors.orange : '#888888'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'pending' && styles.activeTabText,
              { color: activeTab === 'pending' ? Colors.orange : '#888888' }
            ]}>
              Pending
            </Text>

            {status.filter(order => order === 'pending').length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: Colors.orange }]}>
              <Text style={styles.countText}>
                {status.filter(order => order === 'pending').length}
              </Text>
            </View>
          )}
          </View>
          
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'completed' && styles.activeTab,
            activeTab === 'completed' && { borderBottomColor: Colors.green }
          ]}
          onPress={() => setActiveTab('completed')}
        >
          <View style={styles.tabContent}>
            <Ionicons 
              name="checkmark-circle-outline" 
              size={18} 
              color={activeTab === 'completed' ? Colors.green : '#888888'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'completed' && styles.activeTabText,
              { color: activeTab === 'completed' ? Colors.green : '#888888' }
            ]}>
              Completed
            </Text>
            {status.filter(order => order === 'completed').length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: Colors.green }]}>
              <Text style={styles.countText}>
                {status.filter(order => order === 'completed').length}
              </Text>
            </View>
          )}
          </View>
          
        </TouchableOpacity>
        
       
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blue} />
          <Text style={[styles.loadingText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
            Loading orders...
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={({ item }) => (
            <BusinessOrderItem 
              item={item}
              isDark={isDark}
              onStatusChange={updateOrderStatus}
              formatDate={formatDate}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.blue]}
              tintColor={isDark ? '#FFFFFF' : Colors.blue}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    paddingHorizontal: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  activeTabText: {
    fontWeight: '700',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop:50,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: Colors.blue,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default BusinessOrdersScreen; 