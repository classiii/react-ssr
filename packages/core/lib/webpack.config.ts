import path from 'path';
import webpack from 'webpack';
import { smart as merge } from 'webpack-merge';
import TerserPlugin from 'terser-webpack-plugin';
import { getSsrConfig } from './helpers/core';
import {
  hasUserBabelrc,
  getBabelrc,
  getBabelRule,
} from './helpers/babel';

const cwd = process.cwd();
const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';

process.env.NODE_ENV === 'development';

const prodConfig: webpack.Configuration = {
  performance: {
    hints: 'warning',
  },
  output: {
    pathinfo: false,
  },
  optimization: {
    namedModules: false,
    namedChunks: false,
    flagIncludedChunks: true,
    occurrenceOrder: true,
    sideEffects: true,
    usedExports: true,
    concatenateModules: true,
    splitChunks: {
      minSize: 30000,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
    },
    minimize: false,
    // minimizer: [
    //   new TerserPlugin(),
    // ],
  },
  plugins: [
    new webpack.optimize.ModuleConcatenationPlugin(),
  ],
};

export const configureWebpack = (entry: webpack.Entry): webpack.Configuration => {
  const ssrConfig = getSsrConfig();

  if (env === 'development') {
    if (hasUserBabelrc()) {
      console.log(`[ info ] custom babelrc in: ${getBabelrc()}`);
    }
  }

  let config: webpack.Configuration = {
    mode: 'development',
    context: cwd,
    entry,
    output: {
      path: path.join(cwd, ssrConfig.distDir, env),
      filename: '[name].js',
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    module: {
      // noParse: [
      //   /\.min\.js$|\.production\.min\.js$/,
      // ],
      rules: [
        getBabelRule(),
      ],
    },
    optimization: {
      nodeEnv: 'development',
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('development'),
      }),
    ],
  };

  if (env === 'production') {
    config = merge(config, prodConfig);
  }

  if (ssrConfig.webpack) {
    if (typeof ssrConfig.webpack === 'function') {
      config = ssrConfig.webpack(config, env);
    } else {
      console.warn('[ warn ] ssr.config.js#webpack must be a function');
    }
  }

  return config;
};
