import { View } from 'react-native';
import { CameraStream } from '@/components/CameraStream';

const WEBSOCKET_URL = 'ws://localhost:8000/ws';

export default function CameraPage() {
  return (
    <View style={{ flex: 1 }}>
      <CameraStream websocketUrl={WEBSOCKET_URL} />
    </View>
  );
} 