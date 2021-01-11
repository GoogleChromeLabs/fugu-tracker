# Fugu API Tracker

The [Fugu API Tracker](https://fugu-tracker.web.app/) is a PWA to help you keep up-to-date with the implementation status of [new web capabilities](https://web.dev/fugu-status/), specifically as they move through the Chromium project. This repo contains the source code for building and deploying the tracker itself; if you would like to request a new capability, please look through the [existing list of request](https://goo.gl/qWhHXU) to see if there’s a similar request you can add to and star, or [file a new feature request](https://bugs.chromium.org/p/chromium/issues/entry?labels=Proj-Fugu) with Chromium to make your voice heard. If you would like to request documentation about a capability, please [check for it on web.dev](https://web.dev/fugu-status/) and, if what you're looking for is not there, file a [content request for web.dev](https://github.com/GoogleChrome/web.dev/issues/new/choose).

## Contributing

The site is a static site built on Node.js and canonically is run on Node 14.5.0. We recommend you install [Volta](https://volta.sh/) to manage your Node version and ensure you're using the right version of Node when developing locally.

### Key NPM Commands

- `npm start` - Starts a local development server, watches for source code changes, and automatically reloads the browser when changes are compiled
- `npm run build` - Performs a production build of the codebase
- `npm run lint` - Lints source code with ESLint and Prettier
- `npm run prettier:fix` - Fixes Prettier failures
