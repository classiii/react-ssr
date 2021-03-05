import fs from 'fs';
import fse from 'fs-extra';
import MemoryFileSystem from 'memory-fs';
import path from 'path';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import { configureWebpack } from './webpack.config';
import { getEntry } from './helpers';
import {
  getSsrConfig,
  getPageId,
  AppConfig,
  Config
} from '../helpers';


const ufs = require('unionfs').ufs;
const memfs = new MemoryFileSystem();
ufs.use(fs).use(memfs);

export default async (app: express.Application, config: AppConfig): Promise<void> => {
  const { appDir } = config;
  const ssrConfig: Config = getSsrConfig(appDir);

  fse.removeSync(path.join(appDir, ssrConfig.distDir));

  const [entry, entryPages] = await getEntry(memfs, appDir);
  const webpackConfig: webpack.Configuration = configureWebpack(entry, config);
  const compiler: webpack.Compiler = webpack(webpackConfig);
  compiler.inputFileSystem = ufs;

  const devServerPort = 8888;
  await new Promise((resolve, reject) => {
    const devServer = new WebpackDevServer(compiler, {
      hotOnly: true,
      noInfo: true,
      stats: 'errors-only',
      overlay: false,
      compress: false,
      serveIndex: false,
      after: (app: express.Application, server: WebpackDevServer, compiler: webpack.Compiler) => {
        const memfs = compiler.outputFileSystem as any;

        for (let i = 0; i < entryPages.length; i++) {
          const page = entryPages[i];
          const pageId = getPageId(appDir, page, '_');

          app.get(`/_react-ssr/${pageId}.css`, (req, res) => {
            const filename = path.join(appDir, ssrConfig.distDir, `${pageId}.css`);
            const style = memfs.existsSync(filename) ? memfs.readFileSync(filename).toString() : '';
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(style, 'utf-8');
          });

          app.get(`/_react-ssr/${pageId}.js`, (req, res) => {
            const filename = path.join(appDir, ssrConfig.distDir, `${pageId}.js`);
            const script = memfs.readFileSync(filename).toString();
            res.status(200).type('.js').send(script);
          });
        }
      },
    });

    devServer.listen(devServerPort, (err) => {
      reject(err);
    });

    const proxyMiddleware = createProxyMiddleware({
      target: `http://localhost:${devServerPort}`,
      changeOrigin: true,
      ws: true,
      logLevel: 'error',
    });

    app.use('/*.css', proxyMiddleware);
    app.use('/*.js', proxyMiddleware);
    app.use('/*.json', proxyMiddleware);
    app.use('/sockjs-node*', proxyMiddleware);

    resolve();
  });
};
