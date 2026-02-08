import { useChat } from './useChat';

export function useDeviceChat(deviceId: string) {
  return useChat({
    sessionType: 'chat',
    deviceId,
  });
}
