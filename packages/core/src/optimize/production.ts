import fs from 'fs';
import fse from 'fs-extra';
import MemoryFileSystem from 'memory-fs';
import path from 'path';
import express from 'express';
import webpack from 'webpack';
import { configureWebpack } from './webpack.config';
import { getEntry } from './helpers';
import {
  existsSync,
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

  await new Promise((resolve, reject) => {
    compiler.run((err: Error, stats: webpack.Stats) => {
      err && reject(err.stack || err);
      stats.hasErrors() && reject(stats.toString());

      for (let i = 0; i < entryPages.length; i++) {
        const page = entryPages[i];
        const pageId = getPageId(appDir, page, '_');

        app.use(`/_react-ssr/${pageId}.css`, (req, res) => {
          const filename = path.join(appDir, ssrConfig.distDir, `${pageId}.css`);
          const style = existsSync(filename) ? fs.readFileSync(filename).toString() : '';
          res.writeHead(200, { 'Content-Type': 'text/css' });
          res.end(style, 'utf-8');
        });

        app.use(`/_react-ssr/${pageId}.js`, (req, res) => {
          const filename = path.join(appDir, ssrConfig.distDir, `${pageId}.js`);
          const script = fs.readFileSync(filename).toString();
          res.status(200).type('.js').send(script);
        });
      }

      resolve();
    });
  });
};
