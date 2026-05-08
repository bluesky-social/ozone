
### General Tips

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

### Local Integerated Development Setup

Ozone requires a PDS service to talk to, and it is convenient to point it to a local `dev-env` instance for testing during development.

1. In the separate [atproto project](https://github.com/bluesky-social/atproto), run the dev server using `yarn workspace @atproto/dev-env start`. This will run a PDS, seeded with some users and data for you.
2. Find the Ozone service DID in the dev-env startup output. Look for a line like:
   ```
   🗼 Ozone service DID did:plc:xxxxx
   ```
3. Create a `.env.local` file in the ozone project root with the DID from the previous step:
   ```
   NEXT_PUBLIC_OZONE_SERVICE_DID=did:plc:xxxxx
   ```
   Without this, the app will be stuck on the loading spinner.
4. Run the development server for Ozone using `yarn dev`. This will start running the Ozone frontend at `http://localhost:3000`.
5. Navigate to the login page in your browser, at [http://localhost:3000](http://localhost:3000).
6. Login using the "Credentials" tab with the atproto dev-env credentials, which you can find [here](https://github.com/bluesky-social/atproto/blob/a1240f0a37030766dfe0a2ccfdc2810432520ae9/packages/dev-env/src/mock/index.ts#L59-L84). For development some example login credentials that would work are:
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
4. Link local atproto packages by running:
   ```
   ~/Documents/bluesky/ozone
   ❯ yarn link-atproto
   ```
   This automatically patches `next.config.js`, `package.json`, clears the Next.js cache, and re-installs dependencies. If your atproto directory is not at `../atproto`, you can specify a custom path:
   ```
   ❯ ATPROTO_PATH=../path/to/atproto yarn link-atproto
   ```

5. When you're done, revert back to the published packages by running:
   ```
   ~/Documents/bluesky/ozone
   ❯ yarn unlink-atproto
   ```
   Take care not to check-in any changes to `next.config.js`, `package.json`, or `yarn.lock` that came from the temporary linking.
