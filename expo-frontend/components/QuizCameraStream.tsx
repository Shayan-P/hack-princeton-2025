import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Image, Dimensions, Alert } from 'react-native';
import { Buffer } from 'buffer';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { LogLevel } from 'react-native-reanimated/lib/typescript/logger';
import * as Contacts from 'expo-contacts';
import { Linking } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

interface CameraStreamProps {
  websocketUrl: string;
}

export function QuizCameraStream({ websocketUrl }: CameraStreamProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false);
  const [serverImage, setServerImage] = useState<string | null>(null);
  const [isGuide, setIsGuide] = useState(true);
  const DEVLOPER_PHONE_NUMBER = process.env.EXPO_PUBLIC_DEVELOPER_PHONE_NUMBER;
//   const [subtitle, setSubtitle] = useState('Sign Language Subtitle Box');
//   const [prediction, setPrediction] = useState('Word Prediction With LLM');
  const [currentLetter, setCurrentLetter] = useState('Current Recognized Letter');
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  const capitalAlphabet = ['A', 'B', 'C'] // , 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  const [nextLetter, setNextLetter] = useState(capitalAlphabet[0]);
  let game_level = 0; // number of letters completed

  const cameraRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [hasWon, setHasWon] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const squareSize = Math.min(screenWidth, screenHeight / 2);


  const getPermissionsContact = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'You need to grant contacts permission to add a contact.');
      return false;
    }
    return true;
  };

    const addContact = async () => {
        // const contact = {
        //     [Contacts.Fields.FirstName]: 'Danial',
        //     [Contacts.Fields.LastName]: 'Hosseintabar',
        //     [Contacts.Fields.Company]: 'MIT',
        //     [Contacts.Fields.PhoneNumbers]: [DEVLOPER_PHONE_NUMBER],
        //   };
        //   const contactId = await Contacts.addContactAsync(contact);
        
        const contact = {
            [Contacts.Fields.FirstName]: 'Danial',
            [Contacts.Fields.LastName]: 'Hosseintabar',
            [Contacts.Fields.PhoneNumbers]: [{ label: 'mobile', number: DEVLOPER_PHONE_NUMBER }],
          };
        
          try {
            const contactId = await Contacts.addContactAsync(contact);
            Alert.alert('Success', `Contact added. Get ready to call the Great Danial Hosseintabar.`);
            const makePhoneCall = (phoneNumber: number) => {
                Linking.openURL(`tel:${phoneNumber}`);
            };
            makePhoneCall(DEVLOPER_PHONE_NUMBER);
          } catch (error) {
            Alert.alert('Error', `Failed to add contact ${error}`);
          }
    
    }

    const callMe = async () => { // Call Danial Hosseintabar and thank him!
        getPermissionsContact();
        addContact();
    }


  

    const loadWin = () => {
        if(hasWon){
            return;
        }
        setHasWon(true);
    };

  const setSkipLevel = () => {
    
    console.log('started');
    setInterval(() => {
        game_level += 1;
                if(game_level < capitalAlphabet.length) {
                    setNextLetter(capitalAlphabet[game_level]);
                } else {
                    loadWin();
                }
    }, 5000);
  }
  

  useEffect(() => {
    async function loadAndPlayMusic() {
      try {
        // Make sure audio is allowed to play in silent mode (iOS)
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          require('../assets/gamemusic.mp3'), // Update this path to your music file
          { 
            isLooping: true,
            volume: 1.0
          }
        );
        setSound(sound);
        await sound.playAsync();
      } catch (error) {
        console.error('Error loading sound', error);
      }
    }

    loadAndPlayMusic();

    return () => {
      stopStreaming();
      wsRef.current?.close();
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const connectToServer = () => {
    if (Platform.OS === 'ios') {
        return
      } 
    try {
      setConnectionStatus('Connecting to server...');
      wsRef.current = new WebSocket(websocketUrl);
      
      wsRef.current.onopen = () => {
        setConnectionStatus('Connected to server');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.current) {
            console.log(`received current letter ${data.current}`);
            setCurrentLetter(data.current)
            if(data.current === capitalAlphabet[game_level]){
                game_level += 1;
                if(game_level < capitalAlphabet.length) {
                    setNextLetter(capitalAlphabet[game_level]);
                } else {
                    loadWin();
                }
            }
          }
          if (data.frame_data) {
            setServerImage(data.frame_data);
          }
        //   if (data.subtitle) {
        //     // console.log(`${data.subtitle}`)
        //     console.log('SUBTITLE')
        //     console.log(data.subtitle)
        //     let badLetters = ['\n']
        //     for(const letter of data.subtitle){
        //       if(!capitalAlphabet.includes(letter)){
        //         badLetters.push(letter)
        //       }
        //     }
        //     for(const letter of badLetters){
        //       data.subtitle = data.subtitle.replace(letter, ' ')
        //     }
        //     setSubtitle(data.subtitle.replace('\n', ' '));
        //   }
        //   if (data.predicted) {
        //     // console.log(`received prediction ${data.predicted}`);
        //     setPrediction(data.predicted)
        //   }
        } catch (error) {
          console.error('Error processing server message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus(`Connection error: ${'Failed to connect to server'}`);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            console.log('Attempting to reconnect...');
            connectToServer();
          }
        }, 5000);
      };

      wsRef.current.onclose = () => {
        setConnectionStatus('Disconnected from server');
        setIsStreaming(false);
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }

        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            console.log('Attempting to reconnect...');
            connectToServer();
          }
        }, 5000);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        connectToServer();
      }, 5000);
    }
  };

  const startStreaming = async () => {
    console.log("startStreaming")
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectToServer();
    }

    setIsStreaming(true);
    setSkipLevel(); 
    isStreamingRef.current = true;

    // streamIntervalRef.current = setInterval(async () => {
    //   if (!isStreamingRef.current || !cameraRef.current) return;

    //   try {
    //     const photo = await cameraRef.current.takePictureAsync({
    //       quality: 0.7,
    //       base64: true,
    //       skipProcessing: true,
    //     });

    //     if (wsRef.current?.readyState === WebSocket.OPEN) {
    //       // console.log("sending photo", photo.base64)
    //       // const binaryData = Buffer.from(photo.base64, 'base64');
    //       // wsRef.current.send(binaryData);
    //       wsRef.current.send(photo.base64);
    //       // console.log(photo.base64);
    //     }
    //   } catch (error) {
    //     console.error('Error capturing frame:', error);
    //   }
    // }, 100);
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    isStreamingRef.current = false;
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={() => {requestPermission();}} title="grant permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  if(hasWon){
    return(
    <View style={styles.guideContainer}>
        <Text style={styles.winTitle}>CONGRATULATIONS!</Text>
        <Image
          source={require('../assets/images/winner.jpg')}
          style={{width: '50%', height: '50%', alignSelf: 'center', marginBottom: 20}}
          resizeMode="contain"
        />
        <Text style={styles.guideText}>
          You've successfully learned the basics of ASL letters!
        </Text>
        <Text style={styles.guideText}>
          Keep practicing to become more fluent in American Sign Language.
        </Text>
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={() => {
            setHasWon(false);
            game_level = 0;
            setNextLetter(capitalAlphabet[0]);
          }}
        >
          <Text onPress={callMe} style={styles.continueButtonText}>Call the game developer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if(!isGuide){
    return (
        <View style={styles.container}>
        <View style={styles.streamsContainer}>
            <View style={styles.streamBox}>
            <Text style={styles.heading}>Camera Feed</Text>
            <View style={[styles.cameraContainer, { width: squareSize }]}>
                <CameraView 
                ref={cameraRef}
                style={styles.camera} 
                facing={facing}
                />
            </View>
            </View>
            
            {/* <View style={styles.streamBox}>
            <Text style={styles.heading}>Server Feed</Text>
            {serverImage ? (
                <Image
                source={{ uri: `data:image/jpeg;base64,${serverImage}` }}
                style={styles.serverFeed}
                />
            ) : (
                <View style={styles.serverFeed} />
            )}
            </View> */}
        </View>


        
        <View style={styles.nextLetter}>
            <Text style={styles.nextLetterText}>
                Throw some <Text style={{ fontSize: 20, fontWeight: 'bold'}}>{nextLetter}</Text>s!
                </Text>
        </View>

        <View style={styles.currentLetter}>
            <Text style={styles.currentLetterText}>{currentLetter}</Text>
        </View>

        {/* <View style={styles.subtitles}>
            <Text style={styles.subtitleText}>{subtitle}</Text>
        </View>

        <View style={styles.predictions}>
            <Text style={styles.predictionsText}>{prediction}</Text>
        </View> */}

        <View style={styles.controls}>
            <Button
            title={isStreaming ? "Stop Streaming" : "Start Streaming"}
            onPress={isStreaming ? stopStreaming : startStreaming}
            />
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Text style={styles.flipText}>Flip Camera</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.status}>
            <Text style={styles.statusText}>{connectionStatus}</Text>
        </View>
        </View>
    );
    } else {
        return(
            <View style={styles.guideContainer}>
                <Text style={styles.guideTitle}>Learn American Sign Language (ASL) with some</Text>
                <Text style={styles.quizTitle}>FUN GAMES!</Text>
                <Text style={styles.guideText}>
                    American Sign Language is a complete, natural language that has the same linguistic properties as spoken languages. ASL is expressed by movements of the hands and face.
                </Text>
                <Text style={styles.guideText}>
                    It is the primary language of many North Americans who are deaf and hard of hearing, and is used by many hearing people as well.
                </Text>
                <Text style={styles.guideText}>
                    In this quiz, you'll learn to recognize basic ASL letters and numbers. Show your hand signs to the camera and we'll help you practice!
                </Text>
                <TouchableOpacity 
                    style={styles.continueButton}
                    onPress={() => {setIsGuide(false);}}
                >
                    <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#242424',
    padding: 20,
  },
  streamsContainer: {
    flexDirection: 'row',
    gap: 20,
    flex: 1,
  },
  streamBox: {
    flex: 1,
    width: '48%',
  },
  heading: {
    fontSize: 25,
    color: '#888',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Arial',
  },
  camera: {
    flex: 1,
    borderRadius: 8,
  },
  serverFeed: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  controls: {
    marginTop: 20,
    gap: 10,
    alignSelf: 'center',
    width: 'auto',
  },
  status: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
  },
  statusText: {
    color: '#888',
    textAlign: 'center',
  },
  subtitles: {
    padding: 10,
    backgroundColor: 'rgba(0, 101, 8, 0.5)',
    borderRadius: 4,
    width: '50%',
    alignSelf: 'center',
  },
  currentLetter: {
    padding: 10,
    backgroundColor: 'rgba(10, 0, 78, 0.5)',
    borderRadius: 4,
    width: '50%',
    alignSelf: 'center',
    marginBottom: 10,
},
nextLetter: {
    padding: 10,
    backgroundColor: 'rgba(0, 78, 56, 0.5)',
    borderRadius: 4,
    width: '50%',
    alignSelf: 'center',
    marginBottom: 10,
},
  predictions: {
    marginTop: 10,
    marginBottom: 'auto',
    padding: 10,
    backgroundColor: 'rgba(84, 0, 0, 0.5)',
    borderRadius: 4,
    width: '50%',
    alignSelf: 'center',
  },
  subtitleText: {
    color: 'white',
    textAlign: 'center',
  },
  predictionsText: {
    color: 'white',
    textAlign: 'center',
  },
  currentLetterText: {
    color: 'white',
    textAlign: 'center',
  },
  nextLetterText: {
    color: 'white',
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
  },
  flipButton: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  flipText: {
    color: 'white',
    fontSize: 16,
  },
  cameraContainer: {
    aspectRatio: 1, // Forces a square shape
    alignSelf: 'center', // Centers the container horizontally
    borderRadius: 8,
    overflow: 'hidden',  // This ensures the camera view respects the border radius
  },
  guideContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#242424',
    justifyContent: 'center',
  },
  guideTitle: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
},
  guideText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  continueButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  quizTitle: {
    fontSize: 28,
    color: 'rgb(255, 14, 14)',
    marginBottom: 20,
    textAlign: 'center', 
    fontWeight: 'bold',
    transform: [{scale: 1.1}],
    opacity: 0.8,
    shadowColor: 'rgb(248, 64, 23)',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.0,
    shadowRadius: 20,
    textShadowColor: 'rgb(187, 29, 29)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 30,
  },
  winTitle: {
    fontSize: 28,
    color: 'rgb(14, 255, 50)',
    marginBottom: 20,
    textAlign: 'center', 
    fontWeight: 'bold',
    transform: [{scale: 1.1}],
    opacity: 0.8,
    shadowColor: 'rgb(38, 248, 23)',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.0,
    shadowRadius: 20,
    textShadowColor: 'rgb(58, 187, 29)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 30,
  },
});
