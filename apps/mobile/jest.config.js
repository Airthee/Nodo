/**
 * Jest runs the UI journey tests (`*.journey.tsx`): screens rendered with
 * React Native Testing Library against in-memory storage. Plain unit tests
 * (`*.test.ts`) stay on `bun test`, which does not pick up journey files.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.journey.tsx'],
  setupFiles: ['<rootDir>/jest/setup.ts'],
  // Same as the jest-expo preset, plus Bun's isolated store (`node_modules/.bun/...`),
  // which the preset only handles for pnpm.
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.bun|\\.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
  },
};
