
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Dish } from '../model/dish';
import type { DishCategory } from '../model/dishcategory';

const CATEGORY_KEY = 'BIT240193_DishCategory';
const DISH_KEY = 'BIT240193_Dish';
const LANGUAGE_KEY = 'BIT240193_Language';

const initialCategories: DishCategory[] = [
  { Id: 'CAT01', Name: 'Main Course', Description: 'Main dishes' },
  { Id: 'CAT02', Name: 'Appetizer', Description: 'Starter dishes' },
  { Id: 'CAT03', Name: 'Dessert', Description: 'Sweet dishes' },
];

const initialDishes: Dish[] = [
  {
    Id: 'DISH01',
    Name: 'Chicken Fried Rice',
    Price: 45000,
    PreparationTime: 15,
    IsAvailable: true,
    Description: 'Fried rice with chicken',
    DishCategoryId: 'CAT01',
    DishImage: [],
  },
  {
    Id: 'DISH02',
    Name: 'Beef Noodle Soup',
    Price: 55000,
    PreparationTime: 25,
    IsAvailable: true,
    Description: 'Traditional beef noodle soup',
    DishCategoryId: 'CAT01',
    DishImage: [],
  },
  {
    Id: 'DISH03',
    Name: 'French Fries',
    Price: 25000,
    PreparationTime: 10,
    IsAvailable: true,
    Description: 'Crispy potato fries',
    DishCategoryId: 'CAT02',
    DishImage: [],
  },
  {
    Id: 'DISH04',
    Name: 'Chocolate Cake',
    Price: 35000,
    PreparationTime: 30,
    IsAvailable: false,
    Description: 'Chocolate dessert',
    DishCategoryId: 'CAT03',
    DishImage: [],
  },
  {
    Id: 'DISH05',
    Name: 'Fruit Salad',
    Price: 30000,
    PreparationTime: 12,
    IsAvailable: true,
    Description: 'Fresh seasonal fruits',
    DishCategoryId: 'CAT03',
    DishImage: [],
  },
];

export async function getCategories(): Promise<DishCategory[]> {
  const raw = await AsyncStorage.getItem(CATEGORY_KEY);

  if (raw !== null) {
    try {
      return JSON.parse(raw) as DishCategory[];
    } catch {
      // Khởi tạo lại dữ liệu nếu JSON không hợp lệ.
    }
  }

  await AsyncStorage.setItem(
    CATEGORY_KEY,
    JSON.stringify(initialCategories),
  );

  return initialCategories;
}

export async function getDishes(): Promise<Dish[]> {
  const raw = await AsyncStorage.getItem(DISH_KEY);

  if (raw !== null) {
    try {
      return JSON.parse(raw) as Dish[];
    } catch {
      // Khởi tạo lại dữ liệu nếu JSON không hợp lệ.
    }
  }

  await AsyncStorage.setItem(DISH_KEY, JSON.stringify(initialDishes));
  return initialDishes;
}

export async function saveDishes(dishes: Dish[]): Promise<void> {
  await AsyncStorage.setItem(DISH_KEY, JSON.stringify(dishes));
}

export async function saveCategories(
  categories: DishCategory[],
): Promise<void> {
  await AsyncStorage.setItem(
    CATEGORY_KEY,
    JSON.stringify(categories),
  );
}

export async function getLanguage(): Promise<'en' | 'vi'> {
  const language = await AsyncStorage.getItem(LANGUAGE_KEY);
  return language === 'vi' ? 'vi' : 'en';
}

export async function saveLanguage(
  language: 'en' | 'vi',
): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}
