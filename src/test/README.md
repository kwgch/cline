# Testing in Cline

This directory contains tests that require the VSCode API and need to be run using the `vscode-test` framework. However, these tests require a graphical environment (X server) to run, which may not be available in all environments, especially in CI/CD pipelines or containerized environments.

## Test Structure

The Cline project has two types of tests:

1. **Unit tests** - These tests don't depend on the VSCode API and can be run directly with Mocha. They are located in:
   - `src/shared/**/*.test.ts`
   - `src/utils/**/*.test.ts`
   - `src/api/**/*.test.ts`

2. **VSCode integration tests** - These tests depend on the VSCode API and need to be run using the `vscode-test` framework. They are located in:
   - `src/test/**/*.test.ts`

## Running Tests

### Running Unit Tests Only

To run only the unit tests (which don't require a graphical environment):

```bash
npm test
```

This will run all the tests in the `shared`, `utils`, and `api` directories.

### Running VSCode Integration Tests

To run the VSCode integration tests (requires a graphical environment):

```bash
npm run test:vscode
```

### Running All Tests

To run both unit tests and VSCode integration tests:

```bash
npm run test:all
```

## Troubleshooting

If you encounter errors like the following when running `npm run test:vscode`:

```
[ERROR:ozone_platform_x11.cc(245)] Missing X server or $DISPLAY
[ERROR:env.cc(258)] The platform failed to initialize.  Exiting.
```

This indicates that the tests are being run in an environment without a graphical display server. You have a few options:

1. Run only the unit tests with `npm test`
2. Set up an X virtual framebuffer (Xvfb) if you're in a headless environment
3. Run the tests in an environment with a graphical display server

### Setting up Xvfb

If you're running in a CI/CD environment, you can set up Xvfb to provide a virtual display:

```bash
# Install Xvfb
apt-get update && apt-get install -y xvfb

# Run tests with Xvfb
xvfb-run --auto-servernum npm run test:vscode
```

## Adding New Tests

When adding new tests:

1. For tests that don't require the VSCode API, place them alongside the code they're testing with a `.test.ts` suffix
2. For tests that require the VSCode API, place them in the `src/test` directory
