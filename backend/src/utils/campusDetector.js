const CAMPUS_RULES = [
  { campus: 'Bethany Village', keywords: ['bethany', 'bethany village'] },
  { campus: 'Spring Hills',   keywords: ['spring hills', 'spring hill', 'springhills'] },
];

export function detectCampus(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const rule of CAMPUS_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.campus;
    }
  }

  return null;
}
