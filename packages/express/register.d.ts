import express from 'express';

interface AppConfig {
  appDir: string;
}

declare function register(app: express.Application, config?: AppConfig): Promise<void>;

export = register;
