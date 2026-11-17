import { Inbox } from "lucide-react";

/** EmptyState — shown when a request succeeded but returned nothing. */

const EmptyState = ({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  message = "",
  action = null,
}) => (
  <div className="state-block">
    <span className="state-icon" aria-hidden="true">
      <Icon size={28} />
    </span>
    <h3>{title}</h3>
    {message && <p>{message}</p>}
    {action}
  </div>
);

export default EmptyState;
