const mockProductRepo = {
  create: jest.fn(),
  paginate: jest.fn(),
  buildFilter: jest.fn(),
  findWithCategory: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
};
const mockCategoryRepo = {
  findById: jest.fn(),
};

jest.mock('../../../src/modules/product/product.repository', () => ({
  __esModule: true,
  default: mockProductRepo,
}));
jest.mock('../../../src/modules/category/category.repository', () => ({
  __esModule: true,
  default: mockCategoryRepo,
}));

import * as productService from '../../../src/modules/product/product.service';

describe('ProductService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('createProduct', () => {
    const dto = { name: 'iPhone', price: 999, category: 'cat-id' };

    it('should create product when category exists', async () => {
      mockCategoryRepo.findById.mockResolvedValue({ _id: 'cat-id' });
      mockProductRepo.create.mockResolvedValue({ _id: '1', ...dto });

      const result = await productService.createProduct(dto);
      expect(result.name).toBe('iPhone');
    });

    it('should throw 400 when category not found', async () => {
      mockCategoryRepo.findById.mockResolvedValue(null);

      await expect(productService.createProduct(dto)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Category not found',
      });
    });
  });

  describe('getAllProducts', () => {
    it('should return filtered and paginated products', async () => {
      mockProductRepo.buildFilter.mockReturnValue({ category: 'cat-id' });
      mockProductRepo.paginate.mockResolvedValue({
        docs: [{ _id: '1', name: 'iPhone' }],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      });

      const result = await productService.getAllProducts(1, 10, { category: 'cat-id' });
      expect(result.docs).toHaveLength(1);
      expect(mockProductRepo.buildFilter).toHaveBeenCalledWith({ category: 'cat-id' });
    });
  });

  describe('getProductById', () => {
    it('should return product with category populated', async () => {
      mockProductRepo.findWithCategory.mockResolvedValue({ _id: '1', name: 'iPhone' });
      const result = await productService.getProductById('1');
      expect(result.name).toBe('iPhone');
    });

    it('should throw 404 when not found', async () => {
      mockProductRepo.findWithCategory.mockResolvedValue(null);
      await expect(productService.getProductById('x')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateProductById', () => {
    it('should validate category if provided', async () => {
      mockCategoryRepo.findById.mockResolvedValue(null);

      await expect(
        productService.updateProductById('1', { category: 'bad-id' }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should update without category validation if not provided', async () => {
      mockProductRepo.updateById.mockResolvedValue({ _id: '1', name: 'Updated' });

      const result = await productService.updateProductById('1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
      expect(mockCategoryRepo.findById).not.toHaveBeenCalled();
    });

    it('should throw 404 when product not found', async () => {
      mockProductRepo.updateById.mockResolvedValue(null);
      await expect(productService.updateProductById('1', { name: 'x' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('deleteProductById', () => {
    it('should delete successfully', async () => {
      mockProductRepo.deleteById.mockResolvedValue({ _id: '1' });
      await expect(productService.deleteProductById('1')).resolves.toBeUndefined();
    });

    it('should throw 404 when not found', async () => {
      mockProductRepo.deleteById.mockResolvedValue(null);
      await expect(productService.deleteProductById('x')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
