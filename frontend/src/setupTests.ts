// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// React Router 7 relies on TextEncoder/TextDecoder in the Node test environment.
// Provide util-based fallbacks when running under Jest.
import { TextDecoder, TextEncoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  (global as typeof global & { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  (global as typeof global & { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;
}
