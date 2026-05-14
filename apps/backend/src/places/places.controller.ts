import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PlacesService } from './places.service';

@ApiTags('places')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('mosques')
  @ApiOkResponse({ description: 'Mosquées proches via Google Places API.' })
  @ApiQuery({ name: 'lat', type: Number, required: true })
  @ApiQuery({ name: 'lng', type: Number, required: true })
  @ApiQuery({ name: 'radius', type: Number, required: false })
  async findNearbyMosques(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    const results = await this.placesService.findNearbyMosques(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseInt(radius) : 5000,
    );
    return { results };
  }

  @Get('halal')
  @ApiOkResponse({ description: 'Lieux halal proches via Google Places API.' })
  @ApiQuery({ name: 'lat', type: Number, required: true })
  @ApiQuery({ name: 'lng', type: Number, required: true })
  @ApiQuery({ name: 'radius', type: Number, required: false })
  @ApiQuery({ name: 'category', type: String, required: false, enum: ['restaurant', 'butcher', 'grocery', 'school'] })
  async findNearbyHalal(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('category') category?: string,
  ) {
    const results = await this.placesService.findNearbyHalal(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseInt(radius) : 3000,
      category,
    );
    return { results };
  }
}
