import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { after, before, test } from 'node:test';
import { io } from 'socket.io-client';

const PORT = 32_123;
const ORIGIN = `http://localhost:${PORT}`;
let server;

function waitForEvent(socket, eventName, timeoutMs = 3_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${eventName}`)), timeoutMs);
    socket.once(eventName, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

function connectClient() {
  return io(ORIGIN, { autoConnect: false, forceNew: true, transports: ['websocket'] });
}

before(async () => {
  server = spawn(process.execPath, ['dist/server.cjs'], {
    env: {
      ...process.env,
      ALLOWED_ORIGINS: ORIGIN,
      NODE_ENV: 'production',
      PORT: String(PORT),
      PUBLIC_APP_URL: ORIGIN,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server did not start in time')), 5_000);
    server.once('error', reject);
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('DropThings signaling server listening')) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
});

after(() => {
  server?.kill('SIGTERM');
});

test('health endpoint reports an available signaling server', async () => {
  const response = await fetch(`${ORIGIN}/api/health`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.status, 'ok');
});

test('room authority, PIN privacy, and admin delegation remain server-controlled', async () => {
  const admin = connectClient();
  const guest = connectClient();
  const protectedGuest = connectClient();

  try {
    const initialConnections = Promise.all([waitForEvent(admin, 'connect'), waitForEvent(guest, 'connect')]);
    admin.connect();
    guest.connect();
    await initialConnections;

    const adminJoinedPromise = waitForEvent(admin, 'room-joined');
    admin.emit('join-room', { roomId: 'ROOM42', deviceName: 'Admin' });
    const adminJoined = await adminJoinedPromise;
    assert.equal(adminJoined.isAdmin, true);
    assert.equal(typeof adminJoined.adminToken, 'string');

    const guestJoinedPromise = waitForEvent(guest, 'room-joined');
    guest.emit('join-room', { roomId: 'ROOM42', deviceName: 'Guest', isCreator: true });
    const guestJoined = await guestJoinedPromise;
    assert.equal(guestJoined.isAdmin, false, 'client-provided creator flags must be ignored');

    const securityUpdatePromise = waitForEvent(guest, 'room-security-updated');
    admin.emit('update-room-security', { roomId: 'ROOM42', pin: '4826' });
    const securityUpdate = await securityUpdatePromise;
    assert.equal(securityUpdate.hasPin, true);
    assert.equal('pin' in securityUpdate, false, 'PIN values must never be broadcast');

    const protectedConnection = waitForEvent(protectedGuest, 'connect');
    protectedGuest.connect();
    await protectedConnection;
    const joinFailurePromise = waitForEvent(protectedGuest, 'join-failed');
    protectedGuest.emit('join-room', { roomId: 'ROOM42', deviceName: 'Protected guest' });
    const joinFailure = await joinFailurePromise;
    assert.equal(joinFailure.reason, 'PIN_REQUIRED');

    const protectedJoinPromise = waitForEvent(protectedGuest, 'room-joined');
    protectedGuest.emit('join-room', { roomId: 'ROOM42', deviceName: 'Protected guest', pin: '4826' });
    const protectedJoin = await protectedJoinPromise;
    assert.equal(protectedJoin.isAdmin, false);

    let leakedOffer = false;
    guest.once('files-offered', () => { leakedOffer = true; });
    const fileOfferPromise = waitForEvent(protectedGuest, 'files-offered');
    admin.emit('offer-files', {
      roomId: 'ROOM42',
      targetPeerId: protectedJoin.peerId,
      senderName: 'Admin',
      files: [{ id: 'file-test', name: 'example.txt', size: 12, type: 'text/plain' }],
    });
    const fileOffer = await fileOfferPromise;
    assert.equal(fileOffer.files[0].name, 'example.txt');
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(leakedOffer, false, 'directed file offers must not leak to other room peers');

    const fileRequestPromise = waitForEvent(admin, 'file-requested');
    protectedGuest.emit('request-file', {
      roomId: 'ROOM42',
      targetPeerId: adminJoined.peerId,
      fileId: 'file-test',
    });
    const fileRequest = await fileRequestPromise;
    assert.equal(fileRequest.requesterPeerId, protectedJoin.peerId);

    const adminTokenPromise = waitForEvent(protectedGuest, 'admin-token-issued');
    admin.emit('set-peer-admin', {
      roomId: 'ROOM42',
      targetPeerId: protectedJoin.peerId,
      isAdmin: true,
    });
    const delegatedAdmin = await adminTokenPromise;
    assert.equal(typeof delegatedAdmin.adminToken, 'string');
    assert.ok(delegatedAdmin.adminToken.length >= 32);
  } finally {
    admin.disconnect();
    guest.disconnect();
    protectedGuest.disconnect();
  }
});
