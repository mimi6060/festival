import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { QueueName, QueueStats } from './queue.types';

/**
 * Queue Controller
 *
 * Provides admin endpoints for managing and monitoring queues.
 * These endpoints should be protected and only accessible to admins.
 */
@Controller('api/admin/queues')
@ApiTags('Admin - Queues')
@ApiBearerAuth('JWT-auth')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all queues statistics',
    description: 'Returns statistics for all queues including waiting, active, completed, and failed job counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
  })
  async getAllStats(): Promise<QueueStats[]> {
    return this.queueService.getAllQueuesStats();
  }

  @Get(':queueName')
  @ApiOperation({
    summary: 'Get specific queue statistics',
    description: 'Returns detailed statistics for a specific queue.',
  })
  @ApiParam({
    name: 'queueName',
    enum: QueueName,
    description: 'Name of the queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Queue not found',
  })
  async getQueueStats(@Param('queueName') queueName: QueueName): Promise<QueueStats> {
    return this.queueService.getQueueStats(queueName);
  }

  @Post(':queueName/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pause a queue',
    description: 'Pauses job processing for the specified queue. Jobs can still be added but will not be processed.',
  })
  @ApiParam({
    name: 'queueName',
    enum: QueueName,
    description: 'Name of the queue to pause',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue paused successfully',
  })
  async pauseQueue(@Param('queueName') queueName: QueueName): Promise<{ message: string }> {
    await this.queueService.pauseQueue(queueName);
    return { message: `Queue ${queueName} paused successfully` };
  }

  @Post(':queueName/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resume a queue',
    description: 'Resumes job processing for a paused queue.',
  })
  @ApiParam({
    name: 'queueName',
    enum: QueueName,
    description: 'Name of the queue to resume',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue resumed successfully',
  })
  async resumeQueue(@Param('queueName') queueName: QueueName): Promise<{ message: string }> {
    await this.queueService.resumeQueue(queueName);
    return { message: `Queue ${queueName} resumed successfully` };
  }

  @Post(':queueName/retry-failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry failed jobs',
    description: 'Retries all failed jobs in the specified queue.',
  })
  @ApiParam({
    name: 'queueName',
    enum: QueueName,
    description: 'Name of the queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Failed jobs retried successfully',
  })
  async retryFailedJobs(
    @Param('queueName') queueName: QueueName,
  ): Promise<{ message: string; retriedCount: number }> {
    const count = await this.queueService.retryFailedJobs(queueName);
    return { message: `Retried ${count} failed jobs`, retriedCount: count };
  }

  @Get(':queueName/failed')
  @ApiOperation({
    summary: 'Get failed jobs',
    description: 'Returns a list of failed jobs in the specified queue.',
  })
  @ApiParam({
    name: 'queueName',
    enum: QueueName,
    description: 'Name of the queue',
  })
  @ApiQuery({
    name: 'start',
    required: false,
    type: Number,
    description: 'Start index for pagination',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    type: Number,
    description: 'End index for pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Failed jobs retrieved successfully',
  })
  async getFailedJobs(
    @Param('queueName') queueName: QueueName,
    @Query('start') start = 0,
    @Query('end') end = 50,
  ): Promise<{ id: string; data: unknown; failedReason: string | undefined; timestamp: number | undefined }[]> {
    const jobs = await this.queueService.getFailedJobs(queueName, start, end);
    return jobs.map((job) => ({
      id: job.id || '',
      data: job.data,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
    }));
  }

  @Get(':queueName/job/:jobId')
  @ApiOperation({
    summary: 'Get a specific job',
    description: 'Returns details of a specific job.',
  })
  @ApiParam({
    name: 'queueName',
    enum: QueueName,
    description: 'Name of the queue',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Job ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Job retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  async getJob(
    @Param('queueName') queueName: QueueName,
    @Param('jobId') jobId: string,
  ): Promise<{
    id: string;
    data: unknown;
    status: string;
    progress: number | object;
    failedReason?: string;
    timestamp?: number;
    processedOn?: number;
    finishedOn?: number;
  } | null> {
    const job = await this.queueService.getJob(queueName, jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      id: job.id || '',
      data: job.data,
      status: state,
      progress: job.progress,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  @Delete(':queueName/job/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a job',
    description: 'Removes a specific job from the queue.',
  })
  @ApiParam({
    name: 'queueName',
    enum: QueueName,
    description: 'Name of the queue',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Job ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Job removed successfully',
  })
  async removeJob(
    @Param('queueName') queueName: QueueName,
    @Param('jobId') jobId: string,
  ): Promise<void> {
    await this.queueService.removeJob(queueName, jobId);
  }

  @Delete(':queueName/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear all jobs from a queue',
    description: 'Removes all jobs from the specified queue. Use with caution!',
  })
  @ApiParam({
    name: 'queueName',
    enum: QueueName,
    description: 'Name of the queue to clear',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue cleared successfully',
  })
  async clearQueue(@Param('queueName') queueName: QueueName): Promise<{ message: string }> {
    await this.queueService.clearQueue(queueName);
    return { message: `Queue ${queueName} cleared successfully` };
  }
}
