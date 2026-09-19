export const appName = "Freenary";
export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";

export const gitConfig = {
  user: "suiramdev",
  repo: "freenary",
  branch: "main",
};

export const repoBlobUrl = (ref: string) =>
  `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${ref}/`;
