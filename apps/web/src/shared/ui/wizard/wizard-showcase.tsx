import { PINK_GRADIENT } from "../pink-gradient";
import { ShowcaseCards } from "./showcase-cards";

export const WizardShowcase = () => (
  <aside
    aria-hidden="true"
    className="relative hidden overflow-hidden lg:block"
    inert
    style={{ backgroundImage: PINK_GRADIENT }}
  >
    <div className="absolute inset-0 dark:bg-black/45" />
    <ShowcaseCards />
  </aside>
);
