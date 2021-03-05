import fse from 'fs-extra';
import path from 'path';
import slash from 'slash';
import webpack from 'webpack';
import {
  getSsrConfig,
  getEngine,
  getPages,
  getPageId,
  AppConfig
} from '../helpers';

export const getEntry = async (memfs: any, appDir: string): Promise<[webpack.Entry, string[]]> => {
  const entry: webpack.Entry = {};
  const entryPages = await getPages(appDir);
  const ssrConfig = getSsrConfig(appDir);
  const ext = '.' + getEngine(appDir);
  const entryPath = path.resolve(__dirname, `../../lib/webpack/${ssrConfig.id}.js`);
  let template = fse.readFileSync(entryPath).toString();

  let appPath = path.join(__dirname, 'app.js');
  if (fse.existsSync(path.join(appDir, ssrConfig.viewsDir, `_app${ext}`))) {
    appPath = path.join(appDir, ssrConfig.viewsDir, `_app${ext}`);
  }

  memfs.mkdirpSync(path.join(appDir, 'react-ssr-src'));

  for (let i = 0; i < entryPages.length; i++) {
    const page = entryPages[i];
    const pageId = getPageId(appDir, page, '/');
    const dir = path.dirname(pageId);
    const name = path.basename(pageId);
    if (dir !== '.') {
      memfs.mkdirpSync(path.join(appDir, 'react-ssr-src', dir));
    }
    memfs.writeFileSync(
      path.join(appDir, 'react-ssr-src', dir, `entry-${name}${ext}`),
      template
        .replace('__REACT_SSR_APP__', slash(appPath))
        .replace('__REACT_SSR_PAGE__', slash(page)),
    );
    entry[getPageId(appDir, page, '_')] = `./react-ssr-src/${slash(dir)}/entry-${name}${ext}`;
  }

  return [entry, entryPages];
};
