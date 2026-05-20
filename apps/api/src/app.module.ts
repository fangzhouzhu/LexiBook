import { Module } from "@nestjs/common";
import { AuthController } from "./modules/auth.controller";
import { AuthService } from "./modules/auth.service";
import { ChaptersController } from "./modules/chapters.controller";
import { DashboardController } from "./modules/dashboard.controller";
import { JwtAuthGuard } from "./modules/jwt-auth.guard";
import { LexiService } from "./modules/lexi.service";
import { PrismaService } from "./modules/prisma.service";
import { ProgressController } from "./modules/progress.controller";
import { ReaderService } from "./modules/reader.service";
import { WordsController } from "./modules/words.controller";

@Module({
  imports: [],
  controllers: [AuthController, ChaptersController, WordsController, ProgressController, DashboardController],
  providers: [AuthService, JwtAuthGuard, PrismaService, ReaderService, LexiService]
})
export class AppModule {}
