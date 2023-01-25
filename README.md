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

3. Build the @aproto/api package in atproto/.

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
