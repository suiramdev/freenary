import { m } from "@/paraglide/messages.js";

export const AuthHeader = () => (
  <>
    <h1 className="text-2xl font-bold">{m.auth_welcome_title()}</h1>
    <p className="text-muted-foreground mt-1 mb-6 text-sm">
      {m.auth_welcome_description()}
    </p>
  </>
);
