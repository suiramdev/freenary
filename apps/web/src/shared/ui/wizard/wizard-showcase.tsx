import { FlutedBackdrop } from "./fluted-backdrop";
import { ShowcaseCards } from "./showcase-cards";

export const WizardShowcase = () => (
  <aside
    aria-hidden="true"
    className="bg-muted relative hidden overflow-hidden lg:block"
    inert
  >
    <FlutedBackdrop />
    <ShowcaseCards />
  </aside>
);
