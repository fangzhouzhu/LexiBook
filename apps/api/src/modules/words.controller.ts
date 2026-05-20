import { Controller, Get, Param, Post } from "@nestjs/common";
import { ReaderService } from "./reader.service";

@Controller("words")
export class WordsController {
  constructor(private readonly readerService: ReaderService) {}

  @Get(":word")
  getWord(@Param("word") word: string) {
    return this.readerService.getWord(word);
  }

  @Post(":word/explain")
  explainWord(@Param("word") word: string) {
    return this.readerService.getWord(word);
  }
}
