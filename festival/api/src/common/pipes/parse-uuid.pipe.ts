import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

export interface ParseUUIDPipeOptions {
  version?: '3' | '4' | '5';
  errorMessage?: string;
}

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string> {
  private readonly version?: number;
  private readonly errorMessage: string;

  constructor(options: ParseUUIDPipeOptions = {}) {
    this.version = options.version ? parseInt(options.version, 10) : undefined;
    this.errorMessage = options.errorMessage || 'Invalid UUID format';
  }

  transform(value: string, metadata: ArgumentMetadata): string {
    if (!uuidValidate(value)) {
      throw new BadRequestException(
        `${this.errorMessage}: ${metadata.data || 'value'}`,
      );
    }

    if (this.version && uuidVersion(value) !== this.version) {
      throw new BadRequestException(
        `${metadata.data || 'value'} must be a valid UUID v${this.version}`,
      );
    }

    return value;
  }
}
