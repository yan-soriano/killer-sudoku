// Генерирует детерминированный случайный коэффициент на основе сида
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

function shuffleSeeded(arr, seed) {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    const r = seededRandom(s++)
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Генерирует валидную 9x9 судоку (решение)
function generateSolution() {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0))
  solveSudoku(grid)
  return grid
}

function solveSudoku(grid) {
  const empty = findEmpty(grid)
  if (!empty) return true

  const [row, col] = empty
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])

  for (const num of nums) {
    if (isValid(grid, row, col, num)) {
      grid[row][col] = num
      if (solveSudoku(grid)) return true
      grid[row][col] = 0
    }
  }
  return false
}

function findEmpty(grid) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r][c] === 0) return [r, c]
  return null
}

function isValid(grid, row, col, num) {
  // Row
  if (grid[row].includes(num)) return false
  // Col
  if (grid.map(r => r[col]).includes(num)) return false
  // Box
  const br = Math.floor(row / 3) * 3
  const bc = Math.floor(col / 3) * 3
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (grid[r][c] === num) return false
  return true
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Создаёт клетки (cages) из решённой судоку
// difficulty влияет на размер клеток и кол-во стартовых цифр
function generateCages(solution, difficulty) {
  const cells = []
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      cells.push([r, c])

  const assigned = Array.from({ length: 9 }, () => Array(9).fill(false))
  const cages = []
  const maxCageSize = difficulty === 'hard' ? 5 : 4

  for (const [startR, startC] of shuffle(cells)) {
    if (assigned[startR][startC]) continue

    const cage = [[startR, startC]]
    assigned[startR][startC] = true
    const size = 1 + Math.floor(Math.random() * maxCageSize)

    for (let i = 1; i < size; i++) {
      const neighbors = getUnassignedNeighbors(cage, assigned)
      if (neighbors.length === 0) break
      const next = neighbors[Math.floor(Math.random() * neighbors.length)]
      cage.push(next)
      assigned[next[0]][next[1]] = true
    }

    const sum = cage.reduce((acc, [r, c]) => acc + solution[r][c], 0)
    cages.push({ cells: cage, sum, id: cages.length })
  }

  return cages
}

function getUnassignedNeighbors(cage, assigned) {
  const result = []
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  for (const [r, c] of cage) {
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && !assigned[nr][nc]) {
        if (!result.some(([er, ec]) => er === nr && ec === nc))
          result.push([nr, nc])
      }
    }
  }
  return result
}

// Маппинг ячейки → cage
function buildCageMap(cages) {
  const map = {}
  for (const cage of cages)
    for (const [r, c] of cage.cells)
      map[`${r},${c}`] = cage
  return map
}

// Определить, какие границы ячейки — внешние (выходят из клетки)
export function getCellBorders(row, col, cageMap) {
  const cage = cageMap[`${row},${col}`]
  if (!cage) return {}
  const dirs = { top: [-1, 0], bottom: [1, 0], left: [0, -1], right: [0, 1] }
  const borders = {}
  for (const [side, [dr, dc]] of Object.entries(dirs)) {
    const nr = row + dr, nc = col + dc
    const neighbor = cageMap[`${nr},${nc}`]
    borders[side] = !neighbor || neighbor.id !== cage.id
  }
  return borders
}

// Временно для тестирования: почти заполненная сетка (выключи перед релизом)
export const QUICK_TEST_PUZZLES = true
const QUICK_TEST_EMPTY_CELLS = 3 // сколько цифр нужно ввести самому

// Главная функция — создаёт полные данные для игры
export function generatePuzzle(difficulty, seed = null) {
  const solution = generateSolution()
  const cages = generateCages(solution, difficulty)
  const cageMap = buildCageMap(cages)

  // Для easy/medium — предзаполненные клетки
  let prefilledCount = 0
  if (QUICK_TEST_PUZZLES) {
    prefilledCount = 81 - QUICK_TEST_EMPTY_CELLS
  } else if (difficulty === 'easy') prefilledCount = 35
  else if (difficulty === 'medium') prefilledCount = 25

  const prefilled = Array.from({ length: 9 }, () => Array(9).fill(null))

  if (prefilledCount > 0) {
    const allCells = seed
      ? shuffleSeeded(Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (__, c) => [r, c])).flat(), seed)
      : shuffle(Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (__, c) => [r, c])).flat())

    for (let i = 0; i < prefilledCount; i++) {
      const [r, c] = allCells[i]
      prefilled[r][c] = solution[r][c]
    }
  }

  return {
    solution,
    cages,
    cageMap: Object.fromEntries(
      Object.entries(cageMap).map(([k, v]) => [k, v.id])
    ),
    prefilled,
    difficulty,
  }
}

// Создаёт ежедневную задачу (одинаковую для всех)
export function generateDailyPuzzle() {
  const d = new Date()
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  // Для простоты используем Medium с фиксацией сида для перемешивания ячеек
  return generatePuzzle('medium', seed)
}

// Проверить текущий ввод
export function checkCell(solution, row, col, value) {
  return solution[row][col] === value
}

// Проверить победу — все заполнено и правильно
export function checkWin(solution, playerInput) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (playerInput[r][c] !== solution[r][c]) return false
  return true
}

// Получить подсказку — первую пустую/неправильную ячейку
export function getHint(solution, playerInput, prefilled) {
  const empty = []
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (!prefilled[r][c] && playerInput[r][c] !== solution[r][c])
        empty.push([r, c])

  if (empty.length === 0) return null
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  return { row: r, col: c, value: solution[r][c] }
}
