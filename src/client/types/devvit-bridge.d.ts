declare module '@devvit/web/bridge' {
  export const reddit: {
    getCurrentUser: () => Promise<{ name?: string } | null>;
  };
}

