import path from 'path';
import render from './render';
import {
  isProd,
  getSsrConfig,
  getEngine,
  getCacheablePages,
  AppConfig,
  Config
} from './helpers';

const escaperegexp = require('lodash.escaperegexp');

let moduleDetectRegEx: RegExp;

const register = async (app: any, config: AppConfig = {
  appDir: process.cwd()
}): Promise<void> => {
  const { appDir } = config;
  const { viewsDir }: Config = getSsrConfig(appDir);

  const renderFile = async (file: string, options: any, cb: (err: any, html?: any) => void) => {
    if (!moduleDetectRegEx) {
      const cacheablePages = await getCacheablePages(appDir);
      const pattern = cacheablePages.map(page => '^' + escaperegexp(page)).join('|');
      moduleDetectRegEx = new RegExp(pattern);
    }

    const { settings, cache, _locals, ...props } = options;
    try {
      return cb(undefined, await render(file, props, config));
    } catch (e) {
      return cb(e);
    } finally {
      if (process.env.NODE_ENV !== 'production') {
        Object.keys(require.cache).forEach((filename) => {
          if (moduleDetectRegEx.test(filename)) {
            delete require.cache[filename];
          }
        });
      }
    }
  };

  const engine: 'jsx' | 'tsx' = getEngine(appDir);
  app.engine(engine, renderFile);
  console.log('xxx', path.join(appDir, viewsDir))
  app.set('views', path.join(appDir, viewsDir));
  app.set('view engine', engine);

  if (isProd()) {
    await (await import('./optimize/production')).default(app, config);
  } else {
    await (await import('./optimize/development')).default(app, config);
  }
};

export default register;
