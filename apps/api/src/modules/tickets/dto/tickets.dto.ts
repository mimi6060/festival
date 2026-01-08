import { IsString, IsNumber, IsEmail, IsOptional, Min, IsNotEmpty } from 'class-validator';

export class PurchaseTicketsDto {
  @IsString()
  @IsNotEmpty()
  festivalId: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class GuestPurchaseDto {
  @IsString()
  @IsNotEmpty()
  festivalId: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class ValidateTicketDto {
  @IsString()
  @IsNotEmpty()
  qrCode: string;

  @IsString()
  @IsOptional()
  zoneId?: string;
}

export class TransferTicketDto {
  @IsEmail()
  @IsNotEmpty()
  recipientEmail: string;
}
