import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { doc, getDoc } from 'firebase/firestore';

const AdminPanel = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const toast = useToast();
  
  const [isAdmin, setIsAdmin] = useState(true);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkAdminStatus();
  }, []);
  
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
    } finally {
      setLoading(false);
    }
  };
  
  const showToast = (message) => {
    toast.show(message, {
      type: "normal",
      placement: "bottom",
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  };
  
  const navigateToOrders = () => {
    router.push('/admin/orders');
  };
  
  const navigateToApprovals = () => {
    router.push('/admin/approvals');
  };
  
  const navigateToEvents = () => {
    router.push('/admin/events');
  };
  
  const navigateToLocationChanges = () => {
    router.push('/admin/locationchanges');
  };
  
  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
        <Stack.Screen
          options={{
            headerTitle: "Admin Panel",
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
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
        <Stack.Screen
          options={{
            headerTitle: "Admin Panel",
            headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
            headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.light_main : Colors.dark_main} />
          <Text style={[styles.loadingText, { color: isDark ? '#AAAAAA' : '#888888' }]}>
            Loading admin panel...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <Stack.Screen
        options={{
          headerTitle: "Admin Panel",
          headerTitleStyle: { color: isDark ? '#FFFFFF' : '#000000' },
          headerStyle: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
        }}
      />

      <ScrollView>
      <View style={styles.contentContainer}>
        <Text style={[styles.welcomeText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          Admin Management Center
        </Text>
        
        <Text style={[styles.sectionText, { color: isDark ? '#AAAAAA' : '#666666' }]}>
          Select a management function below:
        </Text>
        
        <View style={styles.menuGrid}>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: isDark ? '#222222' : '#FFFFFF' }]}
            onPress={navigateToApprovals}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.blue }]}>
              <Ionicons name="business-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.menuItemTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Business Approvals
            </Text>
            <Text style={[styles.menuItemDescription, { color: isDark ? '#AAAAAA' : '#777777' }]}>
              Review and approve business accounts
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: isDark ? '#222222' : '#FFFFFF' }]}
            onPress={navigateToOrders}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.orange }]}>
              <Ionicons name="receipt-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.menuItemTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Order Management
            </Text>
            <Text style={[styles.menuItemDescription, { color: isDark ? '#AAAAAA' : '#777777' }]}>
              View and manage orders from all businesses
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: isDark ? '#222222' : '#FFFFFF' }]}
            onPress={navigateToEvents}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.green }]}>
              <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.menuItemTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Events Management
            </Text>
            <Text style={[styles.menuItemDescription, { color: isDark ? '#AAAAAA' : '#777777' }]}>
              View, manage and create events
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: isDark ? '#222222' : '#FFFFFF' }]}
            onPress={navigateToLocationChanges}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.purple }]}>
              <Ionicons name="location-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.menuItemTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Location Changes
            </Text>
            <Text style={[styles.menuItemDescription, { color: isDark ? '#AAAAAA' : '#777777' }]}>
              Manage location changes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionText: {
    fontSize: 16,
    marginBottom: 25,
    textAlign: 'center',
  },
  menuGrid: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  menuItem: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  menuItemDescription: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
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

export default AdminPanel; 