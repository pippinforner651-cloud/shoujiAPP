interface Props {
  size?: number;
  className?: string;
}

/** E23 主品牌标记：路线折线 + 三个途经点，适合小尺寸显示。 */
export default function E23BrandMark({ size = 72, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 72 72" role="img" aria-label="E23跑起来">
      <rect width="72" height="72" rx="18" fill="#F28C22" />
      <path d="M17 18h36M17 18v36h36M17 36h27" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="18" r="3.5" fill="#18324A" />
      <circle cx="44" cy="36" r="3.5" fill="#18324A" />
      <circle cx="53" cy="54" r="3.5" fill="#18324A" />
    </svg>
  );
}
