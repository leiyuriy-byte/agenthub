module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.base.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json'],
  },
  plugins: ['@typescript-eslint', 'import', 'unused-imports'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'import/order': 'off', // Disabled due to Next.js path alias issues
    'import/no-restricted-paths': 'off', // Disabled for simplicity
    'unused-imports/no-unused-imports': 'warn',
    'unused-imports/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off', // Console is allowed in this project
    // Disable strict type-checking rules
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    '@typescript-eslint/no-unnecessary-condition': 'off',
    '@typescript-eslint/no-redundant-type-constituents': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
  },
  ignorePatterns: ['node_modules', 'dist', '.next', 'out', '*.config.js'],
};
