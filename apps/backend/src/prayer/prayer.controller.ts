import { Controller, Get, ParseFloatPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrayerService } from './prayer.service';
import { GetPrayerTimesDto, CalculationMethodOption, MadhabOption, HighLatitudeRuleOption } from './dto/get-prayer-times.dto';
import { AladhanService } from '../aladhan/aladhan.service';

@ApiTags('prayer')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('prayer-times')
export class PrayerController {
  constructor(
    private readonly prayerService: PrayerService,
    private readonly aladhanService: AladhanService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Calculated prayer times for the requested coordinates and date.' })
  @ApiQuery({ name: 'latitude', type: Number, required: true })
  @ApiQuery({ name: 'longitude', type: Number, required: true })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2025-03-15' })
  @ApiQuery({ name: 'method', required: false, enum: CalculationMethodOption })
  @ApiQuery({ name: 'madhab', required: false, enum: MadhabOption })
  @ApiQuery({ name: 'highLatitudeRule', required: false, enum: HighLatitudeRuleOption })
  async getPrayerTimes(@Query() query: GetPrayerTimesDto) {
    return this.prayerService.getPrayerTimes(query);
  }

  @Get('qibla')
  @ApiOkResponse({ description: 'Qibla direction for the requested coordinates.' })
  @ApiQuery({ name: 'latitude', type: Number, required: true })
  @ApiQuery({ name: 'longitude', type: Number, required: true })
  async getQibla(
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('longitude', ParseFloatPipe) longitude: number,
  ) {
    return this.aladhanService.getQiblaDirection(latitude, longitude);
  }
}
