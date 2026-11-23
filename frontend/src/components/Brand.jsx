const Brand = ({ compact = false, className = "" }) => (
  <span className={`brand ${className}`.trim()}>
    <span className="wordmark">
      perplexity
      <sup className="wordmark-mark" aria-hidden="true">
        *
      </sup>
    </span>
    {!compact && <span className="brand-sub">Research desk</span>}
  </span>
);

export default Brand;
