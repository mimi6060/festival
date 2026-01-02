import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateStaffMemberDto } from './create-staff-member.dto';

export class UpdateStaffMemberDto extends PartialType(
  OmitType(CreateStaffMemberDto, ['userId', 'festivalId'] as const),
) {}
