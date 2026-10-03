// RTK Query rejects with three shapes that need very different messages — collapsing them into
// one generic "failed, try again" is what made a backend/database outage look identical to bad
// demo credentials on the Sign Up page:
//  - FETCH_ERROR: the browser never got a response (backend down or asleep, CORS, DNS, wrong URL)
//  - PARSING_ERROR: something answered, but not with JSON — almost always NEXT_PUBLIC_API_URL
//    pointing at a web page (e.g. the frontend's own domain) instead of the API
//  - anything else: a real API response whose own `message` says what happened (wrong password,
//    503 "Database unavailable: …", rate limiting)
export function describeApiError(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.status === 'FETCH_ERROR') {
    return `Could not reach the server (${err.error || 'network error'}). Check the browser console/Network tab for details.`;
  }
  if (err?.status === 'PARSING_ERROR') {
    return `The server sent an unexpected, non-API response (HTTP ${err.originalStatus}). The site may be pointed at the wrong API URL.`;
  }
  return err?.data?.message || fallback;
}
