import { jest } from '@jest/globals';

// Pin the locale so assertions on UI text do not depend on the machine running the tests.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
