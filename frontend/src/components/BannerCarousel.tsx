import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Banner } from '@/lib/data';

type Props = {
  banners: Banner[];
};

export function BannerCarousel({ banners }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % banners.length);
    }, 3000);
    return () => clearInterval(id);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const current = banners[index];

  return (
    <div className="relative w-full h-28 rounded-lg overflow-hidden">
      <Image
        src={current.image}
        alt={current.title || 'Banner'}
        fill
        className="object-cover"
        priority
      />
      {current.title && (
        <div className="absolute bottom-2 left-2 bg-white/80 rounded px-2 py-1 text-xs font-semibold">
          {current.title}
        </div>
      )}
    </div>
  );
}
