import { createReader } from '@keystatic/core/reader';
import config from '../../../keystatic.config';

export const reader = createReader(process.cwd(), config);
