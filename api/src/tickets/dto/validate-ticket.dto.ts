import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ValidateTicketDto {
  @IsString()
  @IsNotEmpty()
  qrCodeData: string;

  @IsString()
  @IsOptional()
  zoneId?: string; // Optional: validate for specific zone access
}

export class ValidateTicketResponseDto {
  valid: boolean;
  message: string;
  ticket?: {
    id: string;
    categoryName: string;
    categoryType: string;
    userName: string;
    userEmail: string;
    festivalName: string;
    status: string;
  };
}
