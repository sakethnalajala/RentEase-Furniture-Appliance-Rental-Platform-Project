// NEXT_PUBLIC_API_URL is inlined into the browser bundle at build time, so a wrong value can't be
// fixed by editing env vars on a live deployment — every login on the site just fails. On Vercel
// builds, refuse to produce a bundle that can't reach the API: the variable missing (store/api.js
// would fall back to localhost), pointing at localhost, or pointing at this Vercel frontend itself
// (which stopped hosting the API when the backend moved to Render). A failed build keeps the
// previous deployment live. Local `next dev` / `next build` are unaffected.
function assertDeployedApiUrl() {
  if (!process.env.VERCEL) return;

  const raw = process.env.NEXT_PUBLIC_API_URL;
  const fail = (problem) => {
    throw new Error(
      `NEXT_PUBLIC_API_URL ${problem} Set it in Vercel → Project → Settings → Environment Variables to the ` +
        'Render backend\'s API base, e.g. https://<your-render-service>.onrender.com/api/v1, then redeploy.'
    );
  };

  if (!raw) fail("is not set, so visitors' browsers would call http://localhost:5000.");
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail(`("${raw}") is not an absolute URL.`);
  }
  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
    fail(`(${raw}) points at localhost, which visitors' browsers can't reach.`);
  }
  const frontendHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    'rentease-furniture-rental-ecru.vercel.app',
  ].filter(Boolean);
  if (frontendHosts.includes(url.host)) {
    fail(`(${raw}) points at this Vercel frontend, which doesn't host the API.`);
  }
}

assertDeployedApiUrl();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

module.exports = nextConfig;
