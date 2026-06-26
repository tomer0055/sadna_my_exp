import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalWebSocket = global.WebSocket;
let createdSockets: Array<{ close: ReturnType<typeof vi.fn> }>;

async function loadModule() {
  return await import('./presenceSocket');
}

describe('presenceSocket', () => {
  beforeEach(() => {
    createdSockets = [];
    class MockWebSocket {
      close = vi.fn();
      constructor() {
        createdSockets.push(this);
      }
    }
    (global as any).WebSocket = MockWebSocket;
    vi.resetModules();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  it('GivenValidToken_WhenConnectPresenceCalled_ThenOpensWebSocket', async () => {
    const { connectPresence } = await loadModule();
    connectPresence('my-token');

    expect(createdSockets).toHaveLength(1);
  });

  it('GivenEmptyToken_WhenConnectPresenceCalled_ThenDoesNotOpenSocket', async () => {
    const { connectPresence } = await loadModule();
    connectPresence('');

    expect(createdSockets).toHaveLength(0);
  });

  it('GivenExistingConnection_WhenConnectPresenceCalled_ThenClosesOldAndOpensNew', async () => {
    const { connectPresence } = await loadModule();
    connectPresence('token-1');
    connectPresence('token-2');

    expect(createdSockets).toHaveLength(2);
    expect(createdSockets[0].close).toHaveBeenCalledTimes(1);
  });

  it('GivenOpenSocket_WhenDisconnectPresenceCalled_ThenClosesSocket', async () => {
    const { connectPresence, disconnectPresence } = await loadModule();
    connectPresence('my-token');
    disconnectPresence();

    expect(createdSockets[0].close).toHaveBeenCalledTimes(1);
  });

  it('GivenNoSocket_WhenDisconnectPresenceCalled_ThenDoesNotThrow', async () => {
    const { disconnectPresence } = await loadModule();
    expect(() => disconnectPresence()).not.toThrow();
  });

  it('GivenWebSocketThrows_WhenConnectPresenceCalled_ThenDoesNotThrow', async () => {
    (global as any).WebSocket = class {
      constructor() { throw new Error('WebSocket not supported'); }
    };
    vi.resetModules();
    const { connectPresence } = await loadModule();

    expect(() => connectPresence('my-token')).not.toThrow();
  });
});
