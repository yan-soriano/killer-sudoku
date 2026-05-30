/** Профиль предмета по номеру шага (0–2). Шаг 3 — финал цикла, предмета в инвентарь нет. */
export const ITEM_PROFILES_BY_STEP = [
  {
    icon: 'access_key',
    categoryLabel: 'Доступ',
    lootBadge: 'ПРЕДМЕТ В ИНВЕНТАРЬ',
    useVerb: 'Вставить ключ',
    useProgress: 'Вставка ключа…',
    buildHint: ({ detail, stepName, targetStepName }) =>
      `«${detail}» открывает шлюз к узлу «${targetStepName}». Вирус сменил замок после сектора «${stepName}» — без предмета проход закрыт.`,
    buildInventoryLine: ({ detail, targetStepName }) =>
      `Откроет узел «${targetStepName}»`,
  },
  {
    icon: 'decode_module',
    categoryLabel: 'Модуль',
    lootBadge: 'МОДУЛЬ ПОЛУЧЕН',
    useVerb: 'Загрузить модуль',
    useProgress: 'Загрузка модуля…',
    buildHint: ({ detail, stepName, targetStepName }) =>
      `«${detail}» — код для взлома блокировки «${targetStepName}». Установи модуль в терминал после этапа «${stepName}».`,
    buildInventoryLine: ({ detail, targetStepName }) =>
      `Деблокирует «${targetStepName}»`,
  },
  {
    icon: 'purge_utility',
    categoryLabel: 'Утилита',
    lootBadge: 'УТИЛИТА ПОЛУЧЕНА',
    useVerb: 'Запустить очистку',
    useProgress: 'Очистка сектора…',
    buildHint: ({ detail, stepName, targetStepName }) =>
      `«${detail}» стирает остатки заразы на пути к «${targetStepName}». Запусти утилиту после «${stepName}».`,
    buildInventoryLine: ({ detail, targetStepName }) =>
      `Очищает путь к «${targetStepName}»`,
  },
]

export function buildLootItem({
  cycleIdx,
  cycleName,
  fromStep,
  detail,
  stepName,
  targetStepName,
}) {
  const profile = ITEM_PROFILES_BY_STEP[fromStep]
  if (!profile) return null

  const ctx = { detail, stepName, targetStepName, cycleName }

  return {
    id: `item_c${cycleIdx}_s${fromStep}_${Date.now()}`,
    cycle: cycleIdx,
    cycleName,
    fromStep,
    unlocksStep: fromStep + 1,
    detail,
    stepName,
    targetStepName,
    icon: profile.icon,
    categoryLabel: profile.categoryLabel,
    lootBadge: profile.lootBadge,
    useVerb: profile.useVerb,
    useProgress: profile.useProgress,
    useHint: profile.buildHint(ctx),
    inventoryLine: profile.buildInventoryLine(ctx),
  }
}

/** Старые сохранения без полей предмета — дополняем по fromStep */
export function enrichInventoryItem(item) {
  if (!item) return item
  if (item.useVerb && item.icon) return item

  const fromStep = Number(item.fromStep) || 0
  const built = buildLootItem({
    cycleIdx: item.cycle,
    cycleName: item.cycleName || '',
    fromStep,
    detail: item.detail,
    stepName: item.stepName,
    targetStepName: item.targetStepName,
  })

  return built ? { ...built, ...item, id: item.id } : item
}

export function enrichInventory(items) {
  return (items || []).map(enrichInventoryItem)
}

/** Превью на экране перед уровнем */
export function getStepLootPreview(stepIndex) {
  return ITEM_PROFILES_BY_STEP[stepIndex] || null
}
