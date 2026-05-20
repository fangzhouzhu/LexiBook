import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { LexiService } from "./modules/lexi.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });

  const lexiService = app.get(LexiService);
  await lexiService.ensureSeedData();

  await app.listen(4000);
}

void bootstrap();
