interface AuthHeaderProps {
  description: string;
  title: string;
}

export const AuthHeader = ({ description, title }: AuthHeaderProps) => (
  <>
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="text-muted-foreground mt-1 mb-6 text-sm">{description}</p>
  </>
);
