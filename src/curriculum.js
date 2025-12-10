// Curriculum based on HSK levels with practical conversation focus
export const curriculum = {
  levels: [
    {
      id: 1,
      name: "Absolute Beginner",
      description: "Basic greetings and introductions",
      lessons: [
        {
          id: "1.1",
          title: "Greetings",
          titleChinese: "问候",
          description: "Learn to say hello and goodbye",
          vocabulary: [
            { chinese: "你好", pinyin: "nǐ hǎo", english: "hello" },
            { chinese: "再见", pinyin: "zài jiàn", english: "goodbye" },
            { chinese: "谢谢", pinyin: "xiè xiè", english: "thank you" },
            { chinese: "不客气", pinyin: "bù kè qì", english: "you're welcome" },
            { chinese: "早上好", pinyin: "zǎo shang hǎo", english: "good morning" },
            { chinese: "晚上好", pinyin: "wǎn shang hǎo", english: "good evening" },
            { chinese: "晚安", pinyin: "wǎn ān", english: "good night" },
          ],
          grammarPoints: [
            "Basic sentence structure: Subject + Verb",
            "The greeting 你好 can be used any time of day",
          ],
          practiceGoal: "Have a simple greeting exchange with the tutor",
        },
        {
          id: "1.2",
          title: "Self Introduction",
          titleChinese: "自我介绍",
          description: "Tell people your name and ask theirs",
          vocabulary: [
            { chinese: "我", pinyin: "wǒ", english: "I / me" },
            { chinese: "你", pinyin: "nǐ", english: "you" },
            { chinese: "是", pinyin: "shì", english: "am / is / are" },
            { chinese: "叫", pinyin: "jiào", english: "to be called" },
            { chinese: "什么", pinyin: "shén me", english: "what" },
            { chinese: "名字", pinyin: "míng zì", english: "name" },
            { chinese: "认识你很高兴", pinyin: "rèn shí nǐ hěn gāo xìng", english: "nice to meet you" },
          ],
          grammarPoints: [
            "我叫... (Wǒ jiào...) - My name is...",
            "你叫什么名字？(Nǐ jiào shénme míngzì?) - What's your name?",
          ],
          practiceGoal: "Introduce yourself and ask the tutor's name",
        },
        {
          id: "1.3",
          title: "Numbers 1-10",
          titleChinese: "数字",
          description: "Count from one to ten",
          vocabulary: [
            { chinese: "一", pinyin: "yī", english: "one" },
            { chinese: "二", pinyin: "èr", english: "two" },
            { chinese: "三", pinyin: "sān", english: "three" },
            { chinese: "四", pinyin: "sì", english: "four" },
            { chinese: "五", pinyin: "wǔ", english: "five" },
            { chinese: "六", pinyin: "liù", english: "six" },
            { chinese: "七", pinyin: "qī", english: "seven" },
            { chinese: "八", pinyin: "bā", english: "eight" },
            { chinese: "九", pinyin: "jiǔ", english: "nine" },
            { chinese: "十", pinyin: "shí", english: "ten" },
          ],
          grammarPoints: [
            "Numbers are building blocks for dates, prices, and phone numbers",
            "二 (èr) vs 两 (liǎng) - both mean 'two' but used differently",
          ],
          practiceGoal: "Count objects and answer number questions",
        },
        {
          id: "1.4",
          title: "Yes, No & Questions",
          titleChinese: "是与不是",
          description: "Ask and answer simple yes/no questions",
          vocabulary: [
            { chinese: "是", pinyin: "shì", english: "yes (to be)" },
            { chinese: "不", pinyin: "bù", english: "no / not" },
            { chinese: "吗", pinyin: "ma", english: "question particle" },
            { chinese: "对", pinyin: "duì", english: "correct / right" },
            { chinese: "不对", pinyin: "bù duì", english: "incorrect / wrong" },
            { chinese: "好", pinyin: "hǎo", english: "good / okay" },
            { chinese: "不好", pinyin: "bù hǎo", english: "not good" },
          ],
          grammarPoints: [
            "Add 吗 to the end of a statement to make it a question",
            "Negate with 不 before the verb: 不是 (bù shì) = is not",
          ],
          practiceGoal: "Ask and answer yes/no questions",
        },
      ],
    },
    {
      id: 2,
      name: "Beginner",
      description: "Daily life basics",
      lessons: [
        {
          id: "2.1",
          title: "Family Members",
          titleChinese: "家人",
          description: "Talk about your family",
          vocabulary: [
            { chinese: "家", pinyin: "jiā", english: "family / home" },
            { chinese: "爸爸", pinyin: "bà ba", english: "father" },
            { chinese: "妈妈", pinyin: "mā ma", english: "mother" },
            { chinese: "哥哥", pinyin: "gē ge", english: "older brother" },
            { chinese: "姐姐", pinyin: "jiě jie", english: "older sister" },
            { chinese: "弟弟", pinyin: "dì di", english: "younger brother" },
            { chinese: "妹妹", pinyin: "mèi mei", english: "younger sister" },
            { chinese: "有", pinyin: "yǒu", english: "to have" },
            { chinese: "没有", pinyin: "méi yǒu", english: "don't have" },
          ],
          grammarPoints: [
            "有 (yǒu) is negated with 没 not 不: 没有 (méi yǒu)",
            "你有...吗？(Nǐ yǒu... ma?) - Do you have...?",
          ],
          practiceGoal: "Describe your family to the tutor",
        },
        {
          id: "2.2",
          title: "Food & Drinks",
          titleChinese: "食物和饮料",
          description: "Order food and express preferences",
          vocabulary: [
            { chinese: "吃", pinyin: "chī", english: "to eat" },
            { chinese: "喝", pinyin: "hē", english: "to drink" },
            { chinese: "米饭", pinyin: "mǐ fàn", english: "rice" },
            { chinese: "面条", pinyin: "miàn tiáo", english: "noodles" },
            { chinese: "水", pinyin: "shuǐ", english: "water" },
            { chinese: "茶", pinyin: "chá", english: "tea" },
            { chinese: "咖啡", pinyin: "kā fēi", english: "coffee" },
            { chinese: "想", pinyin: "xiǎng", english: "want / would like" },
            { chinese: "要", pinyin: "yào", english: "want / need" },
          ],
          grammarPoints: [
            "我想吃... (Wǒ xiǎng chī...) - I want to eat...",
            "我要一杯... (Wǒ yào yì bēi...) - I want a cup of...",
          ],
          practiceGoal: "Order a meal at a restaurant",
        },
        {
          id: "2.3",
          title: "Time & Days",
          titleChinese: "时间",
          description: "Tell time and discuss schedules",
          vocabulary: [
            { chinese: "今天", pinyin: "jīn tiān", english: "today" },
            { chinese: "明天", pinyin: "míng tiān", english: "tomorrow" },
            { chinese: "昨天", pinyin: "zuó tiān", english: "yesterday" },
            { chinese: "现在", pinyin: "xiàn zài", english: "now" },
            { chinese: "点", pinyin: "diǎn", english: "o'clock" },
            { chinese: "分", pinyin: "fēn", english: "minute" },
            { chinese: "几点", pinyin: "jǐ diǎn", english: "what time" },
            { chinese: "星期", pinyin: "xīng qī", english: "week" },
          ],
          grammarPoints: [
            "现在几点？(Xiànzài jǐ diǎn?) - What time is it now?",
            "Time structure: X点Y分 (X diǎn Y fēn) - X:Y",
          ],
          practiceGoal: "Tell time and discuss your daily schedule",
        },
        {
          id: "2.4",
          title: "Places & Directions",
          titleChinese: "地方",
          description: "Ask where things are",
          vocabulary: [
            { chinese: "在", pinyin: "zài", english: "at / in / on" },
            { chinese: "哪里", pinyin: "nǎ lǐ", english: "where" },
            { chinese: "这里", pinyin: "zhè lǐ", english: "here" },
            { chinese: "那里", pinyin: "nà lǐ", english: "there" },
            { chinese: "左", pinyin: "zuǒ", english: "left" },
            { chinese: "右", pinyin: "yòu", english: "right" },
            { chinese: "前", pinyin: "qián", english: "front" },
            { chinese: "后", pinyin: "hòu", english: "back / behind" },
          ],
          grammarPoints: [
            "...在哪里？(...zài nǎlǐ?) - Where is...?",
            "在...的左边/右边 (zài...de zuǒbiān/yòubiān) - on the left/right of...",
          ],
          practiceGoal: "Ask for and give directions",
        },
      ],
    },
    {
      id: 3,
      name: "Elementary",
      description: "Expanding conversations",
      lessons: [
        {
          id: "3.1",
          title: "Shopping",
          titleChinese: "购物",
          description: "Buy things and discuss prices",
          vocabulary: [
            { chinese: "买", pinyin: "mǎi", english: "to buy" },
            { chinese: "卖", pinyin: "mài", english: "to sell" },
            { chinese: "钱", pinyin: "qián", english: "money" },
            { chinese: "块", pinyin: "kuài", english: "yuan (colloquial)" },
            { chinese: "多少钱", pinyin: "duō shǎo qián", english: "how much money" },
            { chinese: "太贵了", pinyin: "tài guì le", english: "too expensive" },
            { chinese: "便宜", pinyin: "pián yi", english: "cheap" },
            { chinese: "可以", pinyin: "kě yǐ", english: "can / may" },
          ],
          grammarPoints: [
            "这个多少钱？(Zhège duōshao qián?) - How much is this?",
            "可以便宜一点吗？(Kěyǐ piányi yìdiǎn ma?) - Can it be cheaper?",
          ],
          practiceGoal: "Negotiate a purchase at a market",
        },
        {
          id: "3.2",
          title: "Weather",
          titleChinese: "天气",
          description: "Discuss weather and seasons",
          vocabulary: [
            { chinese: "天气", pinyin: "tiān qì", english: "weather" },
            { chinese: "热", pinyin: "rè", english: "hot" },
            { chinese: "冷", pinyin: "lěng", english: "cold" },
            { chinese: "下雨", pinyin: "xià yǔ", english: "to rain" },
            { chinese: "晴天", pinyin: "qíng tiān", english: "sunny day" },
            { chinese: "春天", pinyin: "chūn tiān", english: "spring" },
            { chinese: "夏天", pinyin: "xià tiān", english: "summer" },
            { chinese: "秋天", pinyin: "qiū tiān", english: "autumn" },
            { chinese: "冬天", pinyin: "dōng tiān", english: "winter" },
          ],
          grammarPoints: [
            "今天天气怎么样？(Jīntiān tiānqì zěnmeyàng?) - How's the weather today?",
            "很/太 + adjective: 很热 (hěn rè) very hot, 太冷了 (tài lěng le) too cold",
          ],
          practiceGoal: "Discuss today's weather and your favorite season",
        },
        {
          id: "3.3",
          title: "Hobbies",
          titleChinese: "爱好",
          description: "Talk about what you like to do",
          vocabulary: [
            { chinese: "喜欢", pinyin: "xǐ huān", english: "to like" },
            { chinese: "爱", pinyin: "ài", english: "to love" },
            { chinese: "看", pinyin: "kàn", english: "to watch / look" },
            { chinese: "听", pinyin: "tīng", english: "to listen" },
            { chinese: "书", pinyin: "shū", english: "book" },
            { chinese: "音乐", pinyin: "yīn yuè", english: "music" },
            { chinese: "电影", pinyin: "diàn yǐng", english: "movie" },
            { chinese: "运动", pinyin: "yùn dòng", english: "sports / exercise" },
          ],
          grammarPoints: [
            "我喜欢... (Wǒ xǐhuān...) - I like...",
            "你喜欢做什么？(Nǐ xǐhuān zuò shénme?) - What do you like to do?",
          ],
          practiceGoal: "Discuss hobbies and find common interests",
        },
        {
          id: "3.4",
          title: "Making Plans",
          titleChinese: "计划",
          description: "Suggest activities and make appointments",
          vocabulary: [
            { chinese: "想", pinyin: "xiǎng", english: "to want / think" },
            { chinese: "一起", pinyin: "yì qǐ", english: "together" },
            { chinese: "去", pinyin: "qù", english: "to go" },
            { chinese: "来", pinyin: "lái", english: "to come" },
            { chinese: "好的", pinyin: "hǎo de", english: "okay / alright" },
            { chinese: "没问题", pinyin: "méi wèn tí", english: "no problem" },
            { chinese: "什么时候", pinyin: "shén me shí hòu", english: "when" },
            { chinese: "怎么样", pinyin: "zěn me yàng", english: "how about" },
          ],
          grammarPoints: [
            "我们一起去...怎么样？(Wǒmen yìqǐ qù... zěnmeyàng?) - How about we go to... together?",
            "你什么时候有空？(Nǐ shénme shíhou yǒu kòng?) - When are you free?",
          ],
          practiceGoal: "Make plans to meet up with the tutor",
        },
      ],
    },
  ],
};

// Get lesson by ID
export function getLesson(lessonId) {
  for (const level of curriculum.levels) {
    const lesson = level.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      return { lesson, level };
    }
  }
  return null;
}

// Get next lesson
export function getNextLesson(currentLessonId) {
  const allLessons = curriculum.levels.flatMap((level) =>
    level.lessons.map((lesson) => ({ ...lesson, levelId: level.id }))
  );

  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  if (currentIndex === -1 || currentIndex === allLessons.length - 1) {
    return null;
  }

  return allLessons[currentIndex + 1];
}

// Get all vocabulary from completed lessons
export function getLearnedVocabulary(completedLessons) {
  const vocab = [];
  for (const level of curriculum.levels) {
    for (const lesson of level.lessons) {
      if (completedLessons.includes(lesson.id)) {
        vocab.push(...lesson.vocabulary);
      }
    }
  }
  return vocab;
}
