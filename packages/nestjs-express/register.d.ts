import { NestExpressApplication } from '@nestjs/platform-express';

interface AppConfig {
  appDir: string;
}

declare function register(app: NestExpressApplication, config?: AppConfig): Promise<void>;

export = register;
