export type CatalogSentence = {
  order: number;
  english: string;
  chinese: string;
};

export type CatalogChapter = {
  order: number;
  title: string;
  sentences: CatalogSentence[];
};

export type CatalogBook = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  category: string;
  level: "A2" | "B1" | "B2";
  description: string;
  totalPages: number;
  initialStatus: "reading" | "finished" | "wishlist";
  initialCurrentPage: number;
  chapters: CatalogChapter[];
};

export const CATALOG_BOOKS: CatalogBook[] = [
  {
    id: "secret-garden",
    title: "The Secret Garden",
    author: "Frances Hodgson Burnett",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780064401883-L.jpg",
    category: "儿童文学",
    level: "A2",
    description: "温柔治愈的成长故事，适合精读与朗读。",
    totalPages: 280,
    initialStatus: "reading",
    initialCurrentPage: 126,
    chapters: [
      {
        order: 1,
        title: "There Is No One Left",
        sentences: [
          { order: 1, english: "When Mary Lennox was sent to Misselthwaite Manor to live with her uncle, everybody said she was the most disagreeable-looking child ever seen.", chinese: "玛丽被送到米塞尔思韦特庄园和舅舅同住时，人人都说她是最不讨喜的孩子。" },
          { order: 2, english: "It was true, too.", chinese: "这话确实不假。" },
          { order: 3, english: "She had a little thin face and a little thin body, thin light hair and a sour expression.", chinese: "她脸小而瘦，身子也小而瘦，头发稀薄浅淡，神情总是阴郁。" },
          { order: 4, english: "Her hair was yellow, and her face was yellow because she had been born in India and had always been ill in one way or another.", chinese: "她的头发发黄，脸色也发黄，因为她出生在印度，而且总是这儿那儿不舒服。" },
          { order: 5, english: "Her father had held a position under the English Government and had always been busy and ill himself.", chinese: "她父亲在英国政府任职，自己也一直忙碌又多病。" }
        ]
      }
    ]
  },
  {
    id: "pride-and-prejudice",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg",
    category: "经典名著",
    level: "B1",
    description: "机智对话与人物关系并行推进，词汇经典。",
    totalPages: 390,
    initialStatus: "finished",
    initialCurrentPage: 390,
    chapters: [
      {
        order: 1,
        title: "Chapter 1",
        sentences: [
          { order: 1, english: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", chinese: "凡是有钱的单身汉，总想娶位太太，这几乎是举世公认的真理。" },
          { order: 2, english: "However little known the feelings or views of such a man may be on his first entering a neighbourhood,", chinese: "这样的男人初到一个地方时，他的感受和想法也许无人知晓，" },
          { order: 3, english: "this truth is so well fixed in the minds of the surrounding families,", chinese: "但这条真理却深深扎根于周围人家的心里，" },
          { order: 4, english: "that he is considered the rightful property of some one or other of their daughters.", chinese: "以至于大家都把他看作某位女儿的合法财产。" },
          { order: 5, english: "My dear Mr. Bennet, said his lady to him one day, have you heard that Netherfield Park is let at last?", chinese: "有一天，班纳特太太问：“亲爱的班纳特先生，你听说内瑟菲尔德庄园终于租出去了吗？”" }
        ]
      }
    ]
  },
  {
    id: "a-christmas-carol",
    title: "A Christmas Carol",
    author: "Charles Dickens",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780141324524-L.jpg",
    category: "经典文学",
    level: "B2",
    description: "节日氛围浓郁，叙事节奏清晰，适合进阶阅读。",
    totalPages: 180,
    initialStatus: "reading",
    initialCurrentPage: 54,
    chapters: [
      {
        order: 1,
        title: "Marley's Ghost",
        sentences: [
          { order: 1, english: "Marley was dead: to begin with.", chinese: "先说清楚：马利已经死了。" },
          { order: 2, english: "There is no doubt whatever about that.", chinese: "这一点毫无疑问。" },
          { order: 3, english: "The register of his burial was signed by the clergyman, the clerk, the undertaker, and the chief mourner.", chinese: "他的死亡登记由牧师、书记员、殡仪承办人和主要送葬者签了字。" },
          { order: 4, english: "Scrooge signed it.", chinese: "斯克鲁奇也签了字。" },
          { order: 5, english: "And Scrooge's name was good upon 'Change, for anything he chose to put his hand to.", chinese: "在交易所里，斯克鲁奇的名字分量十足，他签什么都有人认账。" }
        ]
      }
    ]
  },
  {
    id: "alice-in-wonderland",
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780141321073-L.jpg",
    category: "儿童文学",
    level: "A2",
    description: "想象力丰富，句式短小，适合初中级练习。",
    totalPages: 210,
    initialStatus: "wishlist",
    initialCurrentPage: 0,
    chapters: [
      {
        order: 1,
        title: "Down the Rabbit-Hole",
        sentences: [
          { order: 1, english: "Alice was beginning to get very tired of sitting by her sister on the bank.", chinese: "爱丽丝开始厌倦了坐在河岸边陪着姐姐。" },
          { order: 2, english: "She had nothing to do.", chinese: "她无事可做。" },
          { order: 3, english: "Once or twice she had peeped into the book her sister was reading.", chinese: "她偶尔瞟一眼姐姐正在看的书。" },
          { order: 4, english: "But it had no pictures or conversations in it.", chinese: "可那本书里既没有插图，也没有对话。" },
          { order: 5, english: "And what is the use of a book, thought Alice, without pictures or conversations?", chinese: "爱丽丝心想，一本既没有插图也没有对话的书有什么用呢？" }
        ]
      }
    ]
  },
  {
    id: "sherlock-holmes",
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780141034379-L.jpg",
    category: "侦探推理",
    level: "B1",
    description: "经典侦探短篇合集，适合训练推理表达。",
    totalPages: 320,
    initialStatus: "wishlist",
    initialCurrentPage: 0,
    chapters: [
      {
        order: 1,
        title: "A Scandal in Bohemia",
        sentences: [
          { order: 1, english: "To Sherlock Holmes she is always the woman.", chinese: "对夏洛克·福尔摩斯来说，她永远是那个女人。" },
          { order: 2, english: "I have seldom heard him mention her under any other name.", chinese: "我很少听他用别的名字提起她。" },
          { order: 3, english: "In his eyes she eclipses and predominates the whole of her sex.", chinese: "在他眼中，她让所有女性都黯然失色。" },
          { order: 4, english: "It was not that he felt any emotion akin to love for Irene Adler.", chinese: "这并不是说他对艾琳·艾德勒怀有类似爱情的感情。" },
          { order: 5, english: "All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind.", chinese: "所有情感，尤其是爱情，都与他冷静、精确而极其平衡的头脑格格不入。" }
        ]
      }
    ]
  },
  {
    id: "dracula",
    title: "Dracula",
    author: "Bram Stoker",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780141439846-L.jpg",
    category: "哥特文学",
    level: "B2",
    description: "书信体与日记体结合，沉浸感强。",
    totalPages: 430,
    initialStatus: "wishlist",
    initialCurrentPage: 0,
    chapters: [
      {
        order: 1,
        title: "Jonathan Harker's Journal",
        sentences: [
          { order: 1, english: "Left Munich at 8:35 P.M., on 1st May, arriving at Vienna early next morning.", chinese: "五月一日晚八点三十五分离开慕尼黑，第二天清晨抵达维也纳。" },
          { order: 2, english: "Buda-Pesth seems a wonderful place, from the glimpse which I got of it from the train.", chinese: "从火车上一瞥而过，布达佩斯似乎是个美妙的地方。" },
          { order: 3, english: "I feared to go very far from the station, as we had arrived late and would start as near the correct time as possible.", chinese: "我们到得晚，又要尽量准时出发，所以我不敢离车站太远。" },
          { order: 4, english: "The impression I had was that we were leaving the West and entering the East.", chinese: "我的印象是，我们正在离开西方，进入东方。" },
          { order: 5, english: "The most western of splendid bridges over the Danube took us among the traditions of Turkish rule.", chinese: "多瑙河上最西边的壮丽桥梁，把我们带入土耳其统治的旧日传统之中。" }
        ]
      }
    ]
  },
  {
    id: "the-time-machine",
    title: "The Time Machine",
    author: "H. G. Wells",
    coverUrl: "https://covers.openlibrary.org/b/id/8231856-L.jpg",
    category: "科幻冒险",
    level: "B1",
    description: "短小但想象力锋利的时间旅行经典，节奏快，适合做沉浸式精读。",
    totalPages: 160,
    initialStatus: "wishlist",
    initialCurrentPage: 0,
    chapters: [
      {
        order: 1,
        title: "Introduction",
        sentences: [
          { order: 1, english: "The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us.", chinese: "那位时间旅行者（我们不妨这样称呼他）正在向我们阐述一个深奥的问题。" },
          { order: 2, english: "His pale grey eyes shone and twinkled, and his usually pale face was flushed and animated.", chinese: "他浅灰色的眼睛闪闪发亮，平日苍白的脸也因兴奋而泛红。" },
          { order: 3, english: "The fire burnt brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses.", chinese: "炉火明亮地燃烧着，银色百合灯中柔和的白炽光映住了杯中一闪而过的气泡。" },
          { order: 4, english: "Our chairs, being his patents, embraced and caressed us rather than submitted to be sat upon.", chinese: "我们的椅子是他的专利，与其说供人坐下，不如说在拥抱并抚慰我们。" },
          { order: 5, english: "You must follow me carefully.", chinese: "你们必须仔细跟上我的思路。" }
        ]
      }
    ]
  },
  {
    id: "treasure-island",
    title: "Treasure Island",
    author: "Robert Louis Stevenson",
    coverUrl: "https://covers.openlibrary.org/b/id/8231991-L.jpg",
    category: "海盗冒险",
    level: "B1",
    description: "海盗、藏宝图和少年冒险的源头级故事，句子有画面感，读起来很有冲劲。",
    totalPages: 260,
    initialStatus: "wishlist",
    initialCurrentPage: 0,
    chapters: [
      {
        order: 1,
        title: "The Old Sea-Dog at the Admiral Benbow",
        sentences: [
          { order: 1, english: "Squire Trelawney, Dr. Livesey, and the rest of these gentlemen having asked me to write down the whole particulars about Treasure Island.", chinese: "特里劳尼乡绅、利弗西医生以及其他先生们请我把关于金银岛的全部细节写下来。" },
          { order: 2, english: "I take up my pen in the year of grace 17-- and go back to the time when my father kept the Admiral Benbow inn.", chinese: "我在公元十七某年提笔，回到父亲经营本葆海军上将旅店的那段时光。" },
          { order: 3, english: "The brown old seaman, with the sabre cut, first took up his lodging under our roof.", chinese: "那个脸色黝黑、带着刀疤的老水手第一次住进了我们家。" },
          { order: 4, english: "I remember him as if it were yesterday, as he came plodding to the inn door.", chinese: "我记得他就像昨天才发生的一样，他沉重地走到旅店门前。" },
          { order: 5, english: "His sea-chest following behind him in a hand-barrow.", chinese: "他的水手箱放在一辆手推车上，跟在他后面。" }
        ]
      }
    ]
  },
  {
    id: "wizard-of-oz",
    title: "The Wonderful Wizard of Oz",
    author: "L. Frank Baum",
    coverUrl: "https://covers.openlibrary.org/b/id/12648747-L.jpg",
    category: "奇幻童话",
    level: "A2",
    description: "龙卷风、黄砖路和奥兹国伙伴团，语言清亮，适合轻松建立英文阅读惯性。",
    totalPages: 190,
    initialStatus: "wishlist",
    initialCurrentPage: 0,
    chapters: [
      {
        order: 1,
        title: "The Cyclone",
        sentences: [
          { order: 1, english: "Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer's wife.", chinese: "多萝西和农夫亨利叔叔、农夫的妻子艾姆婶婶一起，住在堪萨斯大草原的中央。" },
          { order: 2, english: "Their house was small, for the lumber to build it had to be carried by wagon many miles.", chinese: "他们的房子很小，因为建房的木材得用马车运很远。" },
          { order: 3, english: "There were four walls, a floor and a roof, which made one room.", chinese: "四面墙、一块地板和一个屋顶构成了唯一的房间。" },
          { order: 4, english: "When Dorothy stood in the doorway and looked around, she could see nothing but the great gray prairie on every side.", chinese: "多萝西站在门口四下望去，只能看见四周一片辽阔的灰色草原。" },
          { order: 5, english: "The sun had baked the plowed land into a gray mass, with little cracks running through it.", chinese: "太阳把翻过的土地烤成灰色的一片，上面布满细小裂缝。" }
        ]
      }
    ]
  }
];
