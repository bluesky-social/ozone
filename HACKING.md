
### General Tips

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

### Local Integerated Development Setup

Ozone requires a PDS service to talk to, and it is convenient to point it to a local `dev-env` instance for testing during development.

1. In the separate [atproto project](https://github.com/bluesky-social/atproto), run the dev server using `yarn workspace @atproto/dev-env start`. This will run a PDS, seeded with some users and data for you.
2. Run the development server for Ozone using `yarn dev`. This will start running the Ozone frontend at `http://localhost:3000`.
3. Navigate to the login page in your browser, at [http://localhost:3000](http://localhost:3000).
4. Login using the atproto dev-env credentials, which you can find [here](https://github.com/bluesky-social/atproto/blob/a1240f0a37030766dfe0a2ccfdc2810432520ae9/packages/dev-env/src/mock/index.ts#L59-L84). For development some example login credentials that would work are:
   - Service URL: http://localhost:2583
   - Account handle: mod.test
   - Password: mod-pass

You can also test with different permission levels with the following credentials (<username>/<password>)

- Triage: triage.test/triage-pass
- Triage: admin-mod.test/admin-mod-pass

### Working with unpublished changes to `atproto`

In the course of development there may be updates to the atproto client that are not yet published to npm, but you would like to use with Ozone. Here's the workflow for using unpublished changes to the @atproto/api package:

1. Ensure the [atproto/](https://github.com/bluesky-social/atproto) project lives as a sibling to the [ozone/](https://github.com/bluesky-social/ozone) project on your filesystem (or adjust the path used in step 4).

   ```
   ~/Documents/bluesky
   ❯ ls -l
   total 19856
   drwxr-xr-x  22 user  group  704 Jan 19 15:51 atproto
   drwxr-xr-x  24 user  group  768 Jan 24 19:17 ozone
   ```

2. Checkout whichever branch you'd like to use in atproto/ for the @atproto/api package.

   ```
   ~/Documents/bluesky
   ❯ cd atproto
   ~/Documents/bluesky/atproto
   ❯ git checkout main
   ```

3. Build the @atproto/api package in atproto/.

   ```
   ~/Documents/bluesky/atproto
   ❯ yarn
   ```
4. Update `next.config.js` in this repo with webpack options for local linking.
   ```diff
   +  experimental: {
   +    externalDir: true,
   +  },
   +  webpack: (config, { isServer }) => {
   +    // Handle symlinked packages properly
   +    config.resolve.symlinks = false
   +    return config
   +  },
   ```
5. Update the `dev` script in package.json to use webpack:

   ```diff
   -    "dev": "next dev --turbopack",
   +    "dev": "next dev",
   ```
6. Update package.json file in ozone/ to reference the local builds of @atproto.

   ```diff
   "dependencies": {
   -    "@atproto/api": "0.18.9",
   -    "@atproto/oauth-client-browser": "^0.3.38",
   -    "@atproto/oauth-types": "^0.6.0",
   -    "@atproto/xrpc": "^0.7.7",
   +    "@atproto/api": "link:../atproto/packages/api",
   +    "@atproto/oauth-client-browser": "link:../atproto/packages/oauth/oauth-client-browser",
   +    "@atproto/oauth-types": "link:../atproto/packages/oauth/oauth-types",
   +    "@atproto/xrpc": "link:../atproto/packages/xrpc",
   ```

7. Clear the Next.js cache and node_modules and re-install:
   ```
   ~/Documents/bluesky/ozone
   ❯ rm -rf .next && yarn
   ```
8. Take care not to check-in the changes to package.json and yarn.lock that came from the temporary linking. When you're done, you can reset everything with:
   ```
   ~/Documents/bluesky/ozone
   ❯ git checkout package.json yarn.lock && yarn
   ```
