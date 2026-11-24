export const GROCERY_CATEGORY_OPTIONS = [
  { value: 'food', label: 'Thực phẩm' },
  { value: 'household', label: 'Đồ gia dụng' },
  { value: 'other', label: 'Khác' }
];

export function getGroceryCategoryOptions(t?: (key: any) => string) {
  if (!t) return GROCERY_CATEGORY_OPTIONS;
  return [
    { value: 'food', label: t('shopping.foodTab') },
    { value: 'household', label: t('shopping.householdTab') },
    { value: 'other', label: t('shopping.otherTab') },
  ];
}
