export const VIRUS_CYCLES = [
    {
        id: 1,
        name: 'TROJAN_01',
        theme: 'terminal', // green
        color: '#00ff41',
        bg: 'bg-ink-950',
        difficulty: 'easy',
        steps: [
            { name: 'Навигация', desc: 'Проникаешь внутрь файловой системы', detail: 'Ключ доступа', bytes: 10 },
            { name: 'Взлом', desc: 'Ломаешь блокировку вируса', detail: 'Код деблокировки', bytes: 10 },
            { name: 'Очистка', desc: 'Удаляешь вирусные файлы', detail: 'Чистый сектор', bytes: 10 },
            { name: 'Запуск', desc: 'Добираешься до антивируса и запускаешь его', detail: 'Антивирус онлайн', bytes: 10 },
        ],
        bonus: 30
    },
    {
        id: 2,
        name: 'WORM_02',
        theme: 'bsod', // blue
        color: '#0078d7',
        bg: 'bg-[#0000aa]',
        difficulty: 'medium',
        steps: [
            { name: 'Навигация', desc: 'Анализ сетевых пакетов червя', detail: 'Сетевой фильтр', bytes: 10 },
            { name: 'Взлом', desc: 'Обход брандмауэра', detail: 'Туннельный протокол', bytes: 10 },
            { name: 'Очистка', desc: 'Изоляция зараженных узлов', detail: 'Карантинная зона', bytes: 10 },
            { name: 'Запуск', desc: 'Применение патча безопасности', detail: 'Система обновлена', bytes: 10 },
        ],
        bonus: 30
    },
    {
        id: 3,
        name: 'ROOTKIT_03',
        theme: 'glitch', // red
        color: '#ff0000',
        bg: 'bg-black',
        difficulty: 'hard',
        steps: [
            { name: 'Навигация', desc: 'Поиск скрытых процессов', detail: 'Теневой сканер', bytes: 10 },
            { name: 'Взлом', desc: 'Перехват системных вызовов', detail: 'Инжектор кода', bytes: 10 },
            { name: 'Очистка', desc: 'Удаление скрытого кода', detail: 'Бинарный ластик', bytes: 10 },
            { name: 'Запуск', desc: 'Восстановление ядра системы', detail: 'Ядро стабильно', bytes: 10 },
        ],
        bonus: 30
    },
    {
        id: 4,
        name: 'AI_VIRUS_04',
        theme: 'gold', // gold/white
        color: '#ffd700',
        bg: 'bg-white text-black',
        difficulty: 'hard', // "Очень сложно" в ТЗ -> будем использовать hard или добавим extreme позже
        steps: [
            { name: 'Навигация', desc: 'Картирование нейронных связей', detail: 'Синаптическая карта', bytes: 10 },
            { name: 'Взлом', desc: 'Перегрузка логических модулей', detail: 'Логическая бомба', bytes: 10 },
            { name: 'Очистка', desc: 'Стирание самообучающихся алгоритмов', detail: 'Чистый разум', bytes: 10 },
            { name: 'Запуск', desc: 'Инициализация системной этики', detail: 'AI под контролем', bytes: 10 },
        ],
        bonus: 30
    }
]
