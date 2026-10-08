import { Link, useLocation } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";

export default function NotFound() {
  const location = useLocation();
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Page not found" description="The requested view does not exist." />
      <Panel>
        <p className="text-sm opacity-70">
          No route matches <code className="rounded bg-black/10 px-1">{location.pathname}</code>
        </p>
        <Link to="/" className="mt-4 inline-block rounded-lg border px-4 py-2 text-sm">
          Back to dashboard
        </Link>
      </Panel>
    </div>
  );
}
