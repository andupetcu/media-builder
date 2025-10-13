const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: ['@media-builder/shared', '@media-builder/prisma'],
      }),
    ],
    output: {
      ...options.output,
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    },
    module: {
      rules: [
        ...options.module.rules,
        {
          test: /\.ts$/,
          include: [
            path.resolve(__dirname, '../../packages/shared'),
            path.resolve(__dirname, '../../packages/prisma'),
          ],
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, 'tsconfig.json'),
            },
          },
        },
      ],
    },
    resolve: {
      ...options.resolve,
      extensions: ['.tsx', '.ts', '.js', '.json'],
      alias: {
        ...options.resolve.alias,
        '@media-builder/shared': path.resolve(__dirname, '../../packages/shared'),
        '@media-builder/prisma': path.resolve(__dirname, '../../packages/prisma'),
      },
    },
  };
};
