export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  category: string;
  stock?: number;
  image?: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  stock?: number;
  image?: string;
  isActive?: boolean;
}

export interface ProductFilterQuery {
  category?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}
