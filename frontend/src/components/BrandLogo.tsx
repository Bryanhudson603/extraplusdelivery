'use client';

import Image from 'next/image';

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ size = 88, className = '', priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/dil-bebidas-logo.svg"
      alt="Dil Bebidas"
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
