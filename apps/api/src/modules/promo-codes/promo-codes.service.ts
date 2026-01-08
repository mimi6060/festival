import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  ValidatePromoCodeDto,
  ApplyPromoCodeDto,
} from './dto';
import { DiscountType, Prisma } from '@prisma/client';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import {
  PromoCodeNotStackableException,
  PromoCodeAlreadyAppliedException,
} from '../../common/exceptions/business.exception';

export interface PromoCodeValidationResult {
  valid: boolean;
  promoCode?: {
    id: string;
    code: string;
    discountType: DiscountType;
    discountValue: number;
    stackable: boolean;
  };
  discountAmount?: number;
  finalAmount?: number;
  error?: string;
  errorCode?: string;
}

@Injectable()
export class PromoCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPromoCodeDto: CreatePromoCodeDto) {
    // Vérifier que le code n'existe pas déjà
    const existing = await this.prisma.promoCode.findUnique({
      where: { code: createPromoCodeDto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Le code promo "${createPromoCodeDto.code}" existe déjà`);
    }

    // Validation de la valeur de réduction
    if (
      createPromoCodeDto.discountType === DiscountType.PERCENTAGE &&
      createPromoCodeDto.discountValue > 100
    ) {
      throw new BadRequestException('La réduction en pourcentage ne peut pas dépasser 100%');
    }

    // Vérifier que le festival existe si spécifié
    if (createPromoCodeDto.festivalId) {
      const festival = await this.prisma.festival.findUnique({
        where: { id: createPromoCodeDto.festivalId },
      });

      if (!festival) {
        throw new NotFoundException(
          `Festival avec l'ID ${createPromoCodeDto.festivalId} non trouvé`
        );
      }
    }

