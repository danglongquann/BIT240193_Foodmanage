
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';

import {
  getCategories,
  getDishes,
  getLanguage,
  saveDishes,
  saveLanguage,
} from '../services/storage';

import type { Dish } from '../model/dish';
import type { DishCategory } from '../model/dishcategory';

type FormState = {
  id?: string;
  name: string;
  categoryId: string;
  price: string;
  time: string;
  available: boolean;
  description: string;
  imageUrls: string[];
  thumbnailIndex: number;
};

const emptyForm: FormState = {
  name: '',
  categoryId: 'CAT01',
  price: '',
  time: '',
  available: true,
  description: '',
  imageUrls: [''],
  thumbnailIndex: 0,
};

export default function Index() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<'en' | 'vi'>('en');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NONE');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const isEn = language === 'en';

  // Translate built-in sample names for display only; stored data remains unchanged.
  function displayCategoryName(name: string) {
    if (isEn) return name;
    const translations: Record<string, string> = {
      'Main Course': 'Món chính',
      'Appetizer': 'Món khai vị',
      'Dessert': 'Món tráng miệng',
    };
    return translations[name] ?? name;
  }

  function displayDishName(name: string) {
    if (isEn) return name;
    const translations: Record<string, string> = {
      'Chicken Fried Rice': 'Cơm chiên gà',
      'Beef Noodle Soup': 'Phở bò',
      'French Fries': 'Khoai tây chiên',
      'Chocolate Cake': 'Bánh kem sô cô la',
      'Fruit Salad': 'Salad trái cây',
    };
    return translations[name] ?? name;
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [categoryData, dishData, savedLanguage] =
          await Promise.all([
            getCategories(),
            getDishes(),
            getLanguage(),
          ]);

        setCategories(categoryData);
        setDishes(dishData);
        setLanguage(savedLanguage);
      } catch (error) {
        console.error('Could not load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function changeLanguage() {
    const nextLanguage: 'en' | 'vi' = language === 'en' ? 'vi' : 'en';
    setLanguage(nextLanguage);

    try {
      await saveLanguage(nextLanguage);
    } catch (error) {
      console.error('Could not save language:', error);
    }
  }

  function updateForm<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openAddForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      imageUrls: [''],
      categoryId: categories[0]?.Id ?? '',
    });
    setFormVisible(true);
  }

  function openEditForm(dish: Dish) {
    setEditingId(dish.Id);
    setForm({
      id: dish.Id,
      name: dish.Name,
      categoryId: dish.DishCategoryId,
      price: String(dish.Price),
      time: String(dish.PreparationTime),
      available: dish.IsAvailable,
      description: dish.Description,
      imageUrls:
        dish.DishImage.length > 0
          ? dish.DishImage.map((image) => image.ImageUrl)
          : [''],
      thumbnailIndex: Math.max(
        0,
        dish.DishImage.findIndex((image) => image.IsThumbnail),
      ),
    });
    setFormVisible(true);
  }

  async function submitForm() {
    const name = form.name.trim();
    const price = Number(form.price);
    const time = Number(form.time);

    if (!name) {
      window.alert(isEn ? 'Enter a dish name.' : 'Hãy nhập tên món ăn.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      window.alert(isEn ? 'Price must be greater than 0.' : 'Giá phải lớn hơn 0.');
      return;
    }

    if (!Number.isFinite(time) || time <= 0) {
      window.alert(isEn ? 'Preparation time must be greater than 0.' : 'Thời gian chế biến phải lớn hơn 0.');
      return;
    }

    if (!categories.some((category) => category.Id === form.categoryId)) {
      window.alert(isEn ? 'Select a valid category.' : 'Hãy chọn danh mục hợp lệ.');
      return;
    }

    const duplicate = dishes.some(
      (dish) =>
        dish.Id !== editingId &&
        dish.DishCategoryId === form.categoryId &&
        dish.Name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      window.alert(
        isEn
          ? 'This dish already exists in the selected category.'
          : 'Món ăn này đã tồn tại trong danh mục đã chọn.',
      );
      return;
    }

    const dishId =
      editingId ??
      `DISH${Date.now()}`;

    const newDish: Dish = {
      Id: dishId,
      Name: name,
      Price: price,
      PreparationTime: time,
      IsAvailable: form.available,
      Description: form.description.trim(),
      DishCategoryId: form.categoryId,
      DishImage: (() => {
        const images = form.imageUrls
          .map((url, index) => ({
            ImageUrl: url.trim(),
            originalIndex: index,
          }))
          .filter((image) => image.ImageUrl !== '');

        const thumbnailIndex = images.some(
          (image) => image.originalIndex === form.thumbnailIndex,
        )
          ? form.thumbnailIndex
          : images[0]?.originalIndex;

        return images.map((image) => ({
          ImageUrl: image.ImageUrl,
          IsThumbnail: image.originalIndex === thumbnailIndex,
        }));
      })(),
    };

    const nextDishes = editingId
      ? dishes.map((dish) => (dish.Id === editingId ? newDish : dish))
      : [...dishes, newDish];

    try {
      await saveDishes(nextDishes);
      setDishes(nextDishes);
      setFormVisible(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (error) {
      console.error('Could not save dish:', error);
      window.alert(
        isEn ? 'Could not save the dish.' : 'Không thể lưu món ăn.',
      );
    }
  }

  async function deleteDish(id: string) {
    const confirmed = window.confirm(
      isEn ? 'Delete this dish?' : 'Bạn có muốn xóa món này?',
    );

    if (!confirmed) return;

    const nextDishes = dishes.filter((dish) => dish.Id !== id);

    try {
      await saveDishes(nextDishes);
      setDishes(nextDishes);
    } catch (error) {
      console.error('Could not delete dish:', error);
      window.alert(isEn ? 'Could not delete the dish.' : 'Không thể xóa món ăn.');
    }
  }

  const filteredDishes = useMemo(() => {
    let result = dishes.filter((dish) => {
      const matchesName = dish.Name
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesCategory =
        categoryFilter === 'ALL' ||
        dish.DishCategoryId === categoryFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'AVAILABLE' && dish.IsAvailable) ||
        (statusFilter === 'UNAVAILABLE' && !dish.IsAvailable);

      const matchesMinPrice =
       minPrice.trim() === '' || dish.Price >= Number(minPrice);

      const matchesMaxPrice =
        maxPrice.trim() === '' || dish.Price <= Number(maxPrice);
        return (
       matchesName &&
       matchesCategory &&
       matchesStatus &&
       matchesMinPrice &&
       matchesMaxPrice
     );
      
    });

    if (sortBy === 'PRICE_ASC') {
      result = [...result].sort((a, b) => a.Price - b.Price);
    } else if (sortBy === 'PRICE_DESC') {
      result = [...result].sort((a, b) => b.Price - a.Price);
    } else if (sortBy === 'TIME_ASC') {
      result = [...result].sort(
        (a, b) => a.PreparationTime - b.PreparationTime,
      );
    }

    return result;
     }, [
     dishes,
    search,
     categoryFilter,
     statusFilter,
     minPrice,
     maxPrice,
     sortBy,
     ]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>{isEn ? 'Loading data...' : 'Đang tải dữ liệu...'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>FOOD MANAGER</Text>
          <Text style={styles.title}>
            {isEn ? 'Dish Management' : 'Quản lý món ăn'}
          </Text>
          <Text style={styles.subtitle}>
            {isEn ? 'Manage your menu easily' : 'Quản lý thực đơn dễ dàng'}
          </Text>
        </View>

        <Pressable style={styles.languageButton} onPress={changeLanguage}>
          <Text style={styles.languageText}>{isEn ? 'VI' : 'EN'}</Text>
        </Pressable>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>
          {isEn ? 'TOTAL DISHES' : 'TỔNG SỐ MÓN'}
        </Text>
        <Text style={styles.summaryNumber}>{dishes.length}</Text>
      </View>

      <Pressable style={styles.addButton} onPress={openAddForm}>
        <Text style={styles.addButtonText}>
          {isEn ? '+ Add dish' : '+ Thêm món ăn'}
        </Text>
      </Pressable>

      {formVisible && (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            {editingId
              ? isEn ? 'Edit dish' : 'Sửa món ăn'
              : isEn ? 'Add new dish' : 'Thêm món ăn mới'}
          </Text>

          <Text style={styles.label}>{isEn ? 'Dish name' : 'Tên món ăn'}</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(value) => updateForm('name', value)}
            placeholder={isEn ? 'Enter dish name' : 'Nhập tên món ăn'}
          />

          <Text style={styles.label}>{isEn ? 'Category' : 'Danh mục'}</Text>
          <View style={styles.chipRow}>
            {categories.map((category) => (
              <Pressable
                key={category.Id}
                style={[
                  styles.chip,
                  form.categoryId === category.Id && styles.chipSelected,
                ]}
                onPress={() => updateForm('categoryId', category.Id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.categoryId === category.Id && styles.chipTextSelected,
                  ]}
                >
                  {displayCategoryName(category.Name)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{isEn ? 'Price (VND)' : 'Giá (VND)'}</Text>
          <TextInput
            style={styles.input}
            value={form.price}
            onChangeText={(value) => updateForm('price', value)}
            keyboardType="numeric"
            placeholder="45000"
          />

          <Text style={styles.label}>
            {isEn ? 'Preparation time (minutes)' : 'Thời gian chế biến (phút)'}
          </Text>
          <TextInput
            style={styles.input}
            value={form.time}
            onChangeText={(value) => updateForm('time', value)}
            keyboardType="numeric"
            placeholder="15"
          />

          <Text style={styles.label}>{isEn ? 'Description' : 'Mô tả'}</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={form.description}
            onChangeText={(value) => updateForm('description', value)}
            multiline
            placeholder={isEn ? 'Describe the dish' : 'Mô tả món ăn'}
          />

          <Text style={styles.label}>
            {isEn ? 'Dish images (optional)' : 'Ảnh món ăn (không bắt buộc)'}
          </Text>
          <Text style={styles.helperText}>
            {isEn
              ? 'Add image URLs and choose one thumbnail.'
              : 'Thêm đường dẫn ảnh và chọn một ảnh đại diện.'}
          </Text>

          {form.imageUrls.map((url, index) => (
            <View key={index} style={styles.imageInputRow}>
              <TextInput
                style={styles.input}
                value={url}
                onChangeText={(value) =>
                  updateForm(
                    'imageUrls',
                    form.imageUrls.map((oldUrl, i) =>
                      i === index ? value : oldUrl,
                    ),
                  )
                }
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={`https://example.com/image${index + 1}.jpg`}
              />

              <View style={styles.imageActions}>
                <Pressable
                  style={[
                    styles.thumbnailButton,
                    form.thumbnailIndex === index &&
                      styles.thumbnailButtonSelected,
                  ]}
                  onPress={() => updateForm('thumbnailIndex', index)}
                >
                  <Text
                    style={[
                      styles.thumbnailButtonText,
                      form.thumbnailIndex === index &&
                        styles.thumbnailButtonTextSelected,
                    ]}
                  >
                    {form.thumbnailIndex === index
                      ? isEn ? '✓ Thumbnail' : '✓ Ảnh đại diện'
                      : isEn ? 'Set thumbnail' : 'Chọn ảnh đại diện'}
                  </Text>
                </Pressable>

                {form.imageUrls.length > 1 && (
                  <Pressable
                    style={styles.removeImageButton}
                    onPress={() => {
                      const nextUrls = form.imageUrls.filter(
                        (_, i) => i !== index,
                      );
                      const nextThumbnailIndex =
                        form.thumbnailIndex === index
                          ? 0
                          : form.thumbnailIndex > index
                            ? form.thumbnailIndex - 1
                            : form.thumbnailIndex;

                      updateForm('imageUrls', nextUrls);
                      updateForm('thumbnailIndex', nextThumbnailIndex);
                    }}
                  >
                    <Text style={styles.removeImageText}>
                      {isEn ? 'Remove' : 'Xóa ảnh'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}

          <Pressable
            style={styles.addImageButton}
            onPress={() =>
              updateForm('imageUrls', [...form.imageUrls, ''])
            }
          >
            <Text style={styles.addImageButtonText}>
              {isEn ? '+ Add another image' : '+ Thêm ảnh khác'}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.availabilityButton,
              form.available && styles.availabilityButtonActive,
            ]}
            onPress={() => updateForm('available', !form.available)}
          >
            <Text style={styles.availabilityText}>
              {form.available
                ? isEn ? '✓ Available for sale' : '✓ Đang bán'
                : isEn ? 'Unavailable for sale' : 'Ngừng bán'}
            </Text>
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable style={styles.saveButton} onPress={submitForm}>
              <Text style={styles.saveButtonText}>
                {isEn ? 'Save' : 'Lưu'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setFormVisible(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              <Text style={styles.cancelButtonText}>
                {isEn ? 'Cancel' : 'Hủy'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        {isEn ? 'Menu list' : 'Danh sách món ăn'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder={isEn ? 'Search dishes...' : 'Tìm tên món ăn...'}
        value={search}
        onChangeText={setSearch}
      />

      <Text style={styles.label}>{isEn ? 'Filter by category' : 'Lọc theo danh mục'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, categoryFilter === 'ALL' && styles.chipSelected]}
            onPress={() => setCategoryFilter('ALL')}
          >
            <Text style={[styles.chipText, categoryFilter === 'ALL' && styles.chipTextSelected]}>
              {isEn ? 'All' : 'Tất cả'}
            </Text>
          </Pressable>

          {categories.map((category) => (
            <Pressable
              key={category.Id}
              style={[
                styles.chip,
                categoryFilter === category.Id && styles.chipSelected,
              ]}
              onPress={() => setCategoryFilter(category.Id)}
            >
              <Text
                style={[
                  styles.chipText,
                  categoryFilter === category.Id && styles.chipTextSelected,
                ]}
              >
                {displayCategoryName(category.Name)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.label}>{isEn ? 'Filter by status' : 'Lọc theo trạng thái'}</Text>
      <View style={styles.chipRow}>
        {[
          { id: 'ALL', label: isEn ? 'All' : 'Tất cả' },
          { id: 'AVAILABLE', label: isEn ? 'Available' : 'Đang bán' },
          { id: 'UNAVAILABLE', label: isEn ? 'Unavailable' : 'Ngừng bán' },
        ].map((item) => (
          <Pressable
            key={item.id}
            style={[styles.chip, statusFilter === item.id && styles.chipSelected]}
            onPress={() => setStatusFilter(item.id)}
          >
            <Text style={[styles.chipText, statusFilter === item.id && styles.chipTextSelected]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>
      {isEn ? 'Minimum price (VND)' : 'Giá thấp nhất (VND)'}
    </Text>

    <TextInput
      style={styles.input}
      value={minPrice}
      onChangeText={setMinPrice}
      keyboardType="numeric"
      placeholder="0"
    />

    <Text style={styles.label}>
      {isEn ? 'Maximum price (VND)' : 'Giá cao nhất (VND)'}
    </Text>

  <TextInput
    style={styles.input}
    value={maxPrice}
    onChangeText={setMaxPrice}
    keyboardType="numeric"
     placeholder={isEn ? 'No limit' : 'Không giới hạn'}
      />

      <Text style={styles.label}>{isEn ? 'Sort by' : 'Sắp xếp theo'}</Text>
      <View style={styles.chipRow}>
        {[
          { id: 'NONE', label: isEn ? 'Default' : 'Mặc định' },
          { id: 'PRICE_ASC', label: isEn ? 'Price ↑' : 'Giá ↑' },
          { id: 'PRICE_DESC', label: isEn ? 'Price ↓' : 'Giá ↓' },
          { id: 'TIME_ASC', label: isEn ? 'Prep time ↑' : 'Thời gian ↑' },
        ].map((item) => (
          <Pressable
            key={item.id}
            style={[styles.chip, sortBy === item.id && styles.chipSelected]}
            onPress={() => setSortBy(item.id)}
          >
            <Text style={[styles.chipText, sortBy === item.id && styles.chipTextSelected]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.resultCount}>
        {isEn ? `${filteredDishes.length} result(s)` : `${filteredDishes.length} kết quả`}
      </Text>

      {filteredDishes.map((dish) => {
        const categoryName =
          categories.find((category) => category.Id === dish.DishCategoryId)?.Name ??
          isEn ? 'Unknown' : 'Không xác định';

        return (
          <View style={styles.card} key={dish.Id}>
            <View style={styles.cardTop}>
              {(() => {
                const thumbnailUrl =
                  dish.DishImage.find((image) => image.IsThumbnail)?.ImageUrl ??
                  dish.DishImage[0]?.ImageUrl;

                return thumbnailUrl ? (
                  <Image
                    source={{ uri: thumbnailUrl }}
                    style={styles.dishIcon}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.dishIcon}>
                    <Text style={styles.dishEmoji}>🍽️</Text>
                  </View>
                );
              })()}

              <View style={styles.dishInfo}>
                <Text style={styles.dishName}>{displayDishName(dish.Name)}</Text>
                <Text style={styles.category}>{categoryName}</Text>
                <Text style={styles.meta}>
                  ⏱ {dish.PreparationTime} {isEn ? 'min' : 'phút'}
                  {' · '}
                  {dish.PreparationTime <= 15 ? (isEn ? 'Quick' : 'Nhanh') : (isEn ? 'Regular' : 'Thông thường')}
                </Text>
              </View>

              <Text style={styles.price}>
                {dish.Price.toLocaleString('vi-VN')}đ
              </Text>
            </View>

            <View style={styles.cardBottom}>
              <View
                style={[
                  styles.status,
                  dish.IsAvailable ? styles.available : styles.unavailable,
                ]}
              >
                <Text style={styles.statusText}>
                  {dish.IsAvailable
                    ? isEn ? 'Available' : 'Đang bán'
                    : isEn ? 'Unavailable' : 'Ngừng bán'}
                </Text>
              </View>

              <Pressable onPress={() => openEditForm(dish)}>
                <Text style={styles.editText}>{isEn ? 'Edit' : 'Sửa'}</Text>
              </Pressable>

              <Pressable onPress={() => deleteDish(dish.Id)}>
                <Text style={styles.deleteText}>{isEn ? 'Delete' : 'Xóa'}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {filteredDishes.length === 0 && (
        <Text style={styles.empty}>
          {isEn ? 'No dishes found.' : 'Không tìm thấy món ăn.'}
        </Text>
      )}

      <Text style={styles.footer}>{isEn ? 'Food Manager · React Native' : 'Quản lý món ăn · React Native'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F7FB' },
  container: {
    padding: 24,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  headerText: { flex: 1 },
  eyebrow: {
    color: '#4776E6',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#182230', marginTop: 8 },
  subtitle: { color: '#778196', marginTop: 6, fontSize: 14 },
  languageButton: {
    backgroundColor: '#E4EBFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  languageText: { color: '#315BC5', fontWeight: '800' },
  summary: {
    backgroundColor: '#4269E1',
    borderRadius: 18,
    padding: 24,
    marginBottom: 20,
  },
  summaryLabel: { color: '#E2E9FF', fontSize: 12, fontWeight: '700' },
  summaryNumber: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginTop: 8,
  },
  addButton: {
    backgroundColor: '#4269E1',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '800' },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#182230',
    marginTop: 12,
    marginBottom: 14,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E7F0',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#566176',
    marginTop: 12,
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E7F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    fontSize: 15,
    color: '#182230',
  },
  descriptionInput: { minHeight: 80, textAlignVertical: 'top' },
  helperText: { color: '#778196', fontSize: 12, marginBottom: 8 },
  imageInputRow: { marginBottom: 10 },
  imageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbnailButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  thumbnailButtonSelected: { backgroundColor: '#2563EB' },
  thumbnailButtonText: { color: '#374151', fontWeight: '600', fontSize: 12 },
  thumbnailButtonTextSelected: { color: '#FFFFFF' },
  removeImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  removeImageText: { color: '#B91C1C', fontWeight: '600', fontSize: 12 },
  addImageButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    marginBottom: 12,
  },
  addImageButtonText: { color: '#1D4ED8', fontWeight: '600' },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#F0F3F9',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E7F0',
  },
  chipSelected: { backgroundColor: '#4269E1', borderColor: '#4269E1' },
  chipText: { color: '#566176', fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: '#FFFFFF' },
  availabilityButton: {
    backgroundColor: '#FDE8E7',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  availabilityButtonActive: { backgroundColor: '#E2F8EC' },
  availabilityText: { color: '#374151', fontWeight: '700', textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  saveButton: {
    flex: 1,
    backgroundColor: '#4269E1',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800' },
  cancelButton: {
    flex: 1,
    backgroundColor: '#EEF1F6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#374151', fontWeight: '800' },
  search: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E7F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    fontSize: 15,
  },
  resultCount: { color: '#778196', marginTop: 14, marginBottom: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8ECF3',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dishIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF2DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishEmoji: { fontSize: 24 },
  dishInfo: { flex: 1 },
  dishName: { fontSize: 16, fontWeight: '700', color: '#182230' },
  category: { color: '#8791A3', marginTop: 5, fontSize: 13 },
  price: { color: '#315BC5', fontWeight: '800', fontSize: 15 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F6',
  },
  meta: { color: '#687386', fontSize: 13, marginTop: 5 },
  status: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  available: { backgroundColor: '#E2F8EC' },
  unavailable: { backgroundColor: '#FDE8E7' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  editText: { color: '#315BC5', fontWeight: '700' },
  deleteText: { color: '#D14343', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#8791A3', padding: 30 },
  footer: {
    textAlign: 'center',
    color: '#9AA3B2',
    marginTop: 20,
    marginBottom: 30,
  },
});
