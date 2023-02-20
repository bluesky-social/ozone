This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Development flow

Just an outline of the development flow, as we continue to solidify it:

- Create feature branches from `develop`.
- When you have completed a feature, create a PR from your feature branch into `develop`.
- Post your PR for review from another team member, and merge once approved.
- When a batch of work is complete, merge `develop` into the `staging` branch.
  - **Note** this will be deployed _automatically_ to https://admin.staging.bsky.dev/ using Render.

## Development setup

1. In the separate [atproto project](https://github.com/bluesky-social/atproto), run the dev server using `yarn workspace @atproto/dev-env start`. This will run a PDS, seeded with some users and data for you.
2. Run the development server for Redsky using `yarn dev`. This will start running the Redsky frontent at `http://localhost:3000`.
3. Navigate to the login page in your browser, at [http://localhost:3000](http://localhost:3000).
4. Login using the atproto dev-env credentials, which you can find [here](https://github.com/bluesky-social/atproto/blob/a1240f0a37030766dfe0a2ccfdc2810432520ae9/packages/dev-env/src/mock/index.ts#L59-L84). For development some example login credentials that would are:
   - Service URL: http://localhost:2583
   - Account handle: alice.test
   - Password: hunter2
   - Admin Token: password

## Working with unpublished changes to @atproto/api

In the course of development there may be updates to the atproto client that are not yet published to npm, but you would like to use with Redsky. Here's the workflow for using unpublished changes to the @atproto/api package:

1. Ensure the [atproto/](https://github.com/bluesky-social/atproto) project lives as a sibling to the [redsky/](https://github.com/bluesky-social/redsky) project on your filesystem (or adjust the path used in step 4).

   ```
   ~/Documents/bluesky
   ❯ ls -l
   total 19856
   drwxr-xr-x  22 user  group  704 Jan 19 15:51 atproto
   drwxr-xr-x  24 user  group  768 Jan 24 19:17 redsky
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

4. Update the package.json file in redsky/ to reference the local build of @atproto/api.

   ```diff
      "dependencies": {
   -    "@atproto/api": "^0.0.3",
   +    "@atproto/api": "link:../atproto/packages/api/dist",
        "@headlessui/react": "^1.7.7",
   ```

5. Ask yarn to reinstall, creating the link from redsky/ to the local build of @atproto/api.
   ```
   ~/Documents/bluesky/redsky
   ❯ yarn
   ```
6. Take care not to check-in the changes to package.json and yarn.lock that came from the temporary linking. When you're done, you can reset everything with:
   ```
   ~/Documents/bluesky/redsky
   ❯ git checkout package.json yarn.lock && yarn
   ```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
