module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/index.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleNameMapper: {
    "^@app-types/(.*)$": "<rootDir>/src/types/$1",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@parsers/(.*)$": "<rootDir>/src/parsers/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"]
};
