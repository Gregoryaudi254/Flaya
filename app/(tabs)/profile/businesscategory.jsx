import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BusinessCategoryEdit from '@/components/BusinessCategoryEdit';
import { useDispatch } from 'react-redux';
import { setData } from '@/slices/dataChangeSlice';

const BusinessCategoryScreen = () => {
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data including business category
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const userInfo = await getData('@profile_info');
      
      if (!userInfo || !userInfo.uid) {
        console.error('No user info found');
        setLoading(false);
        return;
      }
      
      const userRef = doc(db, `users/${userInfo.uid}`);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setUserData(userSnap.data());
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user data on component mount
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Handle category update
  const handleCategoryUpdate = (newCategory) => {

    // update profileedit component
    dispatch(setData({category:newCategory, intent:"categorychange"}))


    // Update local state
    setUserData(prev => ({
      ...prev,
      business: {
        ...prev?.business,
        category: newCategory
      }
    }));
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      {loading ? (
        <ActivityIndicator 
          style={styles.loader} 
          size="large" 
          color={isDark ? Colors.light_main : Colors.dark_main} 
        />
      ) : (
        <>
        
          
          {userData?.business ? (
            <BusinessCategoryEdit 
              initialCategory={userData.business.category || ''} 
              onCategoryUpdate={handleCategoryUpdate}
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: isDark ? '#FF9999' : '#FF4444' }]}>
                No business information found. Please set up your business account first.
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

export default BusinessCategoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 12,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 