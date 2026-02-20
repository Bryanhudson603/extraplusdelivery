const nextConfig = {
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'share.google',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'prezunic.vtexassets.com',
        pathname: '/**'
      }
    ]
  }
};

export default nextConfig;
