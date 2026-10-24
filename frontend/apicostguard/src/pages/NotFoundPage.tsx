import { Link, useLocation } from "react-router-dom";
import { Icon } from "../components/ui/Icon";

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="not-found">
      <div className="not-found-orbit" aria-hidden="true">
        <span className="not-found-code">404</span>
      </div>
      <div className="eyebrow">Signal lost · unknown coordinate</div>
      <h1 className="not-found-title">This section is not on the map.</h1>
      <p className="not-found-copy">
        The control plane has eleven sections. <code>{location.pathname}</code> is not one of them, and this interface
        will not invent a page to cover the gap.
      </p>
      <div className="not-found-actions">
        <Link className="btn btn--primary" to="/">
          <Icon name="orbit" /> Return to overview
        </Link>
        <Link className="btn" to="/logs">
          <Icon name="list" /> Request logs
        </Link>
        <Link className="btn btn--ghost" to="/settings">
          <Icon name="sliders" /> Settings
        </Link>
      </div>
    </div>
  );
}
