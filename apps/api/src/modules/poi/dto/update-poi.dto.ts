import { PartialType } from '@nestjs/swagger';
import { CreatePoiDto } from './create-poi.dto';

/**
 * DTO for updating a Point of Interest
 * All fields are optional
 */
export class UpdatePoiDto extends PartialType(CreatePoiDto) {}
