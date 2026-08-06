import ejs from 'ejs';
import path from 'path';

const VIEWS_DIR = path.join(__dirname, '../../views/emails');

export const renderTemplate = async (
  templateName: string,
  data: Record<string, unknown>,
): Promise<string> => {
  const filePath = path.join(VIEWS_DIR, `${templateName}.ejs`);
  return ejs.renderFile(filePath, data);
};
