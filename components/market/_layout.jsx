import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { Stack } from 'expo-router';

import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';


export default function RootLayout() {
    const colorScheme = useColorScheme();
   
  
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: true }}>


          <Stack.Screen name="index" options={{title:'Market'}} />

          <Stack.Screen name="store" options={{title:'Items'}} />

          <Stack.Screen name="addproduct" options={{title:'New Product'}} />

          <Stack.Screen name="product" options={{title:'Item'}} />
          <Stack.Screen name="productBuyer" options={{title:'',headerShown:false}} />
          
         
           
        </Stack>
      </ThemeProvider>
    );
  }
  