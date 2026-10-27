const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const payloadOffset = 2963;

export function isWrappedSegment(bytes) {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

// This is the particular format observed on the example site, not a general PNG decoder.
export function unwrapSegment(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!isWrappedSegment(bytes)) return bytes;
  if (bytes.length <= payloadOffset) throw new Error('Wrapped segment is too short');

  const encoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(payloadOffset)).replace(/\s+/g, '');
  if (!/^[A-Za-z0-9_+/-]+={0,2}$/.test(encoded)) throw new Error('Invalid Base64 payload');
  const unpadded = encoded.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/');
  if (unpadded.length % 4 === 1) throw new Error('Invalid Base64 payload length');
  const binary = atob(unpadded + '='.repeat((4 - unpadded.length % 4) % 4));
  if (!binary.length) throw new Error('Empty segment payload');
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
