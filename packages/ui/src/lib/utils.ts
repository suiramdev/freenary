import { createCn } from "cn/config";

// `--ease-fluid` is a theme token of ours, so the merge has to count it as an
// easing: left unknown it survives beside `ease-out`, and CSS order picks the
// curve instead of the caller.
export const cn = createCn({ extend: { theme: { ease: ["fluid"] } } });
