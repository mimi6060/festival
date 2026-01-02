import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTicketCategoryDto } from './create-ticket-category.dto';

/**
 * DTO for updating a ticket category
 * All fields are optional except festivalId (which cannot be changed)
 */
export class UpdateTicketCategoryDto extends PartialType(
  OmitType(CreateTicketCategoryDto, [] as const),
) {}
