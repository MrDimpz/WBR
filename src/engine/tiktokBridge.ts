import { ChatMessagePayload, WsConnectionState } from '../types/game';

declare global {
  interface Window {
    onTikTokChatMessage?: (payload: {
      nickname?: string;
      username?: string;
      avatarUrl?: string;
      comment: string;
    }) => void;
  }
}

type MessageCallback = (msg: ChatMessagePayload) => void;
type StatusCallback = (state: WsConnectionState, errorMessage?: string) => void;

/**
 * Parses TikFinity, EulerStream, TikTok-Live-Connector, or custom flat JSON chat payloads.
 * Prefers display nickname over @uniqueId handle.
 */
function parseBridgePayload(raw: unknown): ChatMessagePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  // Format 1: TikFinity / TikTok-Live-Connector { event: 'chat', data: { nickname, uniqueId, profilePictureUrl, comment } }
  if (obj.event === 'chat' && obj.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>;
    const username = String(
      data.nickname || data.uniqueId || data.username || ''
    ).trim();
    const comment = String(data.comment || data.text || data.message || '').trim();
    const avatarUrl =
      typeof data.profilePictureUrl === 'string'
        ? data.profilePictureUrl
        : typeof data.avatarUrl === 'string'
          ? data.avatarUrl
          : undefined;
    if (username && comment) {
      return { username, avatarUrl, comment, isBot: false };
    }
  }

  // Format 2: Flat JSON { nickname, username, avatarUrl, comment }
  const username = String(obj.nickname || obj.username || obj.uniqueId || '').trim();
  const comment = String(obj.comment || obj.text || obj.message || '').trim();
  if (username && comment) {
    const avatarUrl =
      typeof obj.avatarUrl === 'string'
        ? obj.avatarUrl
        : typeof obj.profilePictureUrl === 'string'
          ? obj.profilePictureUrl
          : undefined;
    return { username, avatarUrl, comment, isBot: false };
  }

  return null;
}

export class TikTokBridgeClient {
  private ws: WebSocket | null = null;
  private onMessage: MessageCallback;
  private onStatus: StatusCallback;

  constructor(onMessage: MessageCallback, onStatus: StatusCallback) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
  }

  public attachWindowHook(): () => void {
    window.onTikTokChatMessage = (payload) => {
      const displayName = (payload?.nickname || payload?.username || '').trim();
      if (!payload || !displayName || !payload.comment) return;
      this.onMessage({
        username: displayName,
        avatarUrl: payload.avatarUrl,
        comment: payload.comment.trim(),
        isBot: false,
      });
    };

    return () => {
      delete window.onTikTokChatMessage;
    };
  }

  public connect(url: string): void {
    this.disconnect();
    const trimmed = url.trim();
    if (!trimmed) {
      this.onStatus('ERROR', 'Enter a WebSocket URL (e.g. ws://localhost:21213)');
      return;
    }

    try {
      this.onStatus('CONNECTING');
      const socket = new WebSocket(trimmed);
      this.ws = socket;

      socket.onopen = () => {
        this.onStatus('CONNECTED');
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data));
          const chat = parseBridgePayload(parsed);
          if (chat) {
            this.onMessage(chat);
          }
        } catch {
          // Ignore non-JSON keepalive frames
        }
      };

      socket.onerror = () => {
        this.onStatus('ERROR', 'Unable to connect — verify local TikFinity/bridge is running.');
      };

      socket.onclose = () => {
        if (this.ws === socket) {
          this.ws = null;
          this.onStatus('DISCONNECTED');
        }
      };
    } catch {
      this.onStatus('ERROR', 'Invalid WebSocket URL.');
    }
  }

  public disconnect(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.onStatus('DISCONNECTED');
  }
}
