import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import readdir from 'recursive-readdir';

export interface AppConfig {
  appDir: string;
}

export const existsSync = (f: string): boolean => {
  try {
    fs.accessSync(f, fs.constants.F_OK);
    return true;
  } catch (_) {
    return false;
  }
};

export const isProd = () => {
  let env = process.env.NODE_ENV || 'development';
  if (process.env.REACT_SSR_ENV) {
    env = process.env.REACT_SSR_ENV;
  }
  return env === 'production';
};

export interface Config {
  id: string;
  distDir: string;
  viewsDir: string;
  staticViews: string[];
  webpack?: (defaultConfig: webpack.Configuration, env: 'development' | 'production') => webpack.Configuration;
}

export const getSsrConfig = (appDir: string): Config => {
  const defaultConfig: Config = {
    id: 'default',
    distDir: '.ssr',
    viewsDir: 'views',
    staticViews: [],
  };
  const ssrConfigPath = path.join(appDir, 'ssr.config.js');
  if (existsSync(ssrConfigPath)) {
    return Object.assign(defaultConfig, require(ssrConfigPath));
  } else {
    return defaultConfig;
  }
};

export const getEngine = (appDir: string): 'jsx' | 'tsx' => existsSync(path.join(appDir, 'tsconfig.json')) ? 'tsx' : 'jsx';

export const getPages = async (appDir: string): Promise<string[]> => {
  const ssrConfig = getSsrConfig(appDir);
  const possibles = await readdir(path.join(appDir, ssrConfig.viewsDir));
  const pages = [];
  for (let i = 0; i < possibles.length; i++) {
    const possible = possibles[i];
    const name = path.basename(getPageId(appDir, possible, '/'));
    if (name.toLowerCase().startsWith('_app') || name.toLowerCase().startsWith('_document')) {
      continue;
    }
    if (possible.endsWith('.jsx') || possible.endsWith('.tsx')) {
      pages.push(possible);
    }
  }
  return pages;
};

export const getPageId = (appDir: string, page: string, separator: string = '_'): string => {
  const ssrConfig = getSsrConfig(appDir);
  const [, ...rest] = page.replace(path.join(appDir, ssrConfig.viewsDir), '')
                          .replace(path.extname(page), '')
                          .split(path.sep);
  return rest.join(separator);
};

const ignores = [
  '.*',
  '*.json',
  '*.lock',
  '*.md',
  '*.txt',
  '*.yml',
  'LICENSE',
];

const ignoreDotDir = (file: string, stats: fs.Stats) => {
  return stats.isDirectory() && path.basename(file).startsWith('.');
};

const ignoreNodeModules = (file: string, stats: fs.Stats) => {
  return stats.isDirectory() && path.basename(file) == 'node_modules';
};

export const getCacheablePages = async (appDir: string): Promise<string[]> => {
  return readdir(appDir, [ignoreNodeModules, ignoreDotDir, ...ignores]);
};
