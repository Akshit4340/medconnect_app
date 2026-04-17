import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod/v3';
import { AppError } from '../errors/AppError';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new AppError(
            'Validation failed: ' +
              error.errors.map((e) => e.message).join(', '),
            400,
            'VALIDATION_ERROR',
          ),
        );
      }
      return next(error);
    }
  };
};
