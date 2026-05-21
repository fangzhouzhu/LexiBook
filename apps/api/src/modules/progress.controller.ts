import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ReaderService } from "./reader.service";

type SaveProgressDto = {
  chapterId: string;
  sentenceId: string;
  percent: number;
};

@Controller("progress")
export class ProgressController {
  constructor(private readonly readerService: ReaderService) {}

  @Post("reading")
  async saveReading(@Body() body: SaveProgressDto) {
    return this.readerService.saveProgress(body.chapterId, body.sentenceId, body.percent);
  }

  @Get("reading/:chapterId")
  async getReading(@Param("chapterId") chapterId: string) {
    return this.readerService.getProgress(chapterId);
  }
}
