/* eslint-disable */
import { dirname, resolve } from 'node:path';
const web = resolve(__dirname, '../reference-react-app');
const webPackage = (name: string) =>
  dirname(require.resolve(`${name}/package.json`, { paths: [web] }));
export default {
  displayName: 'reference-react',
  preset: '../jest.preset.js',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^react(/.*)?$': `${webPackage('react')}$1`,
    '^react-dom(/.*)?$': `${webPackage('react-dom')}$1`,
    '^@testing-library/react$': webPackage('@testing-library/react'),
  },
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../coverage/reference-react',
};
