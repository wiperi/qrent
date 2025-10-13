import { Router, Request, Response } from 'express';
import { generateRentalLetter } from '@/controllers/rentalLetterController';
import { catchError } from '@/utils/helper';

const router: Router = Router();

router.post('/', catchError(generateRentalLetter));

export default router;
