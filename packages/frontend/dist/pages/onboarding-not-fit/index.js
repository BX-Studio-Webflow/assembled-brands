// bin/live-reload.js
new EventSource(`${"http://localhost:3000"}/esbuild`).addEventListener("change", () => location.reload());

// shared/utils/config.ts
var devMode = localStorage.getItem("api-mode");
var navigateToPath = (path, options) => {
  if (!path) {
    console.error("navigateToPath: path is empty or undefined");
    return;
  }
  const [pathPart, queryPart] = path.split("?");
  const normalizedPath = pathPart.replace(/^\/+/, "");
  let finalPath = normalizedPath;
  if (!options?.useRootPath) {
    finalPath = `dev/${normalizedPath}`;
  }
  const querySuffix = queryPart ? `?${queryPart}` : "";
  const newUrl = `${window.location.origin}/${finalPath}${querySuffix}`;
  window.location.assign(newUrl);
};

// pages/onboarding-not-fit/index.ts
var initOnboardingNotFitPage = () => {
  const homeCTA = document.querySelector('[dev-target="home-cta"]');
  if (!homeCTA) {
    console.error("Home CTA button not found");
    return;
  }
  homeCTA.addEventListener("click", async () => {
    navigateToPath("/onboarding-wizard?step=3");
  });
};
window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    initOnboardingNotFitPage();
  } catch (error) {
    console.error(error);
  }
});
//# sourceMappingURL=index.js.map
