/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true, // Required for static export
        domains: [
          "files.edgestore.dev"
        ]
      },
    output: 'export',
    trailingSlash: true
}

module.exports = nextConfig
