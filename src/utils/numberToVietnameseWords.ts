const DIGIT_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

function readThreeDigits(threeDigits: number, showZeroHundred: boolean): string {
  const hundreds = Math.floor(threeDigits / 100);
  const remainder = threeDigits % 100;
  const tens = Math.floor(remainder / 10);
  const units = remainder % 10;
  const parts: string[] = [];

  if (hundreds > 0 || showZeroHundred) {
    parts.push(DIGIT_WORDS[hundreds], 'trăm');
  }

  if (tens > 1) {
    parts.push(DIGIT_WORDS[tens], 'mươi');
    if (units === 1) parts.push('mốt');
    else if (units === 4) parts.push('tư');
    else if (units === 5) parts.push('lăm');
    else if (units > 0) parts.push(DIGIT_WORDS[units]);
  } else if (tens === 1) {
    parts.push('mười');
    if (units === 1) parts.push('một');
    else if (units === 5) parts.push('lăm');
    else if (units > 0) parts.push(DIGIT_WORDS[units]);
  } else if (hundreds > 0 || showZeroHundred) {
    if (units > 0) {
      parts.push('lẻ', DIGIT_WORDS[units]);
    }
  } else if (units > 0) {
    parts.push(DIGIT_WORDS[units]);
  }

  return parts.join(' ');
}

export function numberToVietnameseWords(amount: number): string {
  if (!amount || amount === 0) return 'Không đồng';
  const cleanAmount = Math.floor(Math.abs(amount));

  const groups: number[] = [];
  let temp = cleanAmount;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const resultParts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const showZero = i < groups.length - 1;
      const groupWords = readThreeDigits(groupVal, showZero);
      resultParts.push(groupWords);
      if (UNITS[i]) {
        resultParts.push(UNITS[i]);
      }
    }
  }

  let text = resultParts.filter(Boolean).join(' ').trim();
  if (!text) return 'Không đồng';

  // Chữ hoa đầu câu
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return `${text} đồng chẵn`;
}
