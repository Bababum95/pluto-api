/**
 * Domain types for Rate entity
 * These types represent the core business logic and are independent of infrastructure concerns
 */

// Extract type from DTO to ensure consistency
import type { CreateRateDto } from './rate.dto';

export type RateType = InstanceType<typeof CreateRateDto>;
