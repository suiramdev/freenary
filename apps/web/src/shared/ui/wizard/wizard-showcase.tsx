import { memo } from "react";

import { PinkBackdrop } from "../pink-backdrop";
import { ShowcaseCards } from "./showcase-cards";

const ShowcasePanel = () => (
  <aside
    aria-hidden="true"
    className="relative hidden overflow-hidden lg:block"
    inert
  >
    <PinkBackdrop />
    <ShowcaseCards />
  </aside>
);

export const WizardShowcase = memo(ShowcasePanel);
