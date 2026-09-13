import reference from '../reference-react/jest.config';

export default {
  ...reference,
  displayName: 'reference-react-app',
  setupFiles: ['<rootDir>/../reference-react/src/test-setup.ts'],
  coverageDirectory: '../coverage/reference-react-app',
};
