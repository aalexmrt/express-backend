let auth0AccessToken;
let auth0ExpiryTime;

const getAuth0AccessToken = async () => {
  if (auth0AccessToken && auth0ExpiryTime) {
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < auth0ExpiryTime) {
      return auth0AccessToken;
    }
  }

  const responseData = await fetch(
    `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audience: process.env.AUTH0_AUDIENCE,
        grant_type: "client_credentials",
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
      }),
    }
  );

  const response = await responseData.json();

  auth0AccessToken = response.access_token;
  // Set expiry time, 5 minutes before the actual expiry time
  auth0ExpiryTime = response.expires_in - 300;

  return auth0AccessToken;
};

export { getAuth0AccessToken };
