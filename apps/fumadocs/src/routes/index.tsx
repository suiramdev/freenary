import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";

import { baseOptions } from "@/lib/layout.shared";

const ENTRY_POINTS = [
  {
    description: "What Freenary is, and what you can do with it.",
    slug: "",
    title: "Introduction",
  },
  {
    description: "Install your own instance with Docker Compose.",
    slug: "self-hosting",
    title: "Self-hosting",
  },
  {
    description: "Connect a bank, read your budget, correct a category.",
    slug: "guides",
    title: "Using Freenary",
  },
  {
    description: "The words this website uses, and what each one means.",
    slug: "concepts",
    title: "Concepts",
  },
  {
    description: "How the project works, and how to change it.",
    slug: "contributing",
    title: "Contributing",
  },
  {
    description: "Call the API, and read the procedure reference.",
    slug: "integrations",
    title: "Integrations",
  },
];

const Home = () => {
  // The newest release, from the root loader: the landing page never leans on
  // the redirect that carries unversioned paths.
  const version = useLoaderData({ from: "__root__" });

  return (
    <HomeLayout {...baseOptions()}>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-16">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-medium">Freenary documentation</h1>
          <p className="text-fd-muted-foreground">
            Freenary is an open-source platform for personal finance. It puts
            your bank accounts, your transactions and your monthly plan in one
            place that belongs to you.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ENTRY_POINTS.map((entry) => (
            <Link
              key={entry.title}
              to="/docs/$"
              params={{
                _splat: [version, entry.slug].filter(Boolean).join("/"),
              }}
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
};

export const Route = createFileRoute("/")({
  component: Home,
});
