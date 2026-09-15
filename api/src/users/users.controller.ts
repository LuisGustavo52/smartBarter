import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Rota de Cadastro: POST /users/register
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    // O Body já chega validado graças ao CreateUserDto + ValidationPipe global
    return await this.usersService.registerUser(createUserDto);
  }

  // Rota de verificação de login: GET /users/wallet/:address
  @Get('wallet/:address')
  async checkWallet(@Param('address') address: string) {
    return await this.usersService.checkWalletExists(address);
  }

  // Rota auxiliar para debug: GET /users
  @Get()
  async getAll() {
    return await this.usersService.findAll();
  }

  // Rota para checar se username está disponível
  @Get('username/:username/available')
  async checkUsername(@Param('username') username: string) {
    return await this.usersService.checkUsernameAvailable(username);
  }

  // Rota para atualizar usuário (ex: username, nome da empresa)
  @Patch('wallet/:address')
  async updateWallet(
    @Param('address') address: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.updateUser(address, updateUserDto);
  }
}
