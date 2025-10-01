# Ozone: labeling service for Bluesky and other atproto apps

![ozone web interface screenshot](./docs/ozone_ui.png)

Ozone UI is a Next.js web application which talks directly to an Ozone "labeling service". It generally requires moderator or administrator privileges to function.

Features:

- viewing triaging, escalating, and actioning moderation reports
- takedowns and suspension of content and accounts
- creating and modifying labels on content and accounts
- viewing invite trees and disabling invite generation
- sending moderation emails, based on templates
- browsing app.bsky profiles and post threads, including some taken-down content
- quick-action modal (Ctrl-K)

See [User Guide](./docs/userguide.md) for a quick introduction for users of the interface.

## Docker Quickstart

```bash
# build image
docker build -t ozone .

# run the image
docker run -p 3000:3000 ozone
```

## Development Quickstart

We recommend [`nvm`](https://github.com/nvm-sh/nvm) for managing Node.js installs. This project requires Node.js version 20. `yarn` is used to manage dependencies. You can install it with `npm install --global yarn`.

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

See [HACKING](./HACKING.md) for other development tricks, like development with a local PDS instance, or working with un-released changes to the `@atproto/api` package.

## Running your own Ozone labeler service

> [!TIP]
> There is a comprehensive guide for setting up your own Ozone labeler service within [HOSTING.md](./HOSTING.md).

We offer a Dockerized setup for hosting both the Ozone UI and backend together. This allows you to run an Ozone labeler service on the network, which users of the Bluesky application can discover and opt into. There are a few requirements to get this setup:

1. Create a "service account" for your labeler. This is the account that users will discover in the application, allowing them to subscribe to your labeler. You should _not_ use your personal account as an Ozone labeler service account. It can be created on [bsky.app](https://bsky.app) just like a typical account.
2. Start running the Ozone UI and backend on the public internet. The service only relies on Postgres, and is generally quite cheap and easy to run. It should be served over https at a domain that you own.
3. Associate your Ozone labeler service with your service account, and announce it to the network. Your Ozone UI will help you with this if you login to Ozone using your service account.

This process is outlined in detail within [HOSTING.md](./HOSTING.md).

## Contributions

> While we do accept contributions, we prioritize high quality issues and pull requests. Adhering to the below guidelines will ensure a more timely review.

**Rules:**

- We may not respond to your issue or PR.
- We may close an issue or PR without much feedback.
- We may lock discussions or contributions if our attention is getting DDOSed.
- We do not provide support for build issues.

**Guidelines:**

- Check for existing issues before filing a new one, please.
- Open an issue and give some time for discussion before submitting a PR.
- If submitting a PR that includes a lexicon change, please get sign off on the lexicon change _before_ doing the implementation.
- Issues are for bugs & feature requests related to the TypeScript implementation of atproto and related services.
  - For high-level discussions, please use the [Discussion Forum](https://github.com/bluesky-social/atproto/discussions).
- Stay away from PRs that:
  - Refactor large parts of the codebase
  - Add entirely new features without prior discussion
  - Change the tooling or frameworks used without prior discussion
  - Introduce new unnecessary dependencies

Remember, we serve a wide community of users. Our day-to-day involves us constantly asking "which top priority is our top priority." If you submit well-written PRs that solve problems concisely, that's an awesome contribution. Otherwise, as much as we'd love to accept your ideas and contributions, we really don't have the bandwidth.

## Security disclosures

If you discover any security issues, please send an email to security@bsky.app. The email is automatically CCed to the entire team, and we'll respond promptly. See [SECURITY.md](https://github.com/bluesky-social/atproto/blob/main/SECURITY.md) for more info.

## License

This project is dual-licensed under MIT and Apache 2.0 terms:

- MIT license ([LICENSE-MIT](https://github.com/bluesky-social/ozone/blob/main/LICENSE-MIT) or <http://opensource.org/licenses/MIT>)
- Apache License, Version 2.0, ([LICENSE-APACHE](https://github.com/bluesky-social/ozone/blob/main/LICENSE-APACHE) or <http://www.apache.org/licenses/LICENSE-2.0>)

Downstream projects and end users may chose either license individually, or both together, at their discretion. The motivation for this dual-licensing is the additional software patent assurance provided by Apache 2.0.

Bluesky Social PBC has committed to a software patent non-aggression pledge. For details see [the original announcement](https://bsky.social/about/blog/10-01-2025-patent-pledge).

## Acknowledgements

Logo/Icon from Flaticon: https://www.flaticon.com/free-icons/lifeguard-tower
