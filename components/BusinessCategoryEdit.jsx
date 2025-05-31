import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/constants/firebase';
import { getData } from '@/constants/localstorage';
import { useToast } from 'react-native-toast-notifications';
import DropDownPicker from 'react-native-dropdown-picker';

const BusinessCategoryEdit = ({ initialCategory, onCategoryUpdate }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const toast = useToast();

  // Category dropdown state
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(initialCategory || '');
  const [categoryChanged, setCategoryChanged] = useState(false);
  const [loading, setLoading] = useState(false);

  // Category options
  const [items, setItems] = useState([
    { label: 'Food', value: 'Food' },
    { label: 'Fashion', value: 'Fashion' },
    { label: 'Groceries', value: 'Groceries' },
    { label: 'Services', value: 'Services' },
    { label: 'Health', value: 'Health' },
    { label: 'Beauty', value: 'Beauty' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Home Accessories', value: 'Home Accessories' },
    { label: 'Drinks & Beverages', value: 'Drinks & Beverages' },
    { label: 'Entertainment', value: 'Entertainment' },
    { label: 'Other', value: 'Other' },
   
   
  ]);

  // Track category changes
  useEffect(() => {
    if (initialCategory !== category && category !== '') {
      setCategoryChanged(true);
    } else {
      setCategoryChanged(false);
    }
  }, [category, initialCategory]);

  // Handle category update
  const handleSaveCategory = async () => {
    if (!category) {
      showToast("Please select a category");
      return;
    }

    try {
      setLoading(true);

      const userinfo = await getData('@profile_info');
      const userRef = doc(db, `users/${userinfo.uid}`);
      
      // Update only the category field in the business object
      await updateDoc(userRef, {
        'business.category': category
      });

      // Notify parent component
      if (onCategoryUpdate) {
        onCategoryUpdate(category);
      }

      showToast("Category updated successfully");
      setCategoryChanged(false);
    } catch (error) {
      console.error("Error updating category:", error);
      showToast("Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  // Toast helper
  const showToast = (message) => {
    toast.show(message, {
      type: "normal",
      placement: 'bottom',
      duration: 2000,
      offset: 30,
      animationType: "zoom-in",
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
        Business Category
      </Text>
      
      <Text style={[styles.description, { color: isDark ? '#CCCCCC' : '#555555' }]}>
        Select the category that best describes your business
      </Text>
      
      <View style={styles.dropdownContainer}>
        <DropDownPicker
          open={open}
          value={category}
          items={items}
          setOpen={setOpen}
          setValue={setCategory}
          setItems={setItems}
          placeholder="Select a category"
          style={{
            backgroundColor: isDark ? '#333333' : '#F5F5F5',
            borderColor: isDark ? '#444444' : '#DDDDDD',
          }}
          textStyle={{
            color: isDark ? Colors.light_main : Colors.dark_main,
          }}
          dropDownContainerStyle={{
            backgroundColor: isDark ? '#333333' : '#F5F5F5',
            borderColor: isDark ? '#444444' : '#DDDDDD',
          }}
          placeholderStyle={{
            color: isDark ? '#777777' : '#999999',
          }}
        />
      </View>
      
      {categoryChanged && (
        <TouchableOpacity
          style={[
            styles.saveButton, 
            { backgroundColor: loading ? '#888888' : Colors.blue }
          ]}
          onPress={handleSaveCategory}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Update Category</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  saveButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BusinessCategoryEdit; 