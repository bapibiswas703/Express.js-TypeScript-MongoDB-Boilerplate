import { BaseRepository } from '../../common/repositories/base.repository';
import type { IMedia } from './media.model';
import Media from './media.model';

class MediaRepository extends BaseRepository<IMedia> {
  constructor() {
    super(Media);
  }

  async findByKey(key: string): Promise<IMedia | null> {
    return this.model.findOne({ key }).exec();
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
    folder?: string,
    sort?: Record<string, 1 | -1>,
  ): Promise<{ docs: IMedia[]; total: number; page: number; limit: number; pages: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { uploadedBy: userId };
    if (folder) filter.folder = folder;
    return this.paginate(filter, page, limit, sort);
  }
}

export default new MediaRepository();
