const status = document.querySelector('#status');
const diagnostics = document.querySelector('#diagnostics');
const connectButton = document.querySelector('#connect');
const playButton = document.querySelector('#play');
const appId = document.querySelector('#appId');
const sample = document.querySelector('#sample');
const namespace = 'urn:x-cast:com.example.unwraptest';

function initialize(available, errorInfo) {
  if (!available) {
    status.textContent = `Cast SDK unavailable: ${errorInfo?.description ?? 'unknown error'}`;
    return;
  }
  const context = cast.framework.CastContext.getInstance();
  let controller;
  let listenerSession = null;
  context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, () => {
    const session = context.getCurrentSession();
    playButton.disabled = !session;
    status.textContent = session ? `Connected to ${session.getCastDevice().friendlyName}.` : 'Disconnected.';
    if (session && session !== listenerSession) {
      listenerSession = session;
      session.addMessageListener(namespace, (_namespace, raw) => {
        try {
          const message = typeof raw === 'string' ? JSON.parse(raw) : raw;
          document.querySelector('#receiverStatus').textContent = `Receiver: ${message.detail}`;
        } catch { document.querySelector('#receiverStatus').textContent = 'Receiver sent an unreadable status.'; }
      });
    }
  });
  connectButton.addEventListener('click', async () => {
    const id = appId.value.trim();
    if (!/^[A-Fa-f0-9]{8}$/.test(id)) { status.textContent = 'Enter the eight-character receiver application ID.'; return; }
    try {
      context.setOptions({ receiverApplicationId: id, autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED });
      if (!controller) {
        const player = new cast.framework.RemotePlayer();
        controller = new cast.framework.RemotePlayerController(player);
        controller.addEventListener(cast.framework.RemotePlayerEventType.ANY_CHANGE, () => {
          const seconds = Math.floor(player.currentTime || 0);
          diagnostics.textContent = `Player: ${player.playerState ?? 'unknown'}; position: ${seconds}s; loaded: ${player.isMediaLoaded ? 'yes' : 'no'}.`;
        });
      }
      await context.requestSession();
    } catch (error) { status.textContent = `Connection failed: ${error?.message ?? String(error)}`; }
  });
  playButton.addEventListener('click', async () => {
    try {
      const session = context.getCurrentSession();
      if (!session) throw new Error('Choose a TV first');
      const url = new URL(`./media/${sample.value}/playlist.m3u8`, location.href).href;
      const media = new chrome.cast.media.MediaInfo(url, 'application/x-mpegURL');
      media.streamType = chrome.cast.media.StreamType.BUFFERED;
      media.hlsSegmentFormat = chrome.cast.media.HlsSegmentFormat.TS;
      media.hlsVideoSegmentFormat = chrome.cast.media.HlsVideoSegmentFormat.MPEG2_TS;
      media.metadata = new chrome.cast.media.GenericMediaMetadata();
      media.metadata.title = sample.value === 'wrapped' ? 'Wrapped test video' : 'Ordinary test video';
      await session.loadMedia(new chrome.cast.media.LoadRequest(media));
      status.textContent = 'Load request accepted. Check the playback status and TV.';
    } catch (error) { status.textContent = `Load failed: ${error?.message ?? String(error)}`; }
  });
  connectButton.disabled = false;
  status.textContent = 'Enter the receiver application ID, then choose a TV.';
}

// Receiver messages are separate from playback status so neither hides the other.
const receiverStatus = document.createElement('p');
receiverStatus.id = 'receiverStatus';
receiverStatus.textContent = 'Receiver: waiting for messages.';
diagnostics.after(receiverStatus);
if (window.__castSdkState) initialize(window.__castSdkState.available, window.__castSdkState.errorInfo);
else window.addEventListener('cast-sdk-available', () => initialize(window.__castSdkState.available, window.__castSdkState.errorInfo), { once: true });
