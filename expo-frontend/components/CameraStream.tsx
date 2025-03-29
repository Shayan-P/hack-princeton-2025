import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
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
  const [subtitle, setSubtitle] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Not connected');

  const cameraRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopStreaming();
      wsRef.current?.close();
    };
  }, []);

  const connectToServer = () => {
    try {
      wsRef.current = new WebSocket(websocketUrl);
      
      wsRef.current.onopen = () => {
        setConnectionStatus('Connected to server');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.frame_data) {
            setServerImage(data.frame_data);
          }
          if (data.subtitle) {
            setSubtitle(data.subtitle);
          }
        } catch (error) {
          console.error('Error processing server message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('Connection error');
      };

      wsRef.current.onclose = () => {
        setConnectionStatus('Disconnected from server');
        setIsStreaming(false);
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('Connection failed');
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
          console.log(photo.base64);
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
          <CameraView 
            ref={cameraRef}
            style={styles.camera} 
            facing={facing}
          />
        </View>
        
        <View style={styles.streamBox}>
          <Text style={styles.heading}>Server Feed</Text>
          {serverImage ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${serverImage}` }}
              style={styles.serverFeed}
            />
          ) : (
            <View style={styles.serverFeed} />
          )}
        </View>
      </View>

      <View style={styles.subtitles}>
        <Text style={styles.subtitleText}>{subtitle}</Text>
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
    fontSize: 18,
    color: '#888',
    marginBottom: 10,
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
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
  },
  subtitleText: {
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
});
