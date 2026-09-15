/**
 * Calculates a clean pagination window with ellipsis for large page counts.
 * Returns an array of numbers and '...' strings.
 */
export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  maxDisplay: number = 10
): (number | string)[] {
  if (totalPages <= 1) {
    return totalPages === 1 ? [1] : [];
  }

  // If total pages is within limit + buffer, show all
  if (totalPages <= maxDisplay + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Near the start: show 1 to maxDisplay (1 to 10), ..., totalPages
  const startThreshold = Math.ceil(maxDisplay * 0.7); // 7
  if (currentPage <= startThreshold) {
    const startRange = Array.from({ length: maxDisplay }, (_, i) => i + 1);
    return [...startRange, "...", totalPages];
  }

  // Near the end: show 1, ..., then the last maxDisplay numbers
  const endThreshold = totalPages - startThreshold;
  if (currentPage >= endThreshold) {
    const endRange = Array.from(
      { length: maxDisplay },
      (_, i) => totalPages - maxDisplay + 1 + i
    );
    return [1, "...", ...endRange];
  }

  // In the middle: show 1, ..., window around currentPage, ..., totalPages
  const sideCount = Math.floor((maxDisplay - 4) / 2); // 3 on each side
  const middleRange = Array.from(
    { length: sideCount * 2 + 1 },
    (_, i) => currentPage - sideCount + i
  );
  return [1, "...", ...middleRange, "...", totalPages];
}
