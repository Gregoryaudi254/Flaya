import { StyleSheet, Text, View, FlatList, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity, Image } from 'react-native'
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import ProfilePostItem from '@/components/ProfilePostItem'
import { doc, setDoc, GeoPoint, serverTimestamp, getDoc, getDocs, query, orderBy, limit, collection, startAfter, deleteDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window'); // Get the screen width
import { db } from '@/constants/firebase';

const numColumns = 2;
import { getData } from '@/constants/localstorage';
import { useSelector } from 'react-redux';

import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const TagsComponent = () => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';

  const { value } = useSelector(state => state.data);
  const [posts, setPosts] = useState([]);

  const { uid } = useLocalSearchParams();

  useEffect(() => {
    if (value !== null && value.intent === "postdelete") {
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== value.id))
    }
  }, [value])

  const [loadingmore, setLoadingMore] = useState(false);
    const [isrefreshing, setrefreshing] = useState(true);
    const [userinfo, setUserInfo] = useState(null);
  const [lastVisiblePost, setLastVisible] = useState(null);

    const getPosts = useCallback(async () => {
      console.log("getting posts")
      
      const postsRef = collection(db, `users/${uid}/tags`);
      const q = query(postsRef, orderBy('createdAt', 'desc'), limit(20));
      const querySnapshot = await getDocs(q);

      // Map over messages and convert `stamp` to a date string
      const posts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data
        };
      });

    console.log(posts.length + " length of posts")

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]); // Save the last document

      setPosts(posts);

      setrefreshing(false);
    })

    useEffect(() => {
        getPosts();
  }, []);

    const getMorePosts = useCallback(async () => {
      console.log("started loading")
      if (loadingmore || !lastVisiblePost || posts.length < 2) return;
      console.log("loading more")
      setLoadingMore(true);
   
      const chatRef = collection(db, `users/${uid}/tags`);
      const q = query(chatRef, orderBy('createdAt', 'desc'), startAfter(lastVisiblePost), limit(20));

      const moreSnapshot = await getDocs(q);
      const morePosts = moreSnapshot.docs.map(doc => ({
          ...doc.data(),
      }));
      
      // Update last visible document and prepend new chats to list
      setLastVisible(moreSnapshot.docs[moreSnapshot.docs.length - 1]);
      setPosts((prevPosts) => [...prevPosts, ...morePosts]);
      setLoadingMore(false);
  }, [loadingmore, lastVisiblePost, posts]);

    const footerComponent = useCallback(() => {
      return loadingmore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color={Colors.blue} />
        <Text style={[styles.loadingText, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
          Loading more tags...
        </Text>
        </View>
      ) : null;
  }, [loadingmore, isDark]);

  const handlePostPress = (id) => {
      router.push({
        pathname: '/sharepost'
      });
    }

      const getUserInfo = async () => {
    const ref = doc(db, `users/${uid}`);
        const userInfoSnap = await getDoc(ref);
        setUserInfo(userInfoSnap.data())
      }

      useEffect(() => {
        getUserInfo()
  }, [])

      const listHeaderComponent = useMemo(
        () => (
      <View>
        {/* Modern Header */}
        <View style={[styles.header, { 
          backgroundColor: isDark ? Colors.dark_background : Colors.light_background,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'
        }]}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.backButton, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' 
            }]}
          >
            <Ionicons 
              name="chevron-back" 
              size={24} 
              color={isDark ? Colors.light_main : Colors.dark_main} 
            />
                  </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: isDark ? Colors.light_main : Colors.dark_main }]}>
            Tags
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Enhanced Profile Section */}
        {userinfo !== null && (
          <View style={[styles.profileContainer, { 
            backgroundColor: isDark ? Colors.dark_background : Colors.light_background 
          }]}>
            <LinearGradient
              colors={isDark ? ['rgba(128, 0, 128, 0.1)', 'rgba(0, 123, 255, 0.1)'] : ['rgba(128, 0, 128, 0.05)', 'rgba(0, 123, 255, 0.05)']}
              style={styles.profileGradient}
            >
              <View style={styles.profileContent}>
                <View style={styles.profileImageContainer}>
                  <Image 
                    source={{ uri: userinfo.profilephoto }} 
                    style={[styles.profileImage, { 
                      borderColor: isDark ? Colors.light_main : Colors.dark_main 
                    }]} 
                  />
                </View>
                
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { 
                    color: isDark ? Colors.light_main : Colors.dark_main 
                  }]}>
                    {userinfo.username}
                  </Text>

                  <View style={styles.statsContainer}>
                    <View style={[styles.statItem, { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
                    }]}>
                      <Ionicons name="pricetag" size={16} color={Colors.blue} />
                      <Text style={[styles.statLabel, { 
                        color: isDark ? '#CCC' : '#666' 
                      }]}>
                        Posts
                      </Text>
                      <View style={[styles.statBadge, { backgroundColor: Colors.blue }]}>
                        <Text style={styles.statValue}>
                          {userinfo.tagscount || 0}
                        </Text>
                        </View>
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Section Divider */}
        <View style={[styles.sectionDivider, {
          borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'
        }]}>
          <Text style={[styles.sectionTitle, { 
            color: isDark ? Colors.light_main : Colors.dark_main 
          }]}>
            Tagged Posts
          </Text>
          {posts.length > 0 && (
            <Text style={[styles.sectionSubtitle, { 
              color: isDark ? '#CCC' : '#666' 
            }]}>
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </Text>
          )}
        </View>
            </View>
    ), [userinfo, isDark, posts.length]
      )

    const onRefresh = useCallback(() => {
        setrefreshing(true);
        getPosts();
        getUserInfo();
      });

  const EmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.emptyStateIcon, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' 
      }]}>
        <Ionicons name="pricetag-outline" size={48} color={Colors.blue} />
      </View>
      <Text style={[styles.emptyStateTitle, { 
        color: isDark ? Colors.light_main : Colors.dark_main 
      }]}>
        No Tags Yet
      </Text>
      <Text style={[styles.emptyStateSubtitle, { 
        color: isDark ? '#CCC' : '#666' 
      }]}>
        Tagged posts will appear here when available
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { 
      backgroundColor: isDark ? Colors.dark_background : Colors.light_background 
    }]}>
      <View style={styles.container}>
        {!isrefreshing ? (
          <FlatList
      bounces={true}
      keyExtractor={(post) => post.id}
      numColumns={2}
            style={[styles.flatList, { 
              backgroundColor: isDark ? Colors.dark_background : Colors.light_background 
            }]}
            refreshControl={
              <RefreshControl
        refreshing={isrefreshing}
        onRefresh={onRefresh}
                tintColor={Colors.blue}
                colors={[Colors.blue]}
              />
            }
      ListHeaderComponent={listHeaderComponent}
      ListFooterComponent={footerComponent}
            ListEmptyComponent={!isrefreshing && posts.length === 0 ? EmptyState : null}
      onEndReachedThreshold={0.5}
      onEndReached={getMorePosts}
            renderItem={({ item }) => (
              <ProfilePostItem post={item} userinfo={userinfo} />
            )}
            data={posts}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={posts.length === 0 ? styles.emptyContentContainer : null}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator 
              size="large" 
              color={Colors.blue} 
            />
            <Text style={[styles.loadingText, { 
              color: isDark ? Colors.light_main : Colors.dark_main 
            }]}>
              Loading tags...
            </Text>
          </View>
        )}
      </View>
     </SafeAreaView>
  )
}

export default TagsComponent;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginLeft: -40, // Compensate for back button to center title
  },
  headerSpacer: {
    width: 40,
  },
  profileContainer: {
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileGradient: {
    padding: 0,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 3,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 10,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    marginRight: 8,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 28,
    alignItems: 'center',
  },
  statValue: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionDivider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  gridItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    margin: 4,
    height: Dimensions.get('window').width / numColumns,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
});