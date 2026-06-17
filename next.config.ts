import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Natívne moduly (.node bindingy) sa nesmú bundlovať – Next ich načíta
  // za behu na serveri. Inak Turbopack build spadne na @resvg/resvg-js.
  serverExternalPackages: ['@resvg/resvg-js', 'sharp', 'satori'],
};

export default nextConfig;
