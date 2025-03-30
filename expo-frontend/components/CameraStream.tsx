import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Image, Dimensions } from 'react-native';
import { Buffer } from 'buffer';

interface CameraStreamProps {
  websocketUrl: string;
}

export function CameraStream({ websocketUrl }: CameraStreamProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false);
  const [serverImage, setServerImage] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState('Sign Language Subtitle Box');
  const [prediction, setPrediction] = useState('Word Prediction With LLM');
  const [currentLetter, setCurrentLetter] = useState('Current Recognized Letter');
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  const capitalAlphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  const cameraRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const squareSize = Math.min(screenWidth, screenHeight / 2);


  useEffect(() => {
    return () => {
      stopStreaming();
      wsRef.current?.close();
    };
  }, []);

  const connectToServer = () => {
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
          }
          if (data.frame_data) {
            setServerImage(data.frame_data);
          }
          if (data.subtitle) {
            // console.log(`${data.subtitle}`)
            console.log('SUBTITLE')
            console.log(data.subtitle)
            let badLetters = ['\n']
            for(const letter of data.subtitle){
              if(!capitalAlphabet.includes(letter)){
                badLetters.push(letter)
              }
            }
            for(const letter of badLetters){
              data.subtitle = data.subtitle.replace(letter, ' ')
            }
            setSubtitle(data.subtitle.replace('\n', ' '));
          }
          if (data.predicted) {
            // console.log(`received prediction ${data.predicted}`);
            setPrediction(data.predicted)
          }
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
    isStreamingRef.current = true;

    streamIntervalRef.current = setInterval(async () => {
      if (!isStreamingRef.current || !cameraRef.current) return;

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
          skipProcessing: true,
        });

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // console.log("sending photo", photo.base64)
          // const binaryData = Buffer.from(photo.base64, 'base64');
          // wsRef.current.send(binaryData);
          wsRef.current.send(photo.base64);
          // console.log(photo.base64);
        }
      } catch (error) {
        console.error('Error capturing frame:', error);
      }
    }, 100);
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
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

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


      <View style={styles.currentLetter}>
        <Text style={styles.currentLetterText}>{currentLetter}</Text>
      </View>

      <View style={styles.subtitles}>
        <Text style={styles.subtitleText}>{subtitle}</Text>
      </View>

      <View style={styles.predictions}>
        <Text style={styles.predictionsText}>{prediction}</Text>
      </View>

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
});
