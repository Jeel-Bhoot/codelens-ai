import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * Flat config. eslint-config-next 16 ships a native flat array, so it is
 * spread directly — no FlatCompat shim, which double-loads the plugin and
 * blows up on a circular reference.
 */
const eslintConfig = [
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'public/**', 'next-env.d.ts'] },

  ...nextCoreWebVitals,

  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react/no-unescaped-entities': 'off',
    },
  },

  // Last wins in flat config, so this override has to sit after the block it
  // is overriding. Build scripts are CLI tools — stdout is their interface,
  // not a leftover debug statement.
  {
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
];

export default eslintConfig;
