import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, getDocs, updateDoc, doc, serverTimestamp, where, getDoc } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Stack } from 'expo-router';
import { useToast } from 'react-native-toast-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import AdminOrderItem from '@/components/AdminOrderItem';

const { width } = Dimensions.get('window');

const AdminOrdersScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // pending, completed, all
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin, activeTab]);

  const checkAdminStatus = async () => {
    try {
      const userInfo = await getData('@profile_info');
      if (!userInfo || !userInfo.uid) {
        showToast("User information not found");
        return;
      }
      
      const adminDocRef = doc(db, "admins", userInfo.uid);
      const adminDoc = await getDoc(adminDocRef);
      
      setIsAdmin(true);
      
      
    } catch (error) {
      console.error("Error checking admin status:", error);
      showToast("Error checking permissions");
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Reference to orders collection
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, orderBy('createdAt', 'desc'), where('status', '!=' , "removed"));
      const querySnapshot = await getDocs(q);

      const ordersData = querySnapshot.docs
        .map((snap) => {
            const data = snap.data();
            const business = data.business || {};

            const businessInfo = {
            businessid: business.businessid || null,
            businessCategory: business.category || null,
            businessCoordinates: business.coordinates || null,
            businessPhoto: data.businessphoto || null,
            businessContact: business.contact || null,
            businessAddress: business.address
            };

            console.log(activeTab)

            // Filter by status
            if (
            (activeTab === 'pending' && data.status !== 'pending') ||
            (activeTab === 'completed' && data.status !== 'completed')
            ) {
            return null;
            }

            return {
            ...data,
            ...businessInfo,
            id: snap.id,
            createdAt: data.createdAt?.toMillis
                ? new Date(data.createdAt.toMillis())
                : new Date(),
            };
        })
        .filter(Boolean); // removes nulls

    
      
      setOrders(ordersData);
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

  const updateOrderStatus = async (orderId, businessId, status) => {
    try {
      // Update the order in the general orders collection
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { 
        status: status,
        updatedAt: serverTimestamp()
      });
      
      // Also update in the business's specific orders collection
      if (businessId) {
        const businessOrderRef = doc(db, `users/${businessId}/orders`, orderId);
        const businessOrderDoc = await getDoc(businessOrderRef);
        
        if (businessOrderDoc.exists()) {
          await updateDoc(businessOrderRef, { 
            status: status,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      // Update UI
      setOrders(prevOrders => {
        if (status === "removed") {
          return prevOrders.filter(order => order.id !== orderId);
        } else {
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

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="receipt-outline" 
        size={80} 
        color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} 
      />
      <Text style={[styles.emptyText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
        No {activeTab} orders found
      </Text>
    </View>
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
        <Stack.Screen
          options={{
            headerTitle: "All Business Orders",
            headerShadowVisible: false,
            headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
            headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
          }}
        />
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={60} color={isDark ? '#AAAAAA' : '#888888'} />
          <Text style={[styles.noAccessText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            You don't have admin access
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <Stack.Screen
        options={{
          headerTitle: "All Business Orders",
          headerShadowVisible: false,
          headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
          headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
        }}
      />
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'all' && styles.activeTab,
            activeTab === 'all' && { borderBottomColor: Colors.blue }
          ]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'all' && styles.activeTabText,
            { color: activeTab === 'all' ? (isDark ? '#FFFFFF' : '#000000') : '#888888' }
          ]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'pending' && styles.activeTab,
            activeTab === 'pending' && { borderBottomColor: Colors.orange }
          ]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'pending' && styles.activeTabText,
            { color: activeTab === 'pending' ? (isDark ? '#FFFFFF' : '#000000') : '#888888' }
          ]}>
            Pending
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'completed' && styles.activeTab,
            activeTab === 'completed' && { borderBottomColor: Colors.green }
          ]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'completed' && styles.activeTabText,
            { color: activeTab === 'completed' ? (isDark ? '#FFFFFF' : '#000000') : '#888888' }
          ]}>
            Completed
          </Text>
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
            <AdminOrderItem 
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
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
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
    marginTop: 50,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noAccessText: {
    marginTop: 10,
    fontSize: 18,
    textAlign: 'center',
  },
});

export default AdminOrdersScreen; 