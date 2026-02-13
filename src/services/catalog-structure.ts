export type CatalogStructure = Array<{
  id: string;
  name: string;
  slug: string;
  subcategories: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    related_skus: string[];
  }>;
}>;

// Структура витрины (клиентская): категории -> подкатегории -> товары по SKU.
// Цены и базовые категории в админке НЕ меняем.
export const CATALOG_STRUCTURE: CatalogStructure = [
  {
    id: 'cosmetics',
    name: 'Косметика',
    slug: 'cosmetics',
    subcategories: [
      {
        id: 'face_care',
        name: 'Лицо',
        slug: 'face-care',
        description: 'Уход за лицом: масла, сыворотки, очищение и тоники.',
        related_skus: [
          // Oils
          'FS1003-24', 'FS1002-24', 'FO0001-30', 'FO0002-30', 'FO0003-30', 'SI0044-45', 'SI0045-45', 'SI0046-45', 'GOS0003-20',
          // Cleansing
          'FC0001-45', 'FC0003-45', 'FC0020-90', 'FC0021-90', 'FB0002-20', 'PB0008-100',
          // Toners
          'FS0016-50', 'FS0018-50'
        ]
      },
      {
        id: 'body_care',
        name: 'Тело',
        slug: 'body-care',
        description: 'Уход за телом: гели для душа, мыло, увлажнение и питание.',
        related_skus: [
          // Wash
          'SP0020-470', 'SP0021-470', 'SP0022-470', 'SP0003-25', 'SP0014-50',
          // Moisturizers
          'BL1001-90', 'BL1002-90', 'BA1001-12', 'BA0002-25'
        ]
      },
      {
        id: 'hair_care',
        name: 'Волосы',
        slug: 'hair-care',
        description: 'Уход за волосами: шампуни и кондиционеры.',
        related_skus: [
          // Shampoo
          'SH0001-470', 'SH0002-470',
          // Conditioner
          'HT0001-420'
        ]
      },
      {
        id: 'men_collection',
        name: 'Для Мужчин',
        slug: 'men-collection',
        description: 'Специальная мужская коллекция.',
        related_skus: [
          'FS1002-24', 'SP0014-50'
        ]
      }
    ]
  },
  {
    id: 'longevity',
    name: 'Долголетие',
    slug: 'longevity',
    subcategories: [
      {
        id: 'plasma',
        name: 'Плазма',
        slug: 'plasma',
        description: 'Продукты для долголетия и восстановления.',
        related_skus: [],
      },
    ],
  },
  {
    id: 'aromatherapy',
    name: 'Ароматерапия',
    slug: 'aromatherapy',
    subcategories: [
      {
        id: 'solid_perfume',
        name: 'Твердые духи',
        slug: 'solid-perfume',
        description: 'Компактные духи на основе пчелиного воска.',
        related_skus: ['PE1001-12', 'PE1003-12'],
      },
      {
        id: 'rollers',
        name: 'Арома-роллеры',
        slug: 'rollers',
        description: 'Смеси эфирных масел для нанесения на точки пульсации.',
        related_skus: ['R001-5', 'R003-5'],
      },
    ],
  },
];
