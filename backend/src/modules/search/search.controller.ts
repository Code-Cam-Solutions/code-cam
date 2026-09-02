import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthUser } from '@common/types/authenticated-request';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@CurrentUser() user: AuthUser, @Query() query: SearchQueryDto) {
    return this.searchService.search(user.userId, query);
  }
}
