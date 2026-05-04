export function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

// Serbian Cyrillic -> Latin (basic transliteration)
export function srCyrToLat(input: string): string {
  if (!input) return input;
  if (!hasCyrillic(input)) return input;

  // Handle digraphs first
  const digraphs: Array<[RegExp, string]> = [
    [/Љ/g, "Lj"], [/љ/g, "lj"],
    [/Њ/g, "Nj"], [/њ/g, "nj"],
    [/Џ/g, "Dž"], [/џ/g, "dž"],
  ];
  let s = input;
  for (const [re, rep] of digraphs) s = s.replace(re, rep);

  const map: Record<string, string> = {
    А: "A", а: "a",
    Б: "B", б: "b",
    В: "V", в: "v",
    Г: "G", г: "g",
    Д: "D", д: "d",
    Ђ: "Đ", ђ: "đ",
    Е: "E", е: "e",
    Ж: "Ž", ж: "ž",
    З: "Z", з: "z",
    И: "I", и: "i",
    Ј: "J", ј: "j",
    К: "K", к: "k",
    Л: "L", л: "l",
    М: "M", м: "m",
    Н: "N", н: "n",
    О: "O", о: "o",
    П: "P", п: "p",
    Р: "R", р: "r",
    С: "S", с: "s",
    Т: "T", т: "t",
    Ћ: "Ć", ћ: "ć",
    У: "U", у: "u",
    Ф: "F", ф: "f",
    Х: "H", х: "h",
    Ц: "C", ц: "c",
    Ч: "Č", ч: "č",
    Ш: "Š", ш: "š",
  };

  return s.replace(/[\u0400-\u04FF]/g, (ch) => map[ch] ?? ch);
}

