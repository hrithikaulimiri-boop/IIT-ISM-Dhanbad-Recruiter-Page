export const authHeaders = (session: any) => {
  const token = session?.accessToken || session?.user?.accessToken;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};
