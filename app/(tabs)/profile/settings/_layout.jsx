import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { Stack } from 'expo-router';

import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';


export default function RootLayout() {
    const colorScheme = useColorScheme();
   
  
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: true }}>


          <Stack.Screen name="index" options={{title:'Settins and privacy'}} />
         
           <Stack.Screen name="phoneAuth" options={{ title: 'Phone'}} /> 

           <Stack.Screen name="emailAuth" options={{ title: 'Email'}} />


           <Stack.Screen name="password" options={{ title: 'Change Password'}} />


           <Stack.Screen name="privacy" options={{ title: 'Privacy'}} />  

           <Stack.Screen name="policy" options={{ title: 'Privacy policy '}} />
           <Stack.Screen name="intellectual" options={{ title: 'Intellectual Property Policy'}} />
           <Stack.Screen name="terms" options={{ title: 'Terms of Service'}} />




        </Stack>
      </ThemeProvider>
    );
  }
  