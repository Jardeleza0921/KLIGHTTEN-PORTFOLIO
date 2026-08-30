const REALM = "KLIGHTTEN Portfolio Admin";

function unauthorized(message = "Authentication required.") {
  return new Response(message, {
    status: 401,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "www-authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "x-content-type-options": "nosniff"
    }
  });
}

function safeEqual(left, right) {
  const first = new TextEncoder().encode(left);
  const second = new TextEncoder().encode(right);
  let difference = first.length ^ second.length;
  const length = Math.max(first.length, second.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (first[index] || 0) ^ (second[index] || 0);
  }

  return difference === 0;
}

function decodeCredentials(header) {
  if (!header || !header.startsWith("Basic ")) return null;

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1)
    };
  } catch {
    return null;
  }
}

export default async function adminAuth(request, context) {
  const expectedUsername = Netlify.env.get("KLIGHTTEN_ADMIN_USERNAME");
  const expectedPassword = Netlify.env.get("KLIGHTTEN_ADMIN_PASSWORD");

  if (!expectedUsername || !expectedPassword) {
    return new Response("Portfolio admin authentication is not configured.", {
      status: 503,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }

  const credentials = decodeCredentials(
    request.headers.get("authorization")
  );

  if (
    !credentials ||
    !safeEqual(credentials.username, expectedUsername) ||
    !safeEqual(credentials.password, expectedPassword)
  ) {
    return unauthorized("Incorrect username or password.");
  }

  const response = await context.next();
  const headers = new Headers(response.headers);

  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "no-referrer");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export const config = {
  path: ["/manage.html", "/manage"]
};
