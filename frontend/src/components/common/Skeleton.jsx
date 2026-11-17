/** Skeleton — shimmering placeholder blocks for loading states. */

export const SkeletonLine = ({
  width = "100%",
  height = 12,
  className = "",
}) => (
  <div
    className={`skeleton ${className}`}
    style={{ width, height, marginBottom: 8 }}
    aria-hidden="true"
  />
);

export const SkeletonCard = ({ lines = 3 }) => (
  <div className="card card-pad" aria-hidden="true">
    <div className="skeleton skeleton-title" />
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="skeleton skeleton-text"
        style={{ width: i === lines - 1 ? "60%" : "100%" }}
      />
    ))}
  </div>
);

/** A list of skeleton cards, used while search results load. */
export const SkeletonList = ({ count = 3 }) => (
  <div className="grid" aria-busy="true" aria-label="Loading results">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} lines={4} />
    ))}
  </div>
);

export default SkeletonCard;
