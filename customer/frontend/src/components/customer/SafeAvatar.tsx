import { useEffect, useState } from 'react';

const CUSTOMER_BACKEND_ORIGIN = 'http://localhost';

function normalizeAvatarUrl(value?: string | null) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try {
    return new URL(url, CUSTOMER_BACKEND_ORIGIN).toString();
  } catch {
    return '';
  }
}

type SafeAvatarProps = {
  url?: string | null;
  name?: string | null;
  imageClassName?: string;
  fallbackClassName?: string;
  fit?: 'cover' | 'contain';
};

export default function SafeAvatar({ url, name, imageClassName, fallbackClassName, fit = 'cover' }: SafeAvatarProps) {
  const [failedUrl, setFailedUrl] = useState('');

  useEffect(() => {
    if (url !== failedUrl) setFailedUrl('');
  }, [url]);

  const normalizedUrl = normalizeAvatarUrl(url);
  const showImage = normalizedUrl !== '' && failedUrl !== normalizedUrl;
  const initial = String(name || 'A').trim().charAt(0).toUpperCase() || 'A';

  return showImage ? (
    <img
      src={normalizedUrl}
      alt={`Ảnh đại diện của ${name || 'thành viên'}`}
      className={imageClassName}
      onError={() => setFailedUrl(normalizedUrl)}
      style={{ width: '100%', height: '100%', objectFit: fit, display: 'block', borderRadius: 'inherit' }}
    />
  ) : <span className={fallbackClassName}>{initial}</span>;
}
