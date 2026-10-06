/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STANDALONE ? "standalone" : undefined,
  serverExternalPackages: ["msedge-tts", "pptxgenjs", "@prisma/client"],
};
export default nextConfig;
