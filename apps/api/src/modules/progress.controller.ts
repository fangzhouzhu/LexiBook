import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { ReaderService } from "./reader.service";

type SaveProgressDto = {
  chapterId: string;
  sentenceId: string;
  percent: number;
};

@Controller("progress")
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly readerService: ReaderService) {}

  @Post("reading")
  saveReading(@Body() body: SaveProgressDto) {
    return this.readerService.saveProgress(body.chapterId, body.sentenceId, body.percent);
  }

  @Get("reading/:chapterId")
  getReading(@Param("chapterId") chapterId: string) {
    return this.readerService.getProgress(chapterId);
  }
}
