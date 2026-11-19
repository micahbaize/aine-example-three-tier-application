module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!migrations/**',
    '!index.js'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/migrations/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/migrations/']
};
