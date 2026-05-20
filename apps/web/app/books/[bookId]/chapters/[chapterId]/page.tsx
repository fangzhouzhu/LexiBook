import { BookReader } from "@/components/reader/BookReader";
import { getChapterReaderData } from "@/services/bookApi";

type Props = {
  params: { bookId: string; chapterId: string };
};

export default async function ReaderPage({ params }: Props) {
  const data = await getChapterReaderData(params.chapterId);
  return <BookReader data={data} />;
}
