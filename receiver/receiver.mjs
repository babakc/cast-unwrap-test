import { isWrappedSegment, unwrapSegment } from './unwrap.mjs';

const namespace = 'urn:x-cast:com.example.unwraptest';
const context = cast.framework.CastReceiverContext.getInstance();
const manager = context.getPlayerManager();
const info = document.querySelector('#info');
let unwrapped = 0;

function report(event, detail) {
  info.textContent = detail;
  try { context.sendCustomMessage(namespace, undefined, { event, detail, unwrapped }); }
  catch (error) { console.warn('Could not send diagnostic message:', error); }
}

manager.setMessageInterceptor(cast.framework.messages.MessageType.LOAD, request => {
  unwrapped = 0;
  report('loading', 'Loading test video');
  return request;
});
manager.addEventListener(cast.framework.events.EventType.ERROR, event => {
  const code = event.detailedErrorCode ?? event.reason ?? 'unknown';
  report('error', `Playback error: ${code}`);
});

const playbackConfig = new cast.framework.PlaybackConfig();
playbackConfig.segmentHandler = data => {
  if (!isWrappedSegment(data)) return data;
  try {
    const restored = unwrapSegment(data);
    unwrapped += 1;
    report('unwrapped', `Unwrapped segments: ${unwrapped}`);
    return restored;
  } catch (error) {
    report('error', `Unwrap failed: ${error.message}`);
    throw error;
  }
};

const options = new cast.framework.CastReceiverOptions();
options.playbackConfig = playbackConfig;
options.useShakaForHls = true;
options.customNamespaces = { [namespace]: cast.framework.system.MessageType.JSON };
context.start(options);
