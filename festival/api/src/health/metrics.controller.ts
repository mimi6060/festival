import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiProduces } from '@nestjs/swagger';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController extends PrometheusController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiProduces('text/plain')
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics in text format',
  })
  async index(@Res({ passthrough: true }) response: Response): Promise<string> {
    return super.index(response);
  }
}
