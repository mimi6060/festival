import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export interface ValidationPipeOptions {
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  transform?: boolean;
  transformOptions?: {
    enableImplicitConversion?: boolean;
  };
  skipMissingProperties?: boolean;
  skipNullProperties?: boolean;
  skipUndefinedProperties?: boolean;
}

@Injectable()
export class CustomValidationPipe implements PipeTransform<unknown> {
  private readonly logger = new Logger(CustomValidationPipe.name);
  private readonly options: ValidationPipeOptions;

  constructor(options: ValidationPipeOptions = {}) {
    this.options = {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      ...options,
    };
  }

  async transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value, this.options.transformOptions);
    const errors = await validate(object as object, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
      skipMissingProperties: this.options.skipMissingProperties,
      skipNullProperties: this.options.skipNullProperties,
      skipUndefinedProperties: this.options.skipUndefinedProperties,
    });

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      this.logger.warn(`Validation failed: ${JSON.stringify(formattedErrors)}`);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    return this.options.transform ? object : value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(
    errors: ValidationError[],
    parentPath = '',
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (const error of errors) {
      const propertyPath = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;

      if (error.constraints) {
        result[propertyPath] = Object.values(error.constraints);
      }

      if (error.children && error.children.length > 0) {
        const childErrors = this.formatErrors(error.children, propertyPath);
        Object.assign(result, childErrors);
      }
    }

    return result;
  }
}