    return this.prisma.promoCode.create({
      data: {
        ...createPromoCodeDto,
        code: createPromoCodeDto.code.toUpperCase(),
        expiresAt: createPromoCodeDto.expiresAt ? new Date(createPromoCodeDto.expiresAt) : null,
      },
      include: {
        festival: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findAll(params?: {
    festivalId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.PromoCodeWhereInput = {};

    if (params?.festivalId !== undefined) {
      where.festivalId = params.festivalId || null;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.promoCode.findMany({
        where,
        include: {
          festival: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.promoCode.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const promoCode = await this.prisma.promoCode.findUnique({
      where: { id },
      include: {
        festival: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!promoCode) {
      throw new NotFoundException(`Code promo avec l'ID ${id} non trouvé`);
    }

    return promoCode;
  }

  async findByCode(code: string) {
    const promoCode = await this.prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        festival: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!promoCode) {
      throw new NotFoundException(`Code promo "${code}" non trouvé`);
    }

    return promoCode;
  }

  async update(id: string, updatePromoCodeDto: UpdatePromoCodeDto) {
    await this.findOne(id); // Vérifier que le code existe

    // Si le code est modifié, vérifier l'unicité
    if (updatePromoCodeDto.code) {
      const existing = await this.prisma.promoCode.findFirst({
        where: {
          code: updatePromoCodeDto.code.toUpperCase(),
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`Le code promo "${updatePromoCodeDto.code}" existe déjà`);
      }
    }

    // Validation de la réduction en pourcentage
    if (
      updatePromoCodeDto.discountType === DiscountType.PERCENTAGE &&
      updatePromoCodeDto.discountValue &&
      updatePromoCodeDto.discountValue > 100
    ) {
      throw new BadRequestException('La réduction en pourcentage ne peut pas dépasser 100%');
    }

    return this.prisma.promoCode.update({
      where: { id },
      data: {
        ...updatePromoCodeDto,
        code: updatePromoCodeDto.code ? updatePromoCodeDto.code.toUpperCase() : undefined,
        expiresAt: updatePromoCodeDto.expiresAt
          ? new Date(updatePromoCodeDto.expiresAt)
          : undefined,
      },
      include: {
        festival: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Vérifier que le code existe

    return this.prisma.promoCode.delete({
      where: { id },
    });
  }

  /**
   * Valide un code promo sans l'appliquer
   */
  async validate(validateDto: ValidatePromoCodeDto): Promise<PromoCodeValidationResult> {
    const promoCode = await this.prisma.promoCode.findUnique({
      where: { code: validateDto.code.toUpperCase() },
    });

    if (!promoCode) {
      return {
        valid: false,
        error: `Code promo "${validateDto.code}" invalide`,
      };
    }

    if (!promoCode.isActive) {
      return {
        valid: false,
        error: "Ce code promo n'est plus actif",
      };
    }

    if (promoCode.expiresAt && new Date() > promoCode.expiresAt) {
      return {
        valid: false,
        error: 'Ce code promo a expiré',
      };
    }

    if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
      return {
        valid: false,
        error: "Ce code promo a atteint son nombre maximum d'utilisations",
      };
    }

    if (
      promoCode.festivalId &&
      validateDto.festivalId &&
      promoCode.festivalId !== validateDto.festivalId
    ) {
      return {
        valid: false,
        error: "Ce code promo n'est pas valable pour ce festival",
      };
    }

    if (promoCode.minAmount !== null && validateDto.amount < Number(promoCode.minAmount)) {
      return {
        valid: false,
        error: `Montant minimum de ${promoCode.minAmount}€ requis`,
      };
    }

    // Calculer la réduction
    let discountAmount = 0;
    if (promoCode.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (validateDto.amount * Number(promoCode.discountValue)) / 100;
    } else {
      discountAmount = Number(promoCode.discountValue);
    }

    // S'assurer que la réduction ne dépasse pas le montant total
    discountAmount = Math.min(discountAmount, validateDto.amount);

    const finalAmount = Math.max(0, validateDto.amount - discountAmount);

    return {
      valid: true,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: Number(promoCode.discountValue),
        stackable: promoCode.stackable,
      },
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100,
    };
  }

  /**
   * Applique un code promo et incrémente le compteur d'utilisation
   * Utilise une transaction pour éviter les race conditions
   *
   * Stacking rules:
   * - By default, promo codes cannot be stacked (stackable = false)
   * - If appliedPromoCodeIds contains any codes, we check stacking permissions
   * - Both the new code AND all previously applied codes must be stackable for stacking to be allowed
   */
  async apply(applyDto: ApplyPromoCodeDto): Promise<PromoCodeValidationResult> {
    // D'abord valider le code
    const validation = await this.validate(applyDto);

    if (!validation.valid || !validation.promoCode) {
      return validation;
    }

    // Vérifier les règles de cumul si des codes sont déjà appliqués
    if (applyDto.appliedPromoCodeIds && applyDto.appliedPromoCodeIds.length > 0) {
      const stackingValidation = await this.validateStacking(
        validation.promoCode.id,
        validation.promoCode.stackable,
        applyDto.appliedPromoCodeIds
      );

      if (!stackingValidation.valid) {
        return {
          valid: false,
          error: stackingValidation.error,
          errorCode: stackingValidation.errorCode,
        };
      }
    }

    // Appliquer le code dans une transaction pour éviter les race conditions
    try {
      await this.prisma.$transaction(async (tx) => {
        // Re-vérifier le code avec un lock FOR UPDATE
        const promoCode = await tx.promoCode.findUnique({
          where: { code: applyDto.code.toUpperCase() },
        });

        if (!promoCode) {
          throw new NotFoundException('Code promo non trouvé');
        }

        // Vérifier à nouveau le nombre d'utilisations avec les données verrouillées
        if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
          throw new BadRequestException(
            "Ce code promo a atteint son nombre maximum d'utilisations"
          );
        }

        // Incrémenter le compteur
        await tx.promoCode.update({
          where: { id: promoCode.id },
          data: {
            currentUses: {
              increment: 1,
            },
          },
        });
      });

      return validation;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        return {
          valid: false,
          error: error.message,
        };
      }
      throw error;
    }
  }

  /**
   * Valide les règles de cumul des codes promo
   *
   * @param newCodeId - ID du nouveau code à appliquer
   * @param newCodeStackable - Si le nouveau code est cumulable
   * @param appliedPromoCodeIds - Liste des IDs des codes déjà appliqués
   * @returns Résultat de validation avec message d'erreur et code d'erreur si non valide
   */
  async validateStacking(
    newCodeId: string,
    newCodeStackable: boolean,
    appliedPromoCodeIds: string[]
  ): Promise<{ valid: boolean; error?: string; errorCode?: string }> {
    // Vérifier si le nouveau code a déjà été appliqué
    if (appliedPromoCodeIds.includes(newCodeId)) {
      return {
        valid: false,
        error: 'Ce code promo a déjà été appliqué à cet achat',
        errorCode: ErrorCodes.PROMO_CODE_ALREADY_APPLIED,
      };
    }

    // Si le nouveau code n'est pas cumulable, interdire l'application
    if (!newCodeStackable) {
      return {
        valid: false,
        error:
          "Ce code promo ne peut pas être cumulé avec d'autres codes. Veuillez retirer les codes existants avant d'appliquer celui-ci.",
        errorCode: ErrorCodes.PROMO_CODE_NOT_STACKABLE,
      };
    }

    // Récupérer les codes déjà appliqués pour vérifier s'ils sont cumulables
    const appliedCodes = await this.prisma.promoCode.findMany({
      where: {
        id: { in: appliedPromoCodeIds },
      },
      select: {
        id: true,
        code: true,
        stackable: true,
      },
    });

    // Vérifier que tous les codes appliqués sont cumulables
    const nonStackableCodes = appliedCodes.filter((code) => !code.stackable);

    if (nonStackableCodes.length > 0) {
      const nonStackableCodeNames = nonStackableCodes.map((c) => c.code).join(', ');
      return {
        valid: false,
        error: `Le(s) code(s) promo suivant(s) ne peuvent pas être cumulés avec d'autres codes: ${nonStackableCodeNames}. Veuillez les retirer avant d'ajouter un nouveau code.`,
        errorCode: ErrorCodes.PROMO_CODE_NOT_STACKABLE,
      };
    }

    return { valid: true };
  }

  /**
   * Valide les règles de cumul des codes promo et lance une exception si non valide
   *
   * @param newCodeId - ID du nouveau code à appliquer
   * @param newCode - Code promo à appliquer
   * @param newCodeStackable - Si le nouveau code est cumulable
   * @param appliedPromoCodeIds - Liste des IDs des codes déjà appliqués
   * @throws PromoCodeAlreadyAppliedException - Si le code a déjà été appliqué
   * @throws PromoCodeNotStackableException - Si le code ne peut pas être cumulé
   */
  async validateStackingOrThrow(
    newCodeId: string,
    newCode: string,
    newCodeStackable: boolean,
    appliedPromoCodeIds: string[]
  ): Promise<void> {
    // Vérifier si le nouveau code a déjà été appliqué
    if (appliedPromoCodeIds.includes(newCodeId)) {
      throw new PromoCodeAlreadyAppliedException(newCode, newCodeId);
    }

    // Si le nouveau code n'est pas cumulable, interdire l'application
    if (!newCodeStackable) {
      throw new PromoCodeNotStackableException(newCode, appliedPromoCodeIds.length);
    }

    // Récupérer les codes déjà appliqués pour vérifier s'ils sont cumulables
    const appliedCodes = await this.prisma.promoCode.findMany({
      where: {
        id: { in: appliedPromoCodeIds },
      },
      select: {
        id: true,
        code: true,
        stackable: true,
      },
    });

    // Vérifier que tous les codes appliqués sont cumulables
    const nonStackableCodes = appliedCodes.filter((code) => !code.stackable);

    if (nonStackableCodes.length > 0) {
      const nonStackableCodeNames = nonStackableCodes.map((c) => c.code).join(', ');
      throw new PromoCodeNotStackableException(nonStackableCodeNames, appliedPromoCodeIds.length);
    }
  }

  /**
   * Obtenir les statistiques d'utilisation d'un code promo
   */
  async getStats(id: string) {
    const promoCode = await this.findOne(id);

    const usageRate =
      promoCode.maxUses !== null ? (promoCode.currentUses / promoCode.maxUses) * 100 : 0;

    const isExpired = promoCode.expiresAt ? new Date() > promoCode.expiresAt : false;

    const isExhausted = promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses;

    return {
      id: promoCode.id,
      code: promoCode.code,
      currentUses: promoCode.currentUses,
      maxUses: promoCode.maxUses,
      usageRate: Math.round(usageRate * 100) / 100,
      isActive: promoCode.isActive,
      isExpired,
      isExhausted,
      remainingUses:
        promoCode.maxUses !== null ? Math.max(0, promoCode.maxUses - promoCode.currentUses) : null,
    };
  }
}
