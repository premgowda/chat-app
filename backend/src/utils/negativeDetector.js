// Phrases that indicate the bot couldn't answer
const NEGATIVE_PATTERNS = [
  /i don'?t have/i,
  /i did not understand/i,
  /i'?m not sure/i,
  /i don'?t know/i,
  /i can'?t (?:help|assist|answer|process)/i,
  /i'?m unable to/i,
  /let me (?:connect|redirect|escalate|transfer) you/i,
  /(?:reach|contact|speak with|talk to) (?:hr|human resources|support|the team)/i,
  /beyond my (?:scope|capabilities|knowledge)/i,
  /i apologize.*(?:can'?t|unable|don'?t have)/i,
  /i'?d (?:recommend|suggest) (?:contacting|reaching out|speaking)/i,
  /(?:unfortunately|sorry),? i (?:can'?t|cannot|am not able)/i,
  /i lack (?:the )?(information|knowledge|access|ability)/i,
  /not (?:equipped|designed|programmed) to/i,
  /outside (?:my|the) (?:scope|expertise|knowledge)/i,
];

export function isNegativeResponse(text) {
  if (!text) return false;
  // Normalize curly/smart quotes to straight quotes
  const normalized = text.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D]/g, '"');
  return NEGATIVE_PATTERNS.some((pattern) => pattern.test(normalized));
}
