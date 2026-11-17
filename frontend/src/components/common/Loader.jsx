/** Loader — centred spinner with an optional message. */

const Loader = ({ message = "Loading…", inline = false }) => {
  if (inline) {
    return (
      <span className="spinner spinner-sm" role="status" aria-label={message} />
    );
  }

  return (
    <div className="loader-wrap" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
};

export default Loader;
