const { workspaces } = require('./package.json');
const { paths } = require('./tsconfig.base.json').compilerOptions;
const moduleNameMapper = Object.fromEntries(
  Object.entries(paths).map(([name, [file]]) => [
    `^${name}$`,
    `<rootDir>/../${file}`,
  ])
);
module.exports = {
  projects: workspaces.map((directory) => ({
    displayName: directory,
    rootDir: directory,
    testMatch: [
      '<rootDir>/src/**/*.spec.ts',
      '<rootDir>/src/**/*.spec.tsx',
      '<rootDir>/src/**/*.test.ts',
      '<rootDir>/src/**/*.test.tsx',
    ],
    testEnvironment: directory.includes('react') ? 'jsdom' : 'node',
    moduleNameMapper,
    setupFiles: directory.includes('react')
      ? ['<rootDir>/../reference-react/src/test-setup.ts']
      : [],
    transform: {
      '^.+\\.[tj]sx?$': [
        '@swc/jest',
        {
          jsc: {
            parser: { syntax: 'typescript', tsx: true },
            transform: { react: { runtime: 'automatic' } },
          },
        },
      ],
    },
  })),
};
