const mockCategoryRepo = {
  findByName: jest.fn(),
  create: jest.fn(),
  paginate: jest.fn(),
  findById: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
};

jest.mock('../../../src/modules/category/category.repository', () => ({
  __esModule: true,
  default: mockCategoryRepo,
}));

import * as categoryService from '../../../src/modules/category/category.service';

describe('CategoryService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('createCategory', () => {
    it('should create a new category', async () => {
      mockCategoryRepo.findByName.mockResolvedValue(null);
      mockCategoryRepo.create.mockResolvedValue({ _id: '1', name: 'Electronics' });

      const result = await categoryService.createCategory({ name: 'Electronics' });
      expect(result.name).toBe('Electronics');
    });

    it('should throw 409 if category already exists', async () => {
      mockCategoryRepo.findByName.mockResolvedValue({ name: 'Electronics' });

      await expect(categoryService.createCategory({ name: 'Electronics' })).rejects.toMatchObject({
        statusCode: 409,
        message: 'Category already exists',
      });
    });
  });

  describe('getAllCategories', () => {
    it('should return paginated categories', async () => {
      mockCategoryRepo.paginate.mockResolvedValue({
        docs: [{ _id: '1', name: 'Electronics' }],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      });

      const result = await categoryService.getAllCategories(1, 10);
      expect(result.docs).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getCategoryById', () => {
    it('should return category when found', async () => {
      mockCategoryRepo.findById.mockResolvedValue({ _id: '1', name: 'Electronics' });
      const result = await categoryService.getCategoryById('1');
      expect(result.name).toBe('Electronics');
    });

    it('should throw 404 when not found', async () => {
      mockCategoryRepo.findById.mockResolvedValue(null);
      await expect(categoryService.getCategoryById('x')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateCategoryById', () => {
    it('should return updated category', async () => {
      mockCategoryRepo.updateById.mockResolvedValue({ _id: '1', name: 'Updated' });
      const result = await categoryService.updateCategoryById('1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw 404 when not found', async () => {
      mockCategoryRepo.updateById.mockResolvedValue(null);
      await expect(categoryService.updateCategoryById('1', { name: 'x' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('deleteCategoryById', () => {
    it('should delete successfully', async () => {
      mockCategoryRepo.deleteById.mockResolvedValue({ _id: '1' });
      await expect(categoryService.deleteCategoryById('1')).resolves.toBeUndefined();
    });

    it('should throw 404 when not found', async () => {
      mockCategoryRepo.deleteById.mockResolvedValue(null);
      await expect(categoryService.deleteCategoryById('x')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
