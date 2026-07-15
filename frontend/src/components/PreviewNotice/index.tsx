import { BUILD_VARIANT, getPreviewLabel } from '../../config/buildVariant';

interface Props {
  compact?: boolean;
}

export default function PreviewNotice({ compact = false }: Props) {
  const label = getPreviewLabel(BUILD_VARIANT);
  if (!label) return null;

  return (
    <div
      className={`preview-notice${compact ? ' compact' : ''}`}
      role="status"
      aria-label="V2预览测试版，多人功能尚未上线"
    >
      {label}
    </div>
  );
}

