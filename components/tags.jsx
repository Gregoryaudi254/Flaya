import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Colors } from '@/constants/Colors';
import { Image, Animated, Text, View, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet, Dimensions, FlatList, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { debounce } from 'lodash';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/constants/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import TagItem from './tagProfile';
import { useToast } from 'react-native-toast-notifications';
import { getData } from '@/constants/localstorage';
import BottomSheet from '@gorhom/bottom-sheet';

const Tags = ({ handleClosing, isVisible, setUsers, users }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [search, setSearch] = useState('');
    const latestValue = useRef(search);
    const [isfetchingUser, setFetchingUser] = useState(false);
    const [user, setUser] = useState(null);
    const toast = useToast();
    
    // BottomSheet reference
    const bottomSheetRef = useRef(null);
    
    // BottomSheet snap points
    const snapPoints = useRef(['70%']).current;
    
    useEffect(() => {
      if (isVisible) {
        bottomSheetRef.current?.expand();
      } else {
        bottomSheetRef.current?.close();
      }
    }, [isVisible]);
    
    const handleSheetChanges = useCallback((index) => {
      if (index === -1) {
        handleClosing();
      }
    }, [handleClosing]);

    const getUser = async (username) => {
      try {
        // Create a reference to the users collection
        const usersRef = collection(db, 'users');
    
        // Create a query against the collection where the username matches
        const q = query(usersRef, where('username', '==', username));
    
        // Execute the query and get the result
        const querySnapshot = await getDocs(q);
    
        // Check if any documents are returned
        if (!querySnapshot.empty) {
          return querySnapshot.docs[0].data();
        } else {
          return null; // Username does not exist
        }
      } catch (error) {
        console.error('Error checking username: ', error);
        return null;
      }
    };

    // Debounced function to check availability
    const debouncedCheckAvailability = useCallback(
      debounce(async (text) => {
        if (latestValue.current !== text) return; 

        setUser(null);
    
        setFetchingUser(true);
        const user = await getUser(text.trim().toLocaleLowerCase());

        const userinfo = await getData('@profile_info');
        setFetchingUser(false);
        
        if (user !== null && user.uid === userinfo.uid) {
          setUser(null);
        } else {
          setUser(user);
        }
      }, 500), // Reduced debounce delay for better responsiveness
      []
    );

    useEffect(() => {
      latestValue.current = search;
  
      if (search) {
        debouncedCheckAvailability(search);
      } else {
        setUser(null);
        setFetchingUser(false);
      }
    }, [search]);

    const handleRemove = useCallback((uid) => {
      setUsers((prevUsers) => prevUsers.filter((user) => user.uid !== uid));
    }, [setUsers]);

    const handleAddUser = useCallback(() => {
      if (user) {
        if (users.length >= 6) {
          showToast('Maximum of 6 tags allowed');
          return;
        }

        setUsers((previousUsers) => {
          // Check if user already exists in the array
          const userExists = previousUsers.some((u) => u.uid === user.uid);
          if (userExists) {
            showToast('This user is already tagged');
            return previousUsers;
          }
          return [...previousUsers, user];
        });

        setUser(null);
        setSearch('');
      }
    }, [user, users, setUsers]);

    function showToast(message) {
      toast.show(message, {
        type: "normal",
        placement: "bottom",
        duration: 2000,
        offset: 30,
        animationType: "zoom-in",
      });
    }
    
    return isVisible ? (
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        onChange={handleSheetChanges}
        backgroundStyle={{ backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }}
        handleIndicatorStyle={{ backgroundColor: isDark ? '#555555' : '#CCCCCC' }}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[
              styles.headerTitle, 
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}>
              Tag People
            </Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClosing}
            >
              <Ionicons 
                name="close" 
                size={24} 
                color={isDark ? '#FFFFFF' : '#000000'} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Search bar */}
          <View style={[
            styles.searchContainer,
            { backgroundColor: isDark ? '#333333' : '#F5F5F5' }
          ]}>
            <Ionicons 
              name="search" 
              size={20} 
              color={isDark ? '#888888' : '#888888'} 
              style={styles.searchIcon} 
            />
            <TextInput
              placeholderTextColor={isDark ? '#888888' : '#888888'}
              placeholder="Search by username"
              onChangeText={setSearch}
              value={search}
              style={[
                styles.searchInput, 
                { color: isDark ? '#FFFFFF' : '#000000' }
              ]}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={16} color={isDark ? '#888888' : '#888888'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results */}
          <View style={styles.resultsContainer}>
            {isfetchingUser ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.blue} />
                <Text style={[styles.searchingText, { color: isDark ? '#CCCCCC' : '#666666' }]}>
                  Searching...
                </Text>
              </View>
            ) : user ? (
              <TouchableOpacity 
                style={[
                  styles.userResultItem, 
                  { backgroundColor: isDark ? '#222222' : '#F9F9F9' }
                ]} 
                onPress={handleAddUser}
              >
                <Image
                  source={{ uri: user.profilephoto }}
                  style={styles.resultProfileImage}
                />
                <View style={styles.userInfo}>
                  <View style={styles.usernameContainer}>
                    <Text style={[styles.usernameText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      {user.username}
                    </Text>
                    {user.verified && (
                      <Ionicons name="checkmark-circle" size={16} color={Colors.blue} style={{ marginLeft: 4 }} />
                    )}
                  </View>
                  {user.name && (
                    <Text style={styles.nameText}>
                      {user.name}
                    </Text>
                  )}
                </View>
                <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
                  <Ionicons name="add-circle" size={28} color={Colors.blue} />
                </TouchableOpacity>
              </TouchableOpacity>
            ) : search.length > 0 ? (
              <View style={styles.noResultsContainer}>
                <Text style={[styles.noResultsText, { color: isDark ? '#CCCCCC' : '#666666' }]}>
                  No user found with that username
                </Text>
              </View>
            ) : null}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: isDark ? '#444444' : '#E5E5E5' }]}/>

          {/* Tagged Users Section */}
          <View style={styles.taggedSection}>
            <Text style={[styles.taggedTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Tagged People {users.length > 0 && `(${users.length}/6)`}
            </Text>
            
            {users.length === 0 ? (
              <View style={styles.noTagsContainer}>
                <Ionicons name="people" size={24} color={isDark ? '#555555' : '#BBBBBB'} />
                <Text style={[styles.noTagsText, { color: isDark ? '#999999' : '#999999' }]}>
                  No people tagged yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={users}
                horizontal={false}
                numColumns={3}
                showsVerticalScrollIndicator={false}
                style={styles.taggedList}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyExtractor={(item) => item.uid}
                renderItem={({item}) => (
                  <TagItem user={item} handleRemove={handleRemove} />
                )}
              />
            )}
          </View>
        </View>
      </BottomSheet>
    ) : null;
};

export default Tags;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    minHeight: 70,
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingText: {
    marginLeft: 8,
    fontSize: 16,
  },
  userResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
  },
  resultProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nameText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 2,
  },
  addButton: {
    padding: 4,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  taggedSection: {
    flex: 1,
  },
  taggedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  taggedList: {
    flex: 1,
  },
  noTagsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noTagsText: {
    marginTop: 8,
    fontSize: 14,
  },
});