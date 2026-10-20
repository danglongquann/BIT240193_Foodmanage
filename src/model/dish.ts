
export type DishImage = {
  ImageUrl: string;
  IsThumbnail: boolean;
};

export type Dish = {
  Id: string;
  Name: string;
  Price: number;
  PreparationTime: number;
  IsAvailable: boolean;
  Description: string;
  DishCategoryId: string;
  DishImage: DishImage[];
};
