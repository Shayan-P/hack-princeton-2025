import { Image, StyleSheet, Platform, View, TouchableOpacity, TextInput, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';

import { QuizCameraStream } from '@/components/QuizCameraStream';


import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CameraStream } from '@/components/CameraStream';

const WEBSOCKET_URL = 'ws://localhost:8000/ws'; // todo later change it to the current server url

export default function HomeScreen() {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);
  
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
  });

  const handleGoogleSignIn = async () => {
    try {
      const result = await promptAsync();
      if (result?.type === 'success') {
        setIsSignedIn(true);
      }
    } catch (error) {
      console.error('Error during Google sign-in:', error);
    }
  };

  const handleLogin = () => {
    // TODO: Implement regular login logic
    console.log('Regular login pressed');
    setIsSignedIn(true);
    // router.push('/camera');  // Navigate to camera page
  };

  if(!isSignedIn){
    return (
      <View style={styles.container}>
        {/* Login Form */}
        <View style={styles.loginContainer}>
          <ThemedText style={styles.title}>Sign Language Translator</ThemedText>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#888"
            />
            <TextInput 
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              secureTextEntry
            />
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
            
            <View style={styles.divider}>
              <Text style={styles.dividerText}>OR</Text>
            </View>

            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
              <Image 
                source={require('../../assets/images/google-logo.png')}
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* <CameraStream websocketUrl={WEBSOCKET_URL} /> */}
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        <QuizCameraStream websocketUrl={WEBSOCKET_URL} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#242424',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    color: 'white',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 10,
  },
  input: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    color: 'white',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 10,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

// const styles = StyleSheet.create({
//   titleContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   stepContainer: {
//     gap: 8,
//     marginBottom: 8,
//   },
//   reactLogo: {
//     height: 178,
//     width: 290,
//     bottom: 0,
//     left: 0,
//     position: 'absolute',
//   },
// });
