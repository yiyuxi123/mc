export const RECIPES = [
  {
    result: { type: 'crafting_table', count: 1 },
    pattern: [
      ['wood', 'wood', null],
      ['wood', 'wood', null],
      [null, null, null]
    ]
  },
  {
    result: { type: 'iron_pickaxe', count: 1 },
    pattern: [
      ['iron_ore', 'iron_ore', 'iron_ore'],
      [null, 'wood', null],
      [null, 'wood', null]
    ]
  },
  {
    result: { type: 'wooden_axe', count: 1 },
    pattern: [
      ['wood', 'wood', null],
      ['wood', 'wood', null],
      [null, 'wood', null]
    ]
  },
  {
    result: { type: 'torch', count: 4 },
    pattern: [
      ['wood', null, null],
      ['wood', null, null],
      [null, null, null]
    ]
  },
  {
    result: { type: 'chest', count: 1 },
    pattern: [
      ['wood', 'wood', 'wood'],
      ['wood', null, 'wood'],
      ['wood', 'wood', 'wood']
    ]
  },
  {
    result: { type: 'bread', count: 1 },
    pattern: [
      ['wheat', 'wheat', 'wheat'],
      [null, null, null],
      [null, null, null]
    ]
  }
];

export const checkRecipe = (grid: (string | null)[]) => {
  // Find bounding box of items in grid
  let minR = 3, maxR = -1, minC = 3, maxC = -1;
  for (let i = 0; i < 9; i++) {
    if (grid[i]) {
      const r = Math.floor(i / 3);
      const c = i % 3;
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
    }
  }

  if (minR > maxR) return null; // Empty grid

  // Normalize grid to top-left
  const normalizedGrid = Array(9).fill(null);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      normalizedGrid[(r - minR) * 3 + (c - minC)] = grid[r * 3 + c];
    }
  }

  for (const recipe of RECIPES) {
    const flatPattern = recipe.pattern.flat();
    let match = true;
    for (let i = 0; i < 9; i++) {
      if (normalizedGrid[i] !== flatPattern[i]) {
        match = false;
        break;
      }
    }
    if (match) return recipe.result;
  }
  
  return null;
};
