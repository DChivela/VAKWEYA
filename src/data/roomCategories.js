export const roomCategories = [
  { value: 'suite', label: 'Suíte' },
  { value: 'solteiro', label: 'Solteiro' },
  { value: 'vip', label: 'VIP' },
  { value: 'casal', label: 'Casal' }
];

export function roomCategoryLabel(value) {
  return roomCategories.find((category) => category.value === value)?.label || 'Casal';
}
