import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQuery) {
    return this.usersService.list(query);
  }

  @Get(':userId')
  getById(@Param('userId') userId: string) {
    return this.usersService.getById(userId);
  }

  @Patch(':userId/status')
  updateStatus(@Param('userId') userId: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(userId, dto);
  }
}
