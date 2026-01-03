import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PromoCodesService } from './promo-codes.service';
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  ValidatePromoCodeDto,
  ApplyPromoCodeDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Promo Codes')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouveau code promo (Admin/Organizer)' })
  @ApiResponse({
    status: 201,
    description: 'Code promo créé avec succès',
  })
  @ApiResponse({
    status: 409,
    description: 'Le code promo existe déjà',
  })
  create(@Body() createPromoCodeDto: CreatePromoCodeDto) {
    return this.promoCodesService.create(createPromoCodeDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister tous les codes promo (Admin/Organizer)' })
  @ApiQuery({ name: 'festivalId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Liste des codes promo',
  })
  findAll(
    @Query('festivalId') festivalId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.promoCodesService.findAll({
      festivalId,
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtenir un code promo par ID (Admin/Organizer)',
  })
  @ApiResponse({
    status: 200,
    description: 'Code promo trouvé',
  })
  @ApiResponse({
    status: 404,
    description: 'Code promo non trouvé',
  })
  findOne(@Param('id') id: string) {
    return this.promoCodesService.findOne(id);
  }

  @Get('code/:code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtenir un code promo par code (Admin/Organizer)',
  })
  @ApiResponse({
    status: 200,
    description: 'Code promo trouvé',
  })
  @ApiResponse({
    status: 404,
    description: 'Code promo non trouvé',
  })
  findByCode(@Param('code') code: string) {
    return this.promoCodesService.findByCode(code);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Valider un code promo sans l\'appliquer (Public)',
    description:
      'Vérifie si un code promo est valide et calcule la réduction sans incrémenter le compteur d\'utilisation',
  })
  @ApiResponse({
    status: 200,
    description: 'Résultat de la validation',
  })
  validate(@Body() validateDto: ValidatePromoCodeDto) {
    return this.promoCodesService.validate(validateDto);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Appliquer un code promo (Public)',
    description:
      'Valide et applique un code promo, incrémente le compteur d\'utilisation',
  })
  @ApiResponse({
    status: 200,
    description: 'Code promo appliqué avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Code promo invalide ou conditions non remplies',
  })
  apply(@Body() applyDto: ApplyPromoCodeDto) {
    return this.promoCodesService.apply(applyDto);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtenir les statistiques d\'utilisation (Admin/Organizer)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques du code promo',
  })
  getStats(@Param('id') id: string) {
    return this.promoCodesService.getStats(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un code promo (Admin/Organizer)' })
  @ApiResponse({
    status: 200,
    description: 'Code promo mis à jour',
  })
  @ApiResponse({
    status: 404,
    description: 'Code promo non trouvé',
  })
  update(
    @Param('id') id: string,
    @Body() updatePromoCodeDto: UpdatePromoCodeDto
  ) {
    return this.promoCodesService.update(id, updatePromoCodeDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un code promo (Admin/Organizer)' })
  @ApiResponse({
    status: 200,
    description: 'Code promo supprimé',
  })
  @ApiResponse({
    status: 404,
    description: 'Code promo non trouvé',
  })
  remove(@Param('id') id: string) {
    return this.promoCodesService.remove(id);
  }
}
