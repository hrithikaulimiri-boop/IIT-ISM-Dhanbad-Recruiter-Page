/** Narrow at runtime; parameter is `unknown` so both default and augmented NextAuth Session types accept. */
export const authHeaders = (session: unknown) => {
  const token = (session as { accessToken?: string } | null | undefined)?.accessToken;
  return { Authorization: `Bearer ${token || ""}` };
};
