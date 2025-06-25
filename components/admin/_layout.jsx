import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="panel" options={{ title: 'Admin Panel' }} />
        <Stack.Screen name="orders" options={{ title: 'All Business Orders' }} />
        <Stack.Screen name="approvals" options={{ title: 'Business Approvals' }} />
        <Stack.Screen name="edit-event" options={{ title: 'Edit Event' , headerShown: false }} />
        <Stack.Screen name="create-event" options={{ title: 'Add Event', headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
} 