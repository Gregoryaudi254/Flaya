import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { Stack } from 'expo-router';

import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';


export default function RootLayout() {
    const colorScheme = useColorScheme();
   
  

    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>


          <Stack.Screen name="index" options={{ headerShown: false }} />
         
           <Stack.Screen name="postpage" options={{ title: 'Post',headerShown:false }} /> 

           <Stack.Screen name="settings" options={{ title: 'Settings and Privacy',headerShown:false, animation:'slide_from_right' }} /> 


           <Stack.Screen name="profileedit" options={{ title: 'Edit profile',headerShown:true, animation:'slide_from_right',headerShadowVisible: false}} />

           <Stack.Screen name="userprofile" options={{ headerShown:false , animation:'slide_from_right'}} />

           <Stack.Screen name="businesscategory" options={{ title: '' , animation:'slide_from_right', headerShadowVisible:false}} />

        </Stack>
      </ThemeProvider>
    );
  }
  