const Brand = ({ compact = false, className = "" }) => (
  <span className={`brand ${className}`.trim()}>
    <span className="wordmark">
      research desk
      <sup className="wordmark-mark" aria-hidden="true">
        *
      </sup>
    </span>
    {!compact && <span className="brand-sub">Reading room</span>}
  </span>
);

export default Brand;
