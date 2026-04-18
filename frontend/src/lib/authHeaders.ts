export const authHeaders = (session: any) => {
  if (!session) return {};
  const token = session.accessToken || session.user?.accessToken || session.token;
  if (!token) {
    console.warn("authHeaders: No token found in session object", {
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      hasUserAccessToken: !!session?.user?.accessToken
    });
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};
