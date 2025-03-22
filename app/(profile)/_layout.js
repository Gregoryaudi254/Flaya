import { Stack } from 'expo-router'; // or any other layout component

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    
     
    </Stack>
  );
}