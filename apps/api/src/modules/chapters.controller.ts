import { Controller, Get, Param } from "@nestjs/common";
import { ReaderService } from "./reader.service";

@Controller("chapters")
export class ChaptersController {
  constructor(private readonly readerService: ReaderService) {}

  @Get(":id")
  getChapter(@Param("id") id: string) {
    return this.readerService.getReaderData(id);
  }

  @Get(":id/reader-data")
  getReaderData(@Param("id") id: string) {
    return this.readerService.getReaderData(id);
  }
}
