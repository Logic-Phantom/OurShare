// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'node_modules/*', '.expo/*', 'scripts/*'] },
  {
    // src/domain is pure: the current date and the random seed always come in as arguments.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-*', 'react/*', 'expo', 'expo-*', '@expo/*'], message: 'src/domain must stay framework-free.' },
            { group: ['@/features/*', '@/infrastructure/*', '@/app/*', '@/components/*', '@/design-system/*'], message: 'src/domain may only import itself.' },
          ],
        },
      ],
      'no-restricted-globals': ['error', { name: 'Date', message: 'Use scheduling/date-only and take "today" as an argument.' }],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Use the seeded random generator.' }],
    },
  },
]);
