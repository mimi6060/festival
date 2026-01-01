import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Decorator for documenting paginated API responses in Swagger
 *
 * @example
 * ```typescript
 * @ApiPaginatedResponse(TicketDto)
 * @Get()
 * findAll(@Query() query: PaginationQueryDto) {
 *   return this.ticketsService.findAll(query);
 * }
 * ```
 */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: 'Paginated response',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              total: {
                type: 'number',
                example: 100,
              },
              page: {
                type: 'number',
                example: 1,
              },
              limit: {
                type: 'number',
                example: 10,
              },
              totalPages: {
                type: 'number',
                example: 10,
              },
            },
          },
          meta: {
            type: 'object',
            properties: {
              timestamp: {
                type: 'string',
                format: 'date-time',
              },
              path: {
                type: 'string',
              },
              method: {
                type: 'string',
              },
            },
          },
        },
      },
    }),
  );
};
