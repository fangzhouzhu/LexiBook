import { NestFactory } from "@nestjs/core";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { AppModule } from "./app.module";
import { LexiService } from "./modules/lexi.service";

function loadLocalEnv() {
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "apps", "api", ".env")
  ];

  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;

    const content = readFileSync(envPath, "utf-8");
    for (const rawLine of content.split(/\r?\n/g)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIndex = line.indexOf("=");
      if (eqIndex <= 0) continue;

      const key = line.slice(0, eqIndex).trim();
      const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

async function bootstrap() {
  loadLocalEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });

  const lexiService = app.get(LexiService);
  await lexiService.ensureSeedData();

  await app.listen(Number(process.env.PORT ?? 4000));
}

void bootstrap();
