const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const reactCompiler = require('eslint-plugin-react-compiler');
const globals = require('globals');

module.exports = defineConfig([
  ...(Array.isArray(expoConfig) ? expoConfig : [expoConfig]),
  {
    plugins: { 'react-compiler': reactCompiler },
    rules: { 'react-compiler/react-compiler': 'error' },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    ignores: ['dist/*'],
  },
]);
