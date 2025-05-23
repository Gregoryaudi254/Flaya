import { Stack } from 'expo-router'; // or any other layout component

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false ,animation:'slide_from_right'}} />
      <Stack.Screen name="signUp" options={{ headerShown: false ,animation:'slide_from_right'}} />

      <Stack.Screen name="signIn" options={{ headerShown: false , animation:'slide_from_right'}} />

      <Stack.Screen name="forgotpassword" options={{ headerShown: false, animation:'slide_from_right' }} />
      
     
    </Stack>
  );
}