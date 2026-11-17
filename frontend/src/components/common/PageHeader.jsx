import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * PageHeader — consistent page title block with optional breadcrumbs.
 *
 * crumbs: [{ label, to }] — the last item is rendered as the current page.
 */

const PageHeader = ({ title, subtitle = "", crumbs = [], actions = null }) => (
  <div className="page-head">
    {crumbs.length > 0 && (
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <span key={`${crumb.label}-${index}`} className="flex gap-2">
              {isLast || !crumb.to ? (
                <span className="current" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.to}>{crumb.label}</Link>
              )}
              {!isLast && (
                <ChevronRight
                  size={14}
                  className="sep"
                  aria-hidden="true"
                  style={{ alignSelf: "center" }}
                />
              )}
            </span>
          );
        })}
      </nav>
    )}

    <div className="flex-between wrap gap-4">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-3 wrap">{actions}</div>}
    </div>
  </div>
);

export default PageHeader;
