import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";

import { baseOptions } from "@/lib/layout.shared";

const ENTRY_POINTS = [
  {
    description: "What Freenary is, and the problem it solves.",
    slug: "",
    title: "Introduction",
  },
  {
    description: "Connect a bank, read your budget, correct a category.",
    slug: "guides",
    title: "Using Freenary",
  },
  {
    description: "Install, configure and operate your own instance.",
    slug: "self-hosting",
    title: "Self-hosting",
  },
  {
    description: "Call the API, and read the procedure reference.",
    slug: "integrations",
    title: "Integrations",
  },
  {
    description: "Set up the code, and extend Freenary.",
    slug: "development",
    title: "Development",
  },
];

const Home = () => (
  <HomeLayout {...baseOptions()}>
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-medium">Freenary documentation</h1>
        <p className="text-fd-muted-foreground">
          Freenary is an open-source personal finance and wealth-management
          platform that you host yourself. It connects your banks, imports your
          transactions, categorises them, and shows where your money goes.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ENTRY_POINTS.map((entry) => (
          <Link
            key={entry.title}
            to="/docs/$"
            params={{ _splat: entry.slug }}
            className="hover:bg-fd-accent/50 flex flex-col gap-1 rounded-lg border p-4 transition-colors"
          >
            <span className="font-medium">{entry.title}</span>
            <span className="text-fd-muted-foreground text-sm">
              {entry.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  </HomeLayout>
);

export const Route = createFileRoute("/")({
  component: Home,
});
