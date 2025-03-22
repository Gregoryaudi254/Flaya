import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { Stack } from 'expo-router';

import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';


export default function RootLayout() {
    const colorScheme = useColorScheme();
   
  
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false ,animation:'slide_from_right'}}>


          <Stack.Screen name="index" options={{title:'Notifications'}} />
         
           <Stack.Screen name="messaging" options={{ title: 'Messaging',headerShown:true}} /> 

           <Stack.Screen name="chat" options={{headerShown:true,title:''}} />

           <Stack.Screen name="Demo" options={{headerShown:true,title:''}} />

           


        </Stack>
      </ThemeProvider>
    );
  }
  